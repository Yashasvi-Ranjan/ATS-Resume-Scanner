import crypto from 'crypto';
import { promises as fsp } from 'fs';
import { Prisma, Resume } from '@prisma/client';
import prisma from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { defaultStorageService } from '../../services/storage.service';
import { AiError, LlmNotConfiguredError, aiLog, getLlmService, toApiError } from '../llm';
import { StructuredResume, StructuredResumeSchema } from '../schemas/resume.schema';
import { ResumeExtractionError, extractText } from './extractText';
import { RESUME_PARSER_VERSION, ResumeStructureError, parseResumeText } from './resumeParser';

/** A PROCESSING resume whose row has not been touched for this long is considered abandoned. */
export const PARSE_STALE_MS = 5 * 60 * 1000;
export const NOT_CONFIGURED_MESSAGE = 'LLM provider not configured';

export interface ParseOptions {
  force?: boolean;
  /** Discard the user's manual corrections (userEditedData) as part of this parse. */
  resetEdits?: boolean;
}

export const sha256 = (buf: Buffer): string => crypto.createHash('sha256').update(buf).digest('hex');

/** The data every downstream module should consume: user corrections win over parser output. */
export function getEffectiveResumeData(
  resume: { userEditedData?: unknown; parsedData?: unknown }
): StructuredResume | null {
  const candidate = resume.userEditedData ?? resume.parsedData;
  if (candidate === null || candidate === undefined) return null;
  const r = StructuredResumeSchema.safeParse(candidate);
  return r.success ? r.data : null;
}

async function loadOwned(userId: string, resumeId: string): Promise<Resume> {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw ApiError.notFound('Resume not found');
  if (resume.userId !== userId) {
    throw ApiError.forbidden('You do not have permission to access this resume');
  }
  return resume;
}

export class ResumeParserService {
  /**
   * Upload-time step: hash the file and extract text. Never throws for extraction problems;
   * those are recorded as parseStatus FAILED (the upload itself is kept).
   */
  static async extractOnUpload(resume: Resume, buffer: Buffer): Promise<Resume> {
    const contentHash = sha256(buffer);
    try {
      const { text } = await extractText(buffer, resume.mimeType, resume.originalFilename);
      return await prisma.resume.update({
        where: { id: resume.id },
        data: { contentHash, extractedText: text, parseStatus: 'NOT_PARSED', parseError: null }
      });
    } catch (err) {
      return prisma.resume.update({
        where: { id: resume.id },
        data: {
          contentHash,
          extractedText: null,
          parseStatus: 'FAILED',
          parseError:
            err instanceof ResumeExtractionError ? err.publicMessage : 'Text extraction failed unexpectedly'
        }
      });
    }
  }

  static async parseResume(userId: string, resumeId: string, opts: ParseOptions = {}): Promise<Resume> {
    const resume = await loadOwned(userId, resumeId);

    const fresh = Date.now() - resume.updatedAt.getTime() < PARSE_STALE_MS;
    if (resume.parseStatus === 'PROCESSING' && fresh) {
      throw ApiError.conflict('This resume is already being parsed. Please try again shortly.');
    }

    const exists = await defaultStorageService.fileExists(resume.storagePath);
    if (!exists) throw ApiError.notFound('Resume file not found on storage server');
    const buffer = await fsp.readFile(defaultStorageService.getAbsolutePath(resume.storagePath));
    const hash = sha256(buffer);

    // Cache: same file, same parser version, already parsed.
    if (
      !opts.force &&
      resume.parseStatus === 'PARSED' &&
      resume.parsedData &&
      resume.contentHash === hash &&
      resume.parserVersion === RESUME_PARSER_VERSION
    ) {
      if (opts.resetEdits && resume.userEditedData !== null) {
        return prisma.resume.update({ where: { id: resume.id }, data: { userEditedData: Prisma.DbNull } });
      }
      return resume;
    }

    // Atomic claim so two concurrent requests cannot both run the LLM.
    const cutoff = new Date(Date.now() - PARSE_STALE_MS);
    const claimed = await prisma.resume.updateMany({
      where: {
        id: resume.id,
        OR: [{ parseStatus: { not: 'PROCESSING' } }, { updatedAt: { lt: cutoff } }]
      },
      data: { parseStatus: 'PROCESSING', parseError: null }
    });
    if (claimed.count === 0) {
      throw ApiError.conflict('This resume is already being parsed. Please try again shortly.');
    }

    const fail = async (message: string, extra: Prisma.ResumeUpdateInput = {}): Promise<void> => {
      await prisma.resume.update({
        where: { id: resume.id },
        data: { parseStatus: 'FAILED', parseError: message, ...extra }
      });
    };

    try {
      // 1. text (reuse stored text when the file is unchanged)
      let text = resume.contentHash === hash ? resume.extractedText : null;
      if (!text) {
        try {
          text = (await extractText(buffer, resume.mimeType, resume.originalFilename)).text;
        } catch (err) {
          if (err instanceof ResumeExtractionError) {
            await fail(err.publicMessage, { contentHash: hash, extractedText: null });
            throw ApiError.unprocessableEntity(err.publicMessage);
          }
          throw err;
        }
        await prisma.resume.update({ where: { id: resume.id }, data: { extractedText: text, contentHash: hash } });
      }

      // 2. structure (deterministic + one LLM call)
      const outcome = await parseResumeText(text, getLlmService());

      return await prisma.resume.update({
        where: { id: resume.id },
        data: {
          parseStatus: 'PARSED',
          parseError: null,
          parsedData: outcome.data as unknown as Prisma.InputJsonValue,
          parsedAt: new Date(),
          parserVersion: RESUME_PARSER_VERSION,
          contentHash: hash,
          ...(opts.resetEdits ? { userEditedData: Prisma.DbNull } : {})
        }
      });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof LlmNotConfiguredError) {
        await fail(NOT_CONFIGURED_MESSAGE);
        throw toApiError(err);
      }
      if (err instanceof ResumeStructureError) {
        await fail(err.publicMessage);
        throw ApiError.unprocessableEntity(err.publicMessage);
      }
      if (err instanceof AiError) {
        await fail(err.publicMessage);
        throw toApiError(err);
      }
      aiLog.error({ event: 'resume.parse.unexpected', task: 'resume_parse' });
      await fail('Resume parsing failed unexpectedly');
      throw ApiError.internal('Resume parsing failed unexpectedly');
    }
  }

  /** Ownership-checked helper for other modules: returns the effective structured data, parsing if needed. */
  static async ensureResumeParsed(
    userId: string,
    resumeId: string
  ): Promise<{ resume: Resume; data: StructuredResume }> {
    let resume = await loadOwned(userId, resumeId);
    let data = resume.parseStatus === 'PARSED' ? getEffectiveResumeData(resume) : null;
    if (!data) {
      resume = await ResumeParserService.parseResume(userId, resumeId);
      data = getEffectiveResumeData(resume);
    }
    if (!data) throw ApiError.unprocessableEntity('Resume could not be parsed');
    return { resume, data };
  }
}

export const ensureResumeParsed = (userId: string, resumeId: string) =>
  ResumeParserService.ensureResumeParsed(userId, resumeId);
