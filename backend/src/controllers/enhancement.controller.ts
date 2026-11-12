import { Request, Response, NextFunction } from 'express';
import { EnhancementService } from '../services/enhancement.service';
import { ApiResponse } from '../utils/apiResponse';

export class EnhancementController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enhancement = await EnhancementService.create(req.user!.id, req.body);
      ApiResponse.created(res, 'Resume enhancement version created successfully', enhancement);
    } catch (error) {
      next(error);
    }
  }

  static async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enhancement, reused } = await EnhancementService.generate(req.user!.id, req.body);
      const data = { ...enhancement, reused };
      if (reused) {
        ApiResponse.success(res, 'Existing enhancement for identical inputs reused (no new AI call)', data);
      } else {
        ApiResponse.created(res, 'Resume enhancement generated successfully', data);
      }
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enhancement = await EnhancementService.update(req.user!.id, req.params.id as string, req.body);
      ApiResponse.success(res, 'Resume enhancement updated successfully', enhancement);
    } catch (error) {
      next(error);
    }
  }

  static async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enhancement = await EnhancementService.approve(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Resume enhancement approved', enhancement);
    } catch (error) {
      next(error);
    }
  }

  static async compare(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await EnhancementService.compare(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Enhancement comparison retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enhancements, meta } = await EnhancementService.listUserEnhancements(req.user!.id, req.query);
      ApiResponse.success(res, 'Resume enhancements retrieved successfully', enhancements, 200, meta);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enhancement = await EnhancementService.getById(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Resume enhancement retrieved successfully', enhancement);
    } catch (error) {
      next(error);
    }
  }

  static async getVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const versions = await EnhancementService.getVersions(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Enhancement versions retrieved successfully', versions);
    } catch (error) {
      next(error);
    }
  }

  static async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const format = (req.query.format as 'txt' | 'docx' | undefined) ?? 'txt';
      const { buffer, filename, mimeType } = await EnhancementService.getDownloadFile(
        req.user!.id,
        req.params.id as string,
        format
      );
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
