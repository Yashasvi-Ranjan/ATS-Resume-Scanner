import { z } from 'zod';
import { StructuredResumeSchema } from '../ai/schemas/resume.schema';

export const resumeIdParam = z.object({
  id: z.string().uuid('Invalid resume ID format')
});

export const parseResumeBody = z
  .object({
    force: z.boolean().optional(),
    resetEdits: z.boolean().optional()
  })
  .strict()
  .optional()
  .transform((v) => v ?? {});

/** Strict: unknown keys (e.g. parseStatus) are rejected. */
export const updateParsedBody = StructuredResumeSchema;
