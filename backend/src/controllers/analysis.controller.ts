import { Request, Response, NextFunction } from 'express';
import { AnalysisService } from '../services/analysis.service';
import { ApiResponse } from '../utils/apiResponse';

export class AnalysisController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const analysis = await AnalysisService.create(req.user!.id, req.body);
      ApiResponse.created(res, 'Job match analysis record created successfully', analysis);
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { analyses, meta } = await AnalysisService.listUserAnalyses(req.user!.id, req.query);
      ApiResponse.success(
        res,
        'Job match analysis records retrieved successfully',
        analyses,
        200,
        meta
      );
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const analysis = await AnalysisService.getById(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Job match analysis retrieved successfully', analysis);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AnalysisService.delete(req.user!.id, req.params.id as string);
      ApiResponse.success(res, result.message);
    } catch (error) {
      next(error);
    }
  }
}
