import { Request, Response, NextFunction } from 'express';
import { AnalysisService } from '../services/analysis.service';
import { ApiResponse } from '../utils/apiResponse';

export class AnalysisController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { analysis, created } = await AnalysisService.createOrGetExisting(req.user!.id, req.body);
      if (created) {
        ApiResponse.created(res, 'Job match analysis record created successfully', analysis);
      } else {
        ApiResponse.success(res, 'An analysis for this resume and job description is already in progress', analysis);
      }
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

  static async retry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const analysis = await AnalysisService.retry(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Job match analysis retry started', analysis, 202);
    } catch (error) {
      next(error);
    }
  }

  static async getResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AnalysisService.getResult(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Job match analysis result retrieved successfully', result);
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
