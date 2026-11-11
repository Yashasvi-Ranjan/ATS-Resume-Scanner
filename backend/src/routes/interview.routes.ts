import { Router } from 'express';
import { InterviewController } from '../controllers/interview.controller';
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
  addEvaluationSchema
} from '../validators/interview.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validateRequest({ body: createInterviewSchema }),
  InterviewController.create
);
router.get('/', InterviewController.list);
router.get('/:id', validateRequest({ params: interviewIdParam }), InterviewController.getById);

router.post(
  '/:id/questions',
  validateRequest({ params: interviewIdParam, body: addQuestionSchema }),
  InterviewController.addQuestion
);

router.post(
  '/:id/answers',
  validateRequest({ params: interviewIdParam, body: submitAnswerSchema }),
  InterviewController.submitAnswer
);

router.patch(
  '/:id/answers/:answerId',
  validateRequest({ params: answerIdParam, body: updateAnswerSchema }),
  InterviewController.updateAnswer
);

router.patch(
  '/:id/status',
  validateRequest({ params: interviewIdParam, body: updateInterviewStatusSchema }),
  InterviewController.updateStatus
);

router.post(
  '/:id/evaluations',
  validateRequest({ params: interviewIdParam, body: addEvaluationSchema }),
  InterviewController.addEvaluation
);

router.get(
  '/:id/report',
  validateRequest({ params: interviewIdParam }),
  InterviewController.getReport
);

export default router;
