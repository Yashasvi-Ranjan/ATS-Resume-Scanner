import { Router } from 'express';
import '../ai/gap/register'; // activates auto-generation on analysis completion
import { RecommendationController } from '../controllers/recommendation.controller';
import { aiRateLimiter } from '../middleware/rateLimiter.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  analysisIdOnlyParam,
  generateRecommendationsSchema,
  recommendationIdParam,
  updateRecommendationStatusSchema
} from '../validators/recommendation.validator';

const router = Router();

/** Mounted by analysis.routes.ts under /analyses/:id (needs :id from the parent). */
export const analysisScopedRouter = Router({ mergeParams: true });
analysisScopedRouter.get(
  '/gap-analysis',
  validateRequest({ params: analysisIdOnlyParam }),
  RecommendationController.getGapAnalysis
);
analysisScopedRouter.post(
  '/recommendations/generate',
  aiRateLimiter,
  validateRequest({ params: analysisIdOnlyParam, body: generateRecommendationsSchema }),
  RecommendationController.generate
);

router.use(authenticate);

router.patch(
  '/:id',
  validateRequest({
    params: recommendationIdParam,
    body: updateRecommendationStatusSchema
  }),
  RecommendationController.updateStatus
);

export default router;
