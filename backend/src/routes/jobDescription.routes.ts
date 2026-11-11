import { Router } from 'express';
import { JobDescriptionController } from '../controllers/jobDescription.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createJobDescriptionSchema,
  updateJobDescriptionSchema,
  jobDescriptionIdParam
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
