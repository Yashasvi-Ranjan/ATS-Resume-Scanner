import { Request, Response, NextFunction } from 'express';
import { RecommendationService } from '../services/recommendation.service';
import { ApiResponse } from '../utils/apiResponse';

export class RecommendationController {
  static async createForAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recommendation = await RecommendationService.createForAnalysis(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      ApiResponse.created(res, 'Analysis recommendation created successfully', recommendation);
    } catch (error) {
      next(error);
    }
  }

  static async getByAnalysisId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recommendations = await RecommendationService.getRecommendationsByAnalysisId(
        req.user!.id,
        req.params.id as string
      );
      ApiResponse.success(res, 'Analysis recommendations retrieved successfully', recommendations);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await RecommendationService.updateStatus(
        req.user!.id,
        req.params.id as string,
        req.body.status
      );
      ApiResponse.success(res, 'Recommendation status updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  static async getGapAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await RecommendationService.getGapAnalysis(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Gap analysis retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  }

  static async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await RecommendationService.generate(
        req.user!.id,
        req.params.id as string,
        Boolean(req.body?.force)
      );
      ApiResponse.success(res, 'Recommendations generated successfully', data);
    } catch (error) {
      next(error);
    }
  }
}
