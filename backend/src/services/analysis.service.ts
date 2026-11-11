import { AnalysisStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import {
  internalAnalysisEvaluationSchema,
  AnalysisEvaluationInput
} from '../validators/analysis.validator';

export interface CreateAnalysisDTO {
  resumeId: string;
  jobDescriptionId: string;
}

export class AnalysisService {
  static async create(userId: string, data: CreateAnalysisDTO) {
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

    // 3. Create analysis record. Built from explicit fields only: status is assigned
    // server-side (PENDING); scores stay null (DB default) and arrays start empty.
    // Nothing else from the request is ever copied into the record.
    const analysis = await prisma.jobAnalysis.create({
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
      include: {
        resume: {
          select: { id: true, originalFilename: true, createdAt: true }
        },
        jobDescription: {
          select: { id: true, title: true, companyName: true }
        }
      }
    });

    return analysis;
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
        include: {
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
