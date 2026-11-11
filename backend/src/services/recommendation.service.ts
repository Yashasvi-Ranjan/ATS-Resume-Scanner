import { Priority, RecommendationCategory, RecommendationStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/apiError';

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
}
