import { Router } from 'express';
import { EnhancementController } from '../controllers/enhancement.controller';
import { aiRateLimiter } from '../middleware/rateLimiter.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createEnhancementSchema,
  downloadQuerySchema,
  enhancementIdParam,
  generateEnhancementSchema,
  updateEnhancementSchema
} from '../validators/enhancement.validator';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest({ body: createEnhancementSchema }), EnhancementController.create);
router.post('/generate', aiRateLimiter, validateRequest({ body: generateEnhancementSchema }), EnhancementController.generate);
router.get('/', EnhancementController.list);
router.get('/:id', validateRequest({ params: enhancementIdParam }), EnhancementController.getById);
router.patch(
  '/:id',
  validateRequest({ params: enhancementIdParam, body: updateEnhancementSchema }),
  EnhancementController.update
);
router.post('/:id/approve', validateRequest({ params: enhancementIdParam }), EnhancementController.approve);
router.get('/:id/compare', validateRequest({ params: enhancementIdParam }), EnhancementController.compare);
router.get('/:id/versions', validateRequest({ params: enhancementIdParam }), EnhancementController.getVersions);
router.get(
  '/:id/download',
  validateRequest({ params: enhancementIdParam, query: downloadQuerySchema }),
  EnhancementController.download
);

export default router;
