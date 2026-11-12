import { Router } from 'express';
import { InterviewController } from '../controllers/interview.controller';
import { aiRateLimiter } from '../middleware/rateLimiter.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createInterviewSchema,
  interviewIdParam,
  addQuestionSchema,
  submitAnswerSchema,
  answerIdParam,
  updateAnswerSchema,
  updateInterviewStatusSchema,
  generateQuestionsSchema
} from '../validators/interview.validator';

const router = Router();

router.use(authenticate);

router.post('/', aiRateLimiter, validateRequest({ body: createInterviewSchema }), InterviewController.create);
router.get('/', InterviewController.list);
router.get('/:id', validateRequest({ params: interviewIdParam }), InterviewController.getById);

router.post(
  '/:id/generate-questions',
  aiRateLimiter,
  validateRequest({ params: interviewIdParam, body: generateQuestionsSchema }),
  InterviewController.generateQuestions
);

// User-authored PRACTICE questions only (source 'USER'; never AI-evaluated).
router.post(
  '/:id/questions',
  validateRequest({ params: interviewIdParam, body: addQuestionSchema }),
  InterviewController.addQuestion
);

router.post(
  '/:id/answers',
  aiRateLimiter,
  validateRequest({ params: interviewIdParam, body: submitAnswerSchema }),
  InterviewController.submitAnswer
);

router.patch(
  '/:id/answers/:answerId',
  aiRateLimiter,
  validateRequest({ params: answerIdParam, body: updateAnswerSchema }),
  InterviewController.updateAnswer
);

router.post(
  '/:id/answers/:answerId/evaluate',
  aiRateLimiter,
  validateRequest({ params: answerIdParam }),
  InterviewController.evaluateAnswer
);

router.patch(
  '/:id/status',
  validateRequest({ params: interviewIdParam, body: updateInterviewStatusSchema }),
  InterviewController.updateStatus
);

router.post('/:id/complete', aiRateLimiter, validateRequest({ params: interviewIdParam }), InterviewController.complete);

// Removed: evaluations can only be written by the server-side evaluator, never by the browser.
router.post('/:id/evaluations', InterviewController.evaluationsGone);

router.get('/:id/report', validateRequest({ params: interviewIdParam }), InterviewController.getReport);

export default router;
