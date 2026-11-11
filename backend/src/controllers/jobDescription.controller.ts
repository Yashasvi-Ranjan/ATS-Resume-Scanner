import { Request, Response, NextFunction } from 'express';
import { JobDescriptionService } from '../services/jobDescription.service';
import { ApiResponse } from '../utils/apiResponse';

export class JobDescriptionController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobDescription = await JobDescriptionService.create(req.user!.id, req.body);
      ApiResponse.created(res, 'Job description created successfully', jobDescription);
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobDescriptions, meta } = await JobDescriptionService.listUserJobDescriptions(
        req.user!.id,
        req.query
      );
      ApiResponse.success(
        res,
        'Job descriptions retrieved successfully',
        jobDescriptions,
        200,
        meta
      );
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobDescription = await JobDescriptionService.getById(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Job description retrieved successfully', jobDescription);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await JobDescriptionService.update(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      ApiResponse.success(res, 'Job description updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await JobDescriptionService.delete(req.user!.id, req.params.id as string);
      ApiResponse.success(res, result.message);
    } catch (error) {
      next(error);
    }
  }
}
