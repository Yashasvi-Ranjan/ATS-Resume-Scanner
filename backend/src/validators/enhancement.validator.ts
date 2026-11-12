import { z } from 'zod';

export const enhancementIdParam = z.object({
  id: z.string().uuid('Invalid enhancement ID format')
});

export const createEnhancementSchema = z.object({
  resumeId: z.string().uuid('Invalid resume ID format'),
  jobDescriptionId: z.string().uuid('Invalid job description ID format'),
  enhancedContent: z.string().max(100000).optional().nullable(),
  status: z.enum(['DRAFT', 'COMPLETED', 'ARCHIVED']).optional().default('DRAFT')
});

export const generateEnhancementSchema = z
  .object({
    resumeId: z.string().uuid('Invalid resume ID format'),
    jobDescriptionId: z.string().uuid('Invalid job description ID format'),
    analysisId: z.string().uuid('Invalid analysis ID format').optional(),
    force: z.boolean().optional().default(false)
  })
  .strict();

export const updateEnhancementSchema = z
  .object({
    enhancedContent: z.string().trim().min(1, 'enhancedContent cannot be empty').max(100000).optional(),
    status: z.enum(['DRAFT', 'COMPLETED', 'ARCHIVED']).optional()
  })
  .strict()
  .refine((v) => v.enhancedContent !== undefined || v.status !== undefined, {
    message: 'Provide enhancedContent and/or status'
  });

export const downloadQuerySchema = z.object({
  format: z.enum(['txt', 'docx']).optional().default('txt')
});
