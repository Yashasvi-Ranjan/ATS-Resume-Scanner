import { Router } from 'express';
import authRoutes from './auth.routes';
import resumeRoutes from './resume.routes';
import jobDescriptionRoutes from './jobDescription.routes';
import analysisRoutes from './analysis.routes';
import recommendationRoutes from './recommendation.routes';
import enhancementRoutes from './enhancement.routes';
import interviewRoutes from './interview.routes';
import healthRoutes from './health.routes';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/resumes', resumeRoutes);
apiRouter.use('/job-descriptions', jobDescriptionRoutes);
apiRouter.use('/analyses', analysisRoutes);
apiRouter.use('/recommendations', recommendationRoutes);
apiRouter.use('/enhancements', enhancementRoutes);
apiRouter.use('/interviews', interviewRoutes);

export default apiRouter;
