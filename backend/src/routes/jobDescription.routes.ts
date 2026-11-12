import { Router } from 'express';
import { JobDescriptionController } from '../controllers/jobDescription.controller';
import { aiRateLimiter } from '../middleware/rateLimiter.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createJobDescriptionSchema,
  updateJobDescriptionSchema,
  jobDescriptionIdParam,
  parseJobDescriptionSchema,
  editParsedJobDescriptionSchema
} from '../validators/jobDescription.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validateRequest({ body: createJobDescriptionSchema }),
  JobDescriptionController.create
);
router.get('/', JobDescriptionController.list);
router.get(
  '/:id',
  validateRequest({ params: jobDescriptionIdParam }),
  JobDescriptionController.getById
);
router.post(
  '/:id/parse',
  aiRateLimiter,
  validateRequest({ params: jobDescriptionIdParam, body: parseJobDescriptionSchema }),
  JobDescriptionController.parse
);
router.get(
  '/:id/parsed',
  validateRequest({ params: jobDescriptionIdParam }),
  JobDescriptionController.getParsed
);
router.patch(
  '/:id/parsed',
  validateRequest({ params: jobDescriptionIdParam, body: editParsedJobDescriptionSchema }),
  JobDescriptionController.editParsed
);
router.patch(
  '/:id',
  validateRequest({ params: jobDescriptionIdParam, body: updateJobDescriptionSchema }),
  JobDescriptionController.update
);
router.delete(
  '/:id',
  validateRequest({ params: jobDescriptionIdParam }),
  JobDescriptionController.delete
);

export default router;
