import { Router } from 'express';
import { EnhancementController } from '../controllers/enhancement.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createEnhancementSchema,
  enhancementIdParam
} from '../validators/enhancement.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validateRequest({ body: createEnhancementSchema }),
  EnhancementController.create
);
router.get('/', EnhancementController.list);
router.get(
  '/:id',
  validateRequest({ params: enhancementIdParam }),
  EnhancementController.getById
);
router.get(
  '/:id/versions',
  validateRequest({ params: enhancementIdParam }),
  EnhancementController.getVersions
);
router.get(
  '/:id/download',
  validateRequest({ params: enhancementIdParam }),
  EnhancementController.download
);

export default router;
