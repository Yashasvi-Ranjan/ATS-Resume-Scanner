import { Router } from 'express';
import { ResumeController } from '../controllers/resume.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resumeUpload } from '../middleware/upload.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { resumeIdParam } from '../validators/resume.validator';

const router = Router();

router.use(authenticate);

router.post('/', resumeUpload.single('resume'), ResumeController.uploadResume);
router.get('/', ResumeController.listResumes);
router.get('/:id', validateRequest({ params: resumeIdParam }), ResumeController.getResumeById);
router.get(
  '/:id/download',
  validateRequest({ params: resumeIdParam }),
  ResumeController.downloadResume
);
router.delete('/:id', validateRequest({ params: resumeIdParam }), ResumeController.deleteResume);

export default router;
