import crypto from 'crypto';
import { EnhancementStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { withKeyedLock } from '../utils/keyedLock';
import { defaultStorageService } from './storage.service';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { getLlmService, hashInput, safeErrorMessage, toApiError, AiError, aiLog } from '../ai/llm';
import { ensureResumeParsed, getEffectiveResumeData } from '../ai/resume';
import { getEffectiveJdData } from '../ai/jd';
import { MatchResultSchema } from '../ai/schemas/match.schema';
import {
  ENHANCEMENT_PROMPT_VERSION,
  GROUNDING_VALIDATOR_VERSION,
  ChangeMap,
  GroundingReport
} from '../ai/schemas/enhancement.schema';
import {
  EnhancementGenerator,
  buildDocx,
  emphasisFromMatch,
  groundEnhancement,
  normalizeResume,
  validatePlainText
} from '../ai/enhancement';

export interface CreateEnhancementDTO {
  resumeId: string;
  jobDescriptionId: string;
  enhancedContent?: string | null;
  status?: EnhancementStatus;
}

export interface GenerateEnhancementDTO {
  resumeId: string;
  jobDescriptionId: string;
  analysisId?: string;
  force?: boolean;
}

export interface UpdateEnhancementDTO {
  enhancedContent?: string;
  status?: EnhancementStatus;
}

/** A PROCESSING AI row younger than this blocks a duplicate generation for the same pair. */
const GENERATION_STALE_MS = 3 * 60 * 1000;

const relationInclude = {
  resume: { select: { id: true, originalFilename: true } },
  jobDescription: { select: { id: true, title: true, companyName: true } }
} as const;

const json = (v: unknown): Prisma.InputJsonValue => v as unknown as Prisma.InputJsonValue;

export class EnhancementService {
  // ---------- helpers ----------

  private static async loadOwnedPair(userId: string, resumeId: string, jobDescriptionId: string) {
    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) throw ApiError.notFound('Resume not found');
    if (resume.userId !== userId) throw ApiError.forbidden('You do not own the specified resume');
    const jobDescription = await prisma.jobDescription.findUnique({ where: { id: jobDescriptionId } });
    if (!jobDescription) throw ApiError.notFound('Job description not found');
    if (jobDescription.userId !== userId) throw ApiError.forbidden('You do not own the specified job description');
    return { resume, jobDescription };
  }

  private static lockKey(resumeId: string, jobDescriptionId: string): string {
    return `enh:${resumeId}:${jobDescriptionId}`;
  }

  private static async nextVersion(userId: string, resumeId: string, jobDescriptionId: string): Promise<number> {
    const latest = await prisma.resumeEnhancement.findFirst({
      where: { userId, resumeId, jobDescriptionId },
      orderBy: { version: 'desc' },
      select: { version: true }
    });
    return (latest?.version || 0) + 1;
  }

  private static async saveTextFile(id: string, content: string): Promise<string> {
    return defaultStorageService.saveFile(Buffer.from(content, 'utf-8'), `enhanced-${id}.txt`, 'enhancements');
  }

  private static advisory(
    resume: { parsedData: unknown; userEditedData: unknown; extractedText: string | null },
    content: string
  ): GroundingReport {
    return validatePlainText(content, getEffectiveResumeData(resume), resume.extractedText);
  }

  // ---------- manual save (existing contract) ----------

  static async create(userId: string, data: CreateEnhancementDTO) {
    const { resume } = await this.loadOwnedPair(userId, data.resumeId, data.jobDescriptionId);
    const id = crypto.randomUUID();
    const content = data.enhancedContent || null;
    const documentStoragePath = content ? await this.saveTextFile(id, content) : null;
    const status = data.status || EnhancementStatus.DRAFT;

    return withKeyedLock(this.lockKey(data.resumeId, data.jobDescriptionId), async () => {
      const version = await this.nextVersion(userId, data.resumeId, data.jobDescriptionId);
      return prisma.resumeEnhancement.create({
        data: {
          id,
          userId,
          resumeId: data.resumeId,
          jobDescriptionId: data.jobDescriptionId,
          version,
          enhancedContent: data.enhancedContent,
          documentStoragePath,
          status,
          source: 'USER',
          generationStatus: 'COMPLETED',
          approvedAt: status === 'COMPLETED' ? new Date() : null,
          groundingReport: content ? json(this.advisory(resume, content)) : undefined
        },
        include: relationInclude
      });
    });
  }

  // ---------- AI generation ----------

  static async generate(userId: string, dto: GenerateEnhancementDTO) {
    const { jobDescription } = await this.loadOwnedPair(userId, dto.resumeId, dto.jobDescriptionId);

    let analysis = null;
    if (dto.analysisId) {
      analysis = await prisma.jobAnalysis.findUnique({ where: { id: dto.analysisId } });
      if (!analysis) throw ApiError.notFound('Analysis not found');
      if (analysis.userId !== userId) throw ApiError.forbidden('You do not own the specified analysis');
      if (analysis.resumeId !== dto.resumeId || analysis.jobDescriptionId !== dto.jobDescriptionId) {
        throw ApiError.badRequest('The analysis does not belong to this resume and job description');
      }
    } else {
      analysis = await prisma.jobAnalysis.findFirst({
        where: { userId, resumeId: dto.resumeId, jobDescriptionId: dto.jobDescriptionId, status: 'COMPLETED', resultData: { not: Prisma.DbNull } },
        orderBy: { createdAt: 'desc' }
      });
    }
    const parsedMatch = analysis?.resultData ? MatchResultSchema.safeParse(analysis.resultData) : null;
    const match = parsedMatch?.success ? parsedMatch.data : null;

    const { resume, data: resumeData } = await ensureResumeParsed(userId, dto.resumeId);
    const jdData = getEffectiveJdData(jobDescription);
    const emphasis = emphasisFromMatch(match);
    const inputHash = hashInput(ENHANCEMENT_PROMPT_VERSION, GROUNDING_VALIDATOR_VERSION, resumeData, jdData, emphasis);

    if (!dto.force) {
      const cached = await prisma.resumeEnhancement.findFirst({
        where: {
          userId,
          resumeId: dto.resumeId,
          jobDescriptionId: dto.jobDescriptionId,
          source: 'AI',
          generationStatus: 'COMPLETED',
          changeMap: { path: ['inputHash'], equals: inputHash }
        },
        orderBy: { version: 'desc' },
        include: relationInclude
      });
      if (cached) return { enhancement: cached, reused: true };
    }

    // Atomic claim: serialise the in-flight check, version allocation and PROCESSING insert per (resume, JD).
    const id = crypto.randomUUID();
    await withKeyedLock(this.lockKey(dto.resumeId, dto.jobDescriptionId), async () => {
      const inFlight = await prisma.resumeEnhancement.findFirst({
        where: {
          userId,
          resumeId: dto.resumeId,
          jobDescriptionId: dto.jobDescriptionId,
          source: 'AI',
          generationStatus: 'PROCESSING',
          updatedAt: { gt: new Date(Date.now() - GENERATION_STALE_MS) }
        },
        select: { id: true }
      });
      if (inFlight) throw ApiError.conflict('An enhancement is already being generated for this resume and job description.');

      const version = await this.nextVersion(userId, dto.resumeId, dto.jobDescriptionId);
      await prisma.resumeEnhancement.create({
        data: {
          id,
          userId,
          resumeId: dto.resumeId,
          jobDescriptionId: dto.jobDescriptionId,
          version,
          status: 'DRAFT',
          source: 'AI',
          generationStatus: 'PROCESSING'
        }
      });
    });

    const fail = async (message: string) => {
      await prisma.resumeEnhancement.update({ where: { id }, data: { generationStatus: 'FAILED', errorMessage: message } });
    };

    try {
      const result = await new EnhancementGenerator(getLlmService()).generate({
        resume: resumeData,
        extractedText: resume.extractedText,
        jd: jdData,
        match,
        inputHash
      });
      if (result.acceptedCount === 0 || !result.text.trim()) {
        const msg = 'No enhancement passed the grounding checks; nothing was saved as an enhancement.';
        await prisma.resumeEnhancement.update({
          where: { id },
          data: { generationStatus: 'FAILED', errorMessage: msg, groundingReport: json(result.report), modelInfo: result.modelInfo }
        });
        throw ApiError.unprocessableEntity(msg);
      }
      const documentStoragePath = await this.saveTextFile(id, result.text);
      const saved = await prisma.resumeEnhancement.update({
        where: { id },
        data: {
          generationStatus: 'COMPLETED',
          errorMessage: null,
          enhancedContent: result.text,
          documentStoragePath,
          structuredContent: json(result.structured),
          changeMap: json(result.changeMap),
          groundingReport: json(result.report),
          modelInfo: result.modelInfo
        },
        include: relationInclude
      });
      return { enhancement: saved, reused: false };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof AiError) {
        await fail(safeErrorMessage(err));
        throw toApiError(err);
      }
      aiLog.error({ event: 'enhancement.unexpected', task: 'resume_enhance' });
      await fail('Enhancement failed unexpectedly');
      throw ApiError.internal('Enhancement failed unexpectedly');
    }
  }

  // ---------- edit / approve ----------

  static async update(userId: string, id: string, dto: UpdateEnhancementDTO) {
    const target = await this.getById(userId, id);
    const contentChanged =
      dto.enhancedContent !== undefined && dto.enhancedContent.trim() !== (target.enhancedContent ?? '').trim();

    if (!contentChanged) {
      if (dto.status === 'COMPLETED') return this.approve(userId, id);
      if (dto.status && dto.status !== target.status) {
        return prisma.resumeEnhancement.update({ where: { id }, data: { status: dto.status }, include: relationInclude });
      }
      return target;
    }

    if (target.generationStatus !== 'COMPLETED') {
      throw ApiError.conflict('Only a completed enhancement can be edited');
    }
    const content = dto.enhancedContent as string;
    const resume = await prisma.resume.findUniqueOrThrow({ where: { id: target.resumeId } });
    const newId = crypto.randomUUID();
    const status = dto.status ?? 'DRAFT';
    const documentStoragePath = await this.saveTextFile(newId, content);
    return withKeyedLock(this.lockKey(target.resumeId, target.jobDescriptionId), async () => {
      const version = await this.nextVersion(userId, target.resumeId, target.jobDescriptionId);
      return prisma.resumeEnhancement.create({
        data: {
          id: newId,
          userId,
          resumeId: target.resumeId,
          jobDescriptionId: target.jobDescriptionId,
          version,
          enhancedContent: content,
          documentStoragePath,
          status,
          source: 'USER_EDIT',
          generationStatus: 'COMPLETED',
          parentVersionId: target.id,
          approvedAt: status === 'COMPLETED' ? new Date() : null,
          groundingReport: json(this.advisory(resume, content)),
          modelInfo: target.modelInfo
        },
        include: relationInclude
      });
    });
  }

  static async approve(userId: string, id: string) {
    const target = await this.getById(userId, id);
    if (target.generationStatus !== 'COMPLETED' || !target.enhancedContent?.trim()) {
      throw ApiError.conflict('Only a completed enhancement with content can be approved');
    }
    if (target.status === 'COMPLETED' && target.approvedAt) return target;
    return prisma.resumeEnhancement.update({
      where: { id },
      data: { status: 'COMPLETED', approvedAt: new Date() },
      include: relationInclude
    });
  }

  // ---------- reads ----------

  static async listUserEnhancements(userId: string, queryParams: { page?: unknown; limit?: unknown }) {
    const { page, limit, skip } = parsePagination(queryParams);
    const [total, enhancements] = await Promise.all([
      prisma.resumeEnhancement.count({ where: { userId } }),
      prisma.resumeEnhancement.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          resumeId: true,
          jobDescriptionId: true,
          version: true,
          status: true,
          generationStatus: true,
          source: true,
          parentVersionId: true,
          errorMessage: true,
          modelInfo: true,
          approvedAt: true,
          documentStoragePath: true,
          createdAt: true,
          updatedAt: true,
          ...relationInclude
        }
      })
    ]);
    return { enhancements, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(userId: string, id: string) {
    const enhancement = await prisma.resumeEnhancement.findUnique({
      where: { id },
      include: {
        resume: {
          select: { id: true, originalFilename: true, storedFilename: true, mimeType: true, fileSize: true, createdAt: true }
        },
        jobDescription: {
          select: { id: true, title: true, companyName: true, description: true, requiredSkills: true }
        }
      }
    });
    if (!enhancement) throw ApiError.notFound('Enhancement record not found');
    if (enhancement.userId !== userId) {
      throw ApiError.forbidden('You do not have permission to access this enhancement');
    }
    return enhancement;
  }

  static async getVersions(userId: string, id: string) {
    const target = await this.getById(userId, id);
    const versions = await prisma.resumeEnhancement.findMany({
      where: { userId, resumeId: target.resumeId, jobDescriptionId: target.jobDescriptionId },
      orderBy: { version: 'asc' },
      select: {
        id: true,
        version: true,
        status: true,
        generationStatus: true,
        source: true,
        parentVersionId: true,
        approvedAt: true,
        errorMessage: true,
        enhancedContent: true,
        documentStoragePath: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return { currentId: id, resumeId: target.resumeId, jobDescriptionId: target.jobDescriptionId, versions };
  }

  /** Side-by-side data for the UI: original vs enhanced plus per-bullet changes and grounding flags. */
  static async compare(userId: string, id: string) {
    const target = await this.getById(userId, id);
    const resume = await prisma.resume.findUniqueOrThrow({ where: { id: target.resumeId } });
    const data = getEffectiveResumeData(resume);
    const originalStructured = data ? normalizeResume(data).resume : null;
    const originalText = data ? groundEnhancement(data, {}).text : resume.extractedText ?? '';
    const cm = (target.changeMap ?? null) as ChangeMap | null;
    const report = (target.groundingReport ?? null) as GroundingReport | null;
    return {
      enhancementId: target.id,
      version: target.version,
      source: target.source,
      generationStatus: target.generationStatus,
      original: { structured: originalStructured, text: originalText },
      enhanced: { structured: target.structuredContent ?? null, text: target.enhancedContent ?? '' },
      changes: (cm?.items ?? []).filter((c) => c.changeType !== 'unchanged'),
      omitted: cm?.omitted ?? [],
      metricSuggestions: cm?.metricSuggestions ?? [],
      groundingReport: report
    };
  }

  static async getDownloadFile(userId: string, id: string, format: 'txt' | 'docx' = 'txt') {
    const enhancement = await this.getById(userId, id);
    const content = enhancement.enhancedContent;
    if (!content) throw ApiError.notFound('No generated enhancement document available for download');
    if (format === 'docx') {
      return {
        buffer: await buildDocx(content),
        filename: `enhanced-resume-v${enhancement.version}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };
    }
    return {
      buffer: Buffer.from(content, 'utf-8'),
      filename: `enhanced-resume-v${enhancement.version}.txt`,
      mimeType: 'text/plain; charset=utf-8'
    };
  }
}
