import { Request, Response, NextFunction } from 'express';
import { ResumeService } from '../services/resume.service';
import { ApiResponse } from '../utils/apiResponse';

export class ResumeController {
  static async uploadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resume = await ResumeService.uploadResume(req.user!.id, req.file);
      ApiResponse.created(res, 'Resume uploaded successfully', resume);
    } catch (error) {
      next(error);
    }
  }

  static async listResumes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { resumes, meta } = await ResumeService.listUserResumes(req.user!.id, req.query);
      ApiResponse.success(res, 'Resumes retrieved successfully', resumes, 200, meta);
    } catch (error) {
      next(error);
    }
  }

  static async getResumeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resume = await ResumeService.getResumeById(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Resume metadata retrieved successfully', resume);
    } catch (error) {
      next(error);
    }
  }

  static async downloadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { absolutePath, originalFilename, mimeType } =
        await ResumeService.getResumeFileForDownload(req.user!.id, req.params.id as string);

      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(originalFilename)}"`
      );
      res.sendFile(absolutePath);
    } catch (error) {
      next(error);
    }
  }

  static async deleteResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ResumeService.deleteResume(req.user!.id, req.params.id as string);
      ApiResponse.success(res, result.message);
    } catch (error) {
      next(error);
    }
  }
}
