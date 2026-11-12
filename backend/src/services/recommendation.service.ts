import { Priority, RecommendationCategory, RecommendationStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { GapGenerator } from '../ai/gap/gapGenerator';
import type { GapSummary } from '../ai/schemas/recommendation.schema';

export interface CreateRecommendationDTO {
  category: RecommendationCategory;
  title: string;
  description: string;
  reason?: string | null;
  priority?: Priority;
  status?: RecommendationStatus;
}

export class RecommendationService {
  static async createForAnalysis(
    userId: string,
    analysisId: string,
    data: CreateRecommendationDTO
  ) {
    const analysis = await prisma.jobAnalysis.findUnique({
      where: { id: analysisId }
    });

    if (!analysis) {
      throw ApiError.notFound('Job analysis record not found');
    }

    if (analysis.userId !== userId) {
      throw ApiError.forbidden('You do not own this analysis record');
    }

    const recommendation = await prisma.analysisRecommendation.create({
      data: {
        analysisId,
        category: data.category,
        title: data.title,
        description: data.description,
        reason: data.reason,
        priority: data.priority || Priority.MEDIUM,
        source: 'USER',
        status: data.status || RecommendationStatus.NOT_STARTED
      }
    });

    return recommendation;
  }

  static async getRecommendationsByAnalysisId(userId: string, analysisId: string) {
    const analysis = await prisma.jobAnalysis.findUnique({
      where: { id: analysisId }
    });

    if (!analysis) {
      throw ApiError.notFound('Job analysis record not found');
    }

    if (analysis.userId !== userId) {
      throw ApiError.forbidden('You do not own this analysis record');
    }

    const recommendations = await prisma.analysisRecommendation.findMany({
      where: { analysisId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
    });

    return recommendations;
  }

  static async updateStatus(
    userId: string,
    recommendationId: string,
    status: RecommendationStatus
  ) {
    const recommendation = await prisma.analysisRecommendation.findUnique({
      where: { id: recommendationId },
      include: {
        analysis: {
          select: { userId: true }
        }
      }
    });

    if (!recommendation) {
      throw ApiError.notFound('Recommendation not found');
    }

    if (recommendation.analysis.userId !== userId) {
      throw ApiError.forbidden('You do not have permission to update this recommendation');
    }

    const updated = await prisma.analysisRecommendation.update({
      where: { id: recommendationId },
      data: { status }
    });

    return updated;
  }

  private static async loadOwnedAnalysis(userId: string, analysisId: string) {
    const analysis = await prisma.jobAnalysis.findUnique({ where: { id: analysisId } });
    if (!analysis) throw ApiError.notFound('Job analysis record not found');
    if (analysis.userId !== userId) throw ApiError.forbidden('You do not own this analysis record');
    return analysis;
  }

  /** Flat recommendations merged with their AI details, grouped into IMPROVE (presentation) and LEARN_ADD (acquire). */
  static async getGapAnalysis(userId: string, analysisId: string) {
    await RecommendationService.loadOwnedAnalysis(userId, analysisId);
    const rows = await prisma.analysisRecommendation.findMany({
      where: { analysisId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
    });
    const rankOf = (d: unknown) => ((d as { rank?: number } | null)?.rank ?? Number.MAX_SAFE_INTEGER) as number;
    const prio = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    const view = rows
      .map((r) => ({
        id: r.id,
        category: r.category,
        title: r.title,
        description: r.description,
        reason: r.reason,
        priority: r.priority,
        status: r.status,
        source: r.source,
        createdAt: r.createdAt,
        details: r.details ?? null
      }))
      .sort((a, b) => prio[a.priority] - prio[b.priority] || rankOf(a.details) - rankOf(b.details));
    const improve = view.filter((r) => r.category === 'IMPROVE');
    const learnAdd = view.filter((r) => r.category === 'LEARN_ADD');
    const summary: GapSummary = {
      counts: { total: view.length, improve: improve.length, learnAdd: learnAdd.length },
      byPriority: {
        HIGH: view.filter((r) => r.priority === 'HIGH').length,
        MEDIUM: view.filter((r) => r.priority === 'MEDIUM').length,
        LOW: view.filter((r) => r.priority === 'LOW').length
      },
      completedCount: view.filter((r) => r.status === RecommendationStatus.COMPLETED).length
    };
    return { improve, learnAdd, summary };
  }

  /** (Re)generate AI recommendations. Only for COMPLETED analyses. User-progressed and USER rows are preserved. */
  static async generate(userId: string, analysisId: string, force = false) {
    const analysis = await RecommendationService.loadOwnedAnalysis(userId, analysisId);
    if (analysis.status !== 'COMPLETED') {
      throw ApiError.conflict('Recommendations can only be generated for a completed analysis');
    }
    const outcome = await GapGenerator.generateForAnalysis(analysisId, { force });
    const gap = await RecommendationService.getGapAnalysis(userId, analysisId);
    return { ...gap, generation: outcome };
  }
}
