import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { defaultStorageService } from './storage.service';
import { validateResumeFile } from '../utils/fileValidator';
import { ApiError } from '../utils/apiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { Prisma, Resume } from '@prisma/client';
import {
  ParseOptions,
  ResumeParserService,
  getEffectiveResumeData
} from '../ai/resume/resumeParser.service';
import { StructuredResume } from '../ai/schemas/resume.schema';
import { canonicalSkillKey, normalizeSkill } from '../ai/skills';
import { estimateTotalMonths } from '../ai/resume/textUtils';

type ResumeRow = Resume;

/** Public representation: never includes the full extracted text or parsed payloads unless asked. */
export function toResumeDto(resume: ResumeRow, opts: { includeParsed?: boolean } = {}) {
  const { extractedText, parsedData, userEditedData, ...rest } = resume;
  return {
    ...rest,
    extractedTextLength: extractedText ? extractedText.length : 0,
    hasParsedData: parsedData !== null && parsedData !== undefined,
    hasUserEdits: userEditedData !== null && userEditedData !== undefined,
    ...(opts.includeParsed ? { parsedData, userEditedData } : {})
  };
}

const LIST_SELECT = {
  id: true, userId: true, originalFilename: true, storedFilename: true, mimeType: true,
  fileSize: true, storagePath: true, parseStatus: true, parseError: true, parsedAt: true,
  parserVersion: true, contentHash: true, createdAt: true, updatedAt: true
} satisfies Prisma.ResumeSelect;

export class ResumeService {
  static async uploadResume(
    userId: string,
    file: Express.Multer.File | undefined
  ) {
    validateResumeFile(file);
    const validFile = file!;

    const ext = path.extname(validFile.originalname).toLowerCase();
    const storedFilename = `${uuidv4()}${ext}`;

    // Store file in modular storage (resumes subfolder)
    const storagePath = await defaultStorageService.saveFile(
      validFile.buffer,
      storedFilename,
      'resumes'
    );

    // Save metadata in database
    const resume = await prisma.resume.create({
      data: {
        userId,
        originalFilename: validFile.originalname,
        storedFilename,
        mimeType: validFile.mimetype,
        fileSize: validFile.size,
        storagePath
      }
    });

    // Extract text synchronously; failures are recorded on the record, never delete the upload.
    const updated = await ResumeParserService.extractOnUpload(resume, validFile.buffer);
    return toResumeDto(updated);
  }

  static async listUserResumes(
    userId: string,
    queryParams: { page?: unknown; limit?: unknown }
  ) {
    const { page, limit, skip } = parsePagination(queryParams);

    const [total, resumes] = await Promise.all([
      prisma.resume.count({ where: { userId } }),
      prisma.resume.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: LIST_SELECT
      })
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return { resumes, meta };
  }

  static async getResumeById(userId: string, resumeId: string) {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId }
    });

    if (!resume) {
      throw ApiError.notFound('Resume not found');
    }

    if (resume.userId !== userId) {
      throw ApiError.forbidden('You do not have permission to access this resume');
    }

    return resume;
  }

  static async parseResume(userId: string, resumeId: string, opts: ParseOptions) {
    const resume = await ResumeParserService.parseResume(userId, resumeId, opts);
    return toResumeDto(resume, { includeParsed: true });
  }

  static async getParsed(userId: string, resumeId: string) {
    const resume = await this.getResumeById(userId, resumeId);
    return {
      parseStatus: resume.parseStatus,
      parseError: resume.parseError,
      parsedData: resume.parsedData,
      userEditedData: resume.userEditedData,
      effective: getEffectiveResumeData(resume),
      parsedAt: resume.parsedAt,
      parserVersion: resume.parserVersion
    };
  }

  /** Store user corrections. Skills not produced by the parser are marked source 'user'. */
  static async updateParsed(userId: string, resumeId: string, body: StructuredResume) {
    const resume = await this.getResumeById(userId, resumeId);
    const parsed = resume.parsedData as unknown as StructuredResume | null;
    if (!parsed) {
      throw ApiError.conflict('Resume must be parsed before its data can be edited');
    }
    if (resume.parseStatus === 'PROCESSING') {
      throw ApiError.conflict('Resume is being parsed; try again when it finishes');
    }
    const parsedKeys = new Set((parsed.skills ?? []).map((s) => canonicalSkillKey(s.canonical || s.name)));
    const seen = new Set<string>();
    const skills = [];
    for (const sk of body.skills) {
      const canonical = normalizeSkill(sk.name);
      const key = canonicalSkillKey(sk.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      skills.push({
        ...sk,
        canonical,
        source: parsedKeys.has(key) ? sk.source : ('user' as const),
        confidence: parsedKeys.has(key) ? sk.confidence : ('explicit' as const)
      });
    }
    const experience = body.experience.map((e, i) => ({
      ...e,
      id: e.id || `exp-${i + 1}`,
      bullets: e.bullets.map((b, j) => ({ ...b, id: b.id || `exp-${i + 1}-b${j + 1}` }))
    }));
    const clean: StructuredResume = {
      ...body,
      skills,
      experience,
      projects: body.projects.map((p, i) => ({ ...p, id: p.id || `proj-${i + 1}` })),
      education: body.education.map((e, i) => ({ ...e, id: e.id || `edu-${i + 1}` })),
      // server-owned fields
      sectionsDetected: parsed.sectionsDetected ?? [],
      parseWarnings: parsed.parseWarnings ?? [],
      totalExperienceMonthsEstimate: estimateTotalMonths(experience)
    };
    const updated = await prisma.resume.update({
      where: { id: resumeId },
      data: { userEditedData: clean as unknown as Prisma.InputJsonValue }
    });
    return toResumeDto(updated, { includeParsed: true });
  }

  static async getResumeFileForDownload(userId: string, resumeId: string) {
    const resume = await this.getResumeById(userId, resumeId);
    const absolutePath = defaultStorageService.getAbsolutePath(resume.storagePath);

    const exists = await defaultStorageService.fileExists(resume.storagePath);
    if (!exists) {
      throw ApiError.notFound('Resume file not found on storage server');
    }

    return {
      absolutePath,
      originalFilename: resume.originalFilename,
      mimeType: resume.mimeType
    };
  }

  static async deleteResume(userId: string, resumeId: string) {
    const resume = await this.getResumeById(userId, resumeId);

    // Delete file from disk
    await defaultStorageService.deleteFile(resume.storagePath);

    // Delete record from database
    await prisma.resume.delete({
      where: { id: resumeId }
    });

    return { message: 'Resume deleted successfully' };
  }
}
