import { z } from 'zod';

export const MATCH_DISCLAIMER = 'Estimated score; not an official score from any employer ATS.' as const;
export const MATCH_LABEL = 'Estimated ATS/Job Match Score' as const;

export const CATEGORY_NAMES = ['skills', 'experience', 'keywords', 'education', 'projects'] as const;
export type CategoryName = (typeof CATEGORY_NAMES)[number];

const weight = z.number().min(0).max(1);

export const MatchWeightsSchema = z.object({
  skills: weight,
  experience: weight,
  keywords: weight,
  education: weight,
  projects: weight
});

export const ResumeEvidenceSchema = z.object({
  section: z.string(),
  snippet: z.string(),
  /** parsed = from the structured resume; semantic_assist = LLM-cited snippet verified verbatim in the resume text. */
  source: z.string()
});

export const CategoryResultSchema = z.object({
  score: z.number().min(0).max(100).nullable(),
  weight: weight,
  effectiveWeight: weight,
  explanation: z.string(),
  deductions: z.array(z.string()),
  evidence: z.array(ResumeEvidenceSchema),
  confidence: z.enum(['high', 'medium', 'low']),
  notAssessable: z.boolean().optional()
});

export const RequirementResultSchema = z.object({
  requirement: z.string(),
  type: z.enum(['skill', 'experience', 'education', 'keyword', 'qualification']),
  level: z.enum(['required', 'preferred']),
  status: z.enum(['matched', 'partial', 'missing']),
  resumeEvidence: z.array(ResumeEvidenceSchema),
  reason: z.string(),
  similarity: z.number().min(0).max(1).optional()
});

export const MatchResultSchema = z.object({
  scoringVersion: z.string(),
  estimatedLabel: z.literal(MATCH_LABEL),
  overallScore: z.number().min(0).max(100),
  weights: MatchWeightsSchema,
  categories: z.object({
    skills: CategoryResultSchema,
    experience: CategoryResultSchema,
    keywords: CategoryResultSchema,
    education: CategoryResultSchema,
    projects: CategoryResultSchema
  }),
  requirements: z.object({
    matched: z.array(RequirementResultSchema),
    partial: z.array(RequirementResultSchema),
    missing: z.array(RequirementResultSchema)
  }),
  uncertainty: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  semanticAssist: z
    .object({
      used: z.boolean(),
      model: z.string().nullable().optional(),
      promptVersion: z.string(),
      adjustedRequirements: z.number().int().optional()
    })
    .optional(),
  disclaimer: z.literal(MATCH_DISCLAIMER)
});

export type MatchWeights = z.infer<typeof MatchWeightsSchema>;
export type ResumeEvidence = z.infer<typeof ResumeEvidenceSchema>;
export type CategoryResult = z.infer<typeof CategoryResultSchema>;
export type RequirementResult = z.infer<typeof RequirementResultSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;

/** What we ask the LLM for in the optional semantic assist step (classification only; never numbers). */
export const SemanticAssistOutputSchema = z.object({
  assessments: z
    .array(
      z.object({
        requirement: z.string(),
        verdict: z.enum(['matched', 'partial', 'none']),
        resumeSnippet: z.string().nullish(),
        explanation: z.string().nullish()
      })
    )
    .default([])
});
export type SemanticAssistOutput = z.infer<typeof SemanticAssistOutputSchema>;
