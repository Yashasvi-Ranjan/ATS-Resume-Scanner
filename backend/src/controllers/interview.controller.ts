import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { ApiResponse } from '../utils/apiResponse';

export class InterviewController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await InterviewService.createSession(req.user!.id, req.body);
      ApiResponse.created(res, 'Interview session created successfully', session);
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessions, meta } = await InterviewService.listUserSessions(req.user!.id, req.query);
      ApiResponse.success(
        res,
        'Interview sessions retrieved successfully',
        sessions,
        200,
        meta
      );
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await InterviewService.getSessionById(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Interview session retrieved successfully', session);
    } catch (error) {
      next(error);
    }
  }

  static async addQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const question = await InterviewService.addQuestion(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      ApiResponse.created(res, 'Interview question added successfully', question);
    } catch (error) {
      next(error);
    }
  }

  static async submitAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const answer = await InterviewService.submitAnswer(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      ApiResponse.created(res, 'Interview answer submitted successfully', answer);
    } catch (error) {
      next(error);
    }
  }

  static async updateAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await InterviewService.updateAnswer(
        req.user!.id,
        req.params.id as string,
        req.params.answerId as string,
        req.body.answerText
      );
      ApiResponse.success(res, 'Interview answer updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await InterviewService.updateStatus(
        req.user!.id,
        req.params.id as string,
        req.body.status
      );
      ApiResponse.success(res, 'Interview session status updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  static async addEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluation = await InterviewService.addEvaluation(
        req.user!.id,
        req.params.id as string,
        req.body
      );
      ApiResponse.created(res, 'Interview evaluation recorded successfully', evaluation);
    } catch (error) {
      next(error);
    }
  }

  static async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await InterviewService.getInterviewReport(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Interview session report retrieved successfully', report);
    } catch (error) {
      next(error);
    }
  }
}
