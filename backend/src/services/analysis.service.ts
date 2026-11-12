import { AnalysisStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { withKeyedLock } from '../utils/keyedLock';
import { ApiError } from '../utils/apiError';
import { ANALYSIS_STALE_MS, AnalysisRunner, isStale } from '../ai/matching/analysisRunner';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import {
  internalAnalysisEvaluationSchema,
  AnalysisEvaluationInput
} from '../validators/analysis.validator';

export interface CreateAnalysisDTO {
  resumeId: string;
  jobDescriptionId: string;
}

const ANALYSIS_INCLUDE = {
  resume: {
    select: { id: true, originalFilename: true, createdAt: true }
  },
  jobDescription: {
    select: { id: true, title: true, companyName: true }
  }
} as const;

export class AnalysisService {
  static async create(userId: string, data: CreateAnalysisDTO) {
    return (await AnalysisService.createOrGetExisting(userId, data)).analysis;
  }

  /**
   * Creates a PENDING analysis and starts the runner in the background. If a fresh PENDING/PROCESSING
   * analysis already exists for the same user + resume + JD, that record is returned instead (created=false).
   */
  static async createOrGetExisting(userId: string, data: CreateAnalysisDTO) {
    // 1. Verify resume belongs to user
    const resume = await prisma.resume.findUnique({
      where: { id: data.resumeId }
    });
    if (!resume) {
      throw ApiError.notFound('Resume not found');
    }
    if (resume.userId !== userId) {
      throw ApiError.forbidden('You do not own the specified resume');
    }

    // 2. Verify job description belongs to user
    const jobDescription = await prisma.jobDescription.findUnique({
      where: { id: data.jobDescriptionId }
    });
    if (!jobDescription) {
      throw ApiError.notFound('Job description not found');
    }
    if (jobDescription.userId !== userId) {
      throw ApiError.forbidden('You do not own the specified job description');
    }

    // 2b/3. Duplicate protection + create, serialised per (user, resume, JD) so concurrent POSTs share one record.
    const analysis = await withKeyedLock(`analysis:${userId}:${data.resumeId}:${data.jobDescriptionId}`, async () => {
      // 2b. Duplicate protection: reuse an in-flight analysis for the same resume + JD.
      const inFlight = await prisma.jobAnalysis.findFirst({
        where: {
          userId,
          resumeId: data.resumeId,
          jobDescriptionId: data.jobDescriptionId,
          status: { in: [AnalysisStatus.PENDING, AnalysisStatus.PROCESSING] },
          updatedAt: { gt: new Date(Date.now() - ANALYSIS_STALE_MS) }
        },
        orderBy: { createdAt: 'desc' },
        include: ANALYSIS_INCLUDE
      });
      if (inFlight) return { record: inFlight, created: false };

      // 3. Create analysis record. Built from explicit fields only: status is assigned
      // server-side (PENDING); scores stay null (DB default) and arrays start empty.
      // Nothing else from the request is ever copied into the record.
      const record = await prisma.jobAnalysis.create({
        data: {
          userId,
          resumeId: data.resumeId,
          jobDescriptionId: data.jobDescriptionId,
          status: AnalysisStatus.PENDING,
          strengths: [],
          weaknesses: [],
          suggestions: [],
          missingSkills: []
        },
        include: ANALYSIS_INCLUDE
      });
      return { record, created: true };
    });
    if (!analysis.created) return { analysis: analysis.record, created: false };
    const created = analysis.record;
    if (AnalysisRunner.autoStart) AnalysisRunner.runInBackground(created.id);
    return { analysis: created, created: true };
  }

  /** Re-run a FAILED (or abandoned PENDING/PROCESSING) analysis. 409 when completed or actively running. */
  static async retry(userId: string, id: string) {
    const existing = await this.getById(userId, id);
    const retryable = existing.status === AnalysisStatus.FAILED || isStale(existing);
    if (!retryable) {
      throw ApiError.conflict(
        existing.status === AnalysisStatus.COMPLETED
          ? 'This analysis is already completed'
          : 'This analysis is already being processed'
      );
    }
    const reset = await prisma.jobAnalysis.updateMany({
      where: { id, updatedAt: existing.updatedAt, status: existing.status },
      data: {
        status: AnalysisStatus.PENDING,
        errorMessage: null,
        overallScore: null,
        skillsScore: null,
        experienceScore: null,
        keywordsScore: null,
        educationScore: null,
        projectRelevanceScore: null,
        strengths: [],
        weaknesses: [],
        suggestions: [],
        missingSkills: [],
        resultData: Prisma.DbNull,
        scoringVersion: null,
        modelInfo: null,
        inputHash: null,
        startedAt: null,
        completedAt: null
      }
    });
    if (reset.count === 0) throw ApiError.conflict('This analysis is already being processed');
    if (AnalysisRunner.autoStart) AnalysisRunner.runInBackground(id);
    return this.getById(userId, id);
  }

  static async getResult(userId: string, id: string) {
    const a = await this.getById(userId, id);
    return { status: a.status, errorMessage: a.errorMessage, result: a.status === AnalysisStatus.COMPLETED ? a.resultData ?? null : null };
  }

  /**
   * TRUSTED INTERNAL SEAM - not exposed over HTTP.
   * Intended solely for a future trusted server-side evaluation service to persist
   * results. It must NEVER be wired to a user-facing route or controller.
   * No scoring logic lives here; it only validates and stores supplied values.
   */
  static async recordAnalysisEvaluation(analysisId: string, evaluation: unknown) {
    const parsed = internalAnalysisEvaluationSchema.safeParse(evaluation);
    if (!parsed.success) {
      throw ApiError.badRequest(
        'Validation failed',
        parsed.error.errors.map((err) =>
          err.code === 'unrecognized_keys'
            ? {
                field: err.keys.join(', '),
                message: `Unexpected field(s) not allowed: ${err.keys.join(', ')}`
              }
            : { field: err.path.join('.'), message: err.message }
        )
      );
    }

    const existing = await prisma.jobAnalysis.findUnique({ where: { id: analysisId } });
    if (!existing) {
      throw ApiError.notFound('Job analysis record not found');
    }

    // Zod omits absent optional keys, so only provided fields are updated.
    const data: AnalysisEvaluationInput = parsed.data;
    return prisma.jobAnalysis.update({ where: { id: analysisId }, data });
  }

  static async listUserAnalyses(
    userId: string,
    queryParams: { page?: unknown; limit?: unknown; status?: unknown }
  ) {
    const { page, limit, skip } = parsePagination(queryParams);
    const statusFilter = queryParams.status
      ? (String(queryParams.status) as AnalysisStatus)
      : undefined;

    const where = {
      userId,
      ...(statusFilter && { status: statusFilter })
    };

    const [total, analyses] = await Promise.all([
      prisma.jobAnalysis.count({ where }),
      prisma.jobAnalysis.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        // Explicit select: the heavy resultData JSON is deliberately excluded from list responses.
        select: {
          id: true,
          userId: true,
          resumeId: true,
          jobDescriptionId: true,
          status: true,
          overallScore: true,
          skillsScore: true,
          experienceScore: true,
          keywordsScore: true,
          educationScore: true,
          projectRelevanceScore: true,
          strengths: true,
          weaknesses: true,
          suggestions: true,
          missingSkills: true,
          errorMessage: true,
          scoringVersion: true,
          modelInfo: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          resume: {
            select: { id: true, originalFilename: true }
          },
          jobDescription: {
            select: { id: true, title: true, companyName: true }
          },
          _count: {
            select: { recommendations: true }
          }
        }
      })
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return { analyses, meta };
  }

  static async getById(userId: string, id: string) {
    const analysis = await prisma.jobAnalysis.findUnique({
      where: { id },
      include: {
        resume: {
          select: {
            id: true,
            originalFilename: true,
            fileSize: true,
            mimeType: true,
            createdAt: true
          }
        },
        jobDescription: {
          select: {
            id: true,
            title: true,
            companyName: true,
            requiredSkills: true,
            preferredSkills: true
          }
        },
        recommendations: true
      }
    });

    if (!analysis) {
      throw ApiError.notFound('Job analysis record not found');
    }

    if (analysis.userId !== userId) {
      throw ApiError.forbidden('You do not have permission to access this analysis');
    }

    return analysis;
  }

  static async delete(userId: string, id: string) {
    await this.getById(userId, id);

    await prisma.jobAnalysis.delete({
      where: { id }
    });

    return { message: 'Job analysis record deleted successfully' };
  }
}
