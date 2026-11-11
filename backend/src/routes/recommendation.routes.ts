import { Router } from 'express';
import { RecommendationController } from '../controllers/recommendation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  recommendationIdParam,
  updateRecommendationStatusSchema
} from '../validators/recommendation.validator';

const router = Router();

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
