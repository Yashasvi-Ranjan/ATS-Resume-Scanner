import { Request, Response, NextFunction } from 'express';
import { JobDescriptionService } from '../services/jobDescription.service';
import { JdParserService } from '../ai/jd';
import { ApiResponse } from '../utils/apiResponse';

export class JobDescriptionController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { parse, ...dto } = req.body;
      let jobDescription = await JobDescriptionService.create(req.user!.id, dto);
      if (parse === true) {
        // Creation must succeed even when the LLM is unavailable; report the resulting parseStatus instead.
        try {
          jobDescription = await JdParserService.parseJobDescription(req.user!.id, jobDescription.id);
        } catch {
          jobDescription = await JobDescriptionService.getById(req.user!.id, jobDescription.id);
        }
      }
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

  static async parse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jd = await JdParserService.parseJobDescription(req.user!.id, req.params.id as string, req.body ?? {});
      const parsed = await JdParserService.getParsed(req.user!.id, jd.id);
      ApiResponse.success(res, 'Job description parsed successfully', parsed);
    } catch (error) {
      next(error);
    }
  }

  static async getParsed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = await JdParserService.getParsed(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Parsed job description retrieved successfully', parsed);
    } catch (error) {
      next(error);
    }
  }

  static async editParsed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = await JdParserService.saveEdits(req.user!.id, req.params.id as string, req.body);
      ApiResponse.success(res, 'Parsed job description updated successfully', parsed);
    } catch (error) {
      next(error);
    }
  }
}
