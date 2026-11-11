import { Router } from 'express';
import { AnalysisController } from '../controllers/analysis.controller';
import { RecommendationController } from '../controllers/recommendation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createAnalysisSchema,
  analysisIdParam
} from '../validators/analysis.validator';
import { createRecommendationSchema } from '../validators/recommendation.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validateRequest({ body: createAnalysisSchema }),
  AnalysisController.create
);
router.get('/', AnalysisController.list);
router.get('/:id', validateRequest({ params: analysisIdParam }), AnalysisController.getById);
router.delete('/:id', validateRequest({ params: analysisIdParam }), AnalysisController.delete);

// Nested recommendations routes for this analysis
router.get(
  '/:id/recommendations',
  validateRequest({ params: analysisIdParam }),
  RecommendationController.getByAnalysisId
);
router.post(
  '/:id/recommendations',
  validateRequest({ params: analysisIdParam, body: createRecommendationSchema }),
  RecommendationController.createForAnalysis
);

export default router;
