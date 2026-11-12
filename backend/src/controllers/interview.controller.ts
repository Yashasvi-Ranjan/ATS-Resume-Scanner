import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

function wantsEvaluation(req: Request): boolean {
  if (typeof req.body?.evaluate === 'boolean') return req.body.evaluate;
  return String(req.query.evaluate ?? 'true').toLowerCase() !== 'false';
}

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
        { questionId: req.body.questionId, answerText: req.body.answerText },
        wantsEvaluation(req)
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
        req.body.answerText,
        wantsEvaluation(req)
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

  static async evaluationsGone(_req: Request, _res: Response, next: NextFunction): Promise<void> {
    next(new ApiError(410, 'Evaluations can no longer be submitted by clients. Answers are evaluated by the server.'));
  }

  static async generateQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await InterviewService.generateQuestions(req.user!.id, req.params.id as string, {
        regenerate: req.body?.regenerate === true
      });
      ApiResponse.success(
        res,
        result.generated ? 'Interview questions generated successfully' : 'Interview questions already exist',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  static async evaluateAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await InterviewService.evaluateAnswerById(
        req.user!.id,
        req.params.id as string,
        req.params.answerId as string
      );
      ApiResponse.success(res, 'Answer evaluated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async complete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await InterviewService.completeSession(req.user!.id, req.params.id as string);
      ApiResponse.success(res, 'Interview session completed successfully', result);
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
