import { z } from 'zod';
import { AnalysisStatus } from '@prisma/client';

export const analysisIdParam = z.object({
  id: z.string().uuid('Invalid analysis ID format')
});

/**
 * Public request body for POST /api/v1/analyses.
 * Users may only reference their own resume and job description. Status, scores and
 * evaluation arrays are assigned server-side; any other key is rejected (400).
 */
export const createAnalysisSchema = z
  .object({
    resumeId: z.string().uuid('Invalid resume ID format'),
    jobDescriptionId: z.string().uuid('Invalid job description ID format')
  })
  .strict();

const score = z.number().min(0).max(100).nullable().optional();
const textList = z.array(z.string().trim().min(1)).optional();

/**
 * INTERNAL ONLY: shape of evaluation results written by a future trusted
 * server-side evaluation service via AnalysisService.recordAnalysisEvaluation.
 * Never use this schema in a user-facing route.
 */
export const internalAnalysisEvaluationSchema = z
  .object({
    status: z.nativeEnum(AnalysisStatus).optional(),
    overallScore: score,
    skillsScore: score,
    experienceScore: score,
    keywordsScore: score,
    educationScore: score,
    projectRelevanceScore: score,
    strengths: textList,
    weaknesses: textList,
    suggestions: textList,
    missingSkills: textList
  })
  .strict();

export type AnalysisEvaluationInput = z.infer<typeof internalAnalysisEvaluationSchema>;
