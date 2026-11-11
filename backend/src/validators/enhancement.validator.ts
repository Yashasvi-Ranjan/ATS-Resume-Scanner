import { z } from 'zod';

export const enhancementIdParam = z.object({
  id: z.string().uuid('Invalid enhancement ID format')
});

export const createEnhancementSchema = z.object({
  resumeId: z.string().uuid('Invalid resume ID format'),
  jobDescriptionId: z.string().uuid('Invalid job description ID format'),
  enhancedContent: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'COMPLETED', 'ARCHIVED']).optional().default('DRAFT')
});
