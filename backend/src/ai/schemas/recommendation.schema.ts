import { z } from 'zod';

/**
 * Gap analysis / learning recommendations.
 *
 * IMPROVE   = the candidate already has genuine (if weakly represented) evidence; advice is about PRESENTATION.
 * LEARN_ADD = the candidate has no evidence of this; advice is to LEARN / ACQUIRE it. A missing skill is never
 *             suggested as something to "add to the resume".
 *
 * `suggestedLearningTopics` are generic topic names only. There is deliberately NO `resources`/URL field:
 * we never fabricate course links.
 */
export const GAP_PROMPT_VERSION = 'gap-enrich-v1' as const;
export const GAP_VERSION = 'gap-v1' as const;

export const GapCategorySchema = z.enum(['IMPROVE', 'LEARN_ADD']);
export const GapPrioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export const GapKindSchema = z.enum(['presentation', 'new_skill']);

export const GapEvidenceSchema = z.object({
  section: z.string(),
  snippet: z.string()
});

export const GapItemSchema = z.object({
  /** Stable key, e.g. "req:skill:docker", "cat:projects", "gen:metrics". Used for idempotent regeneration. */
  key: z.string(),
  category: GapCategorySchema,
  kind: GapKindSchema,
  priority: GapPrioritySchema,
  title: z.string(),
  /** The JD requirement this item addresses (must exist in the MatchResult) or null for category/general items. */
  relatedRequirement: z.string().nullable(),
  relatedCategory: z.string().nullable(),
  requirementType: z.string().nullable(),
  requirementLevel: z.enum(['required', 'preferred']).nullable(),
  evidence: z.array(GapEvidenceSchema),
  /** Explicit statement when evidence is empty. */
  evidenceNote: z.string().nullable(),
  whyItMatters: z.string(),
  suggestedAction: z.string(),
  suggestedLearningTopics: z.array(z.string()),
  practicalExercise: z.string().nullable(),
  rank: z.number().int()
});
export type GapItem = z.infer<typeof GapItemSchema>;

/** What the optional LLM enrichment call may return. It can only reference existing item keys. */
export const GapEnrichmentOutputSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        whyItMatters: z.string().nullish(),
        suggestedAction: z.string().nullish(),
        suggestedLearningTopics: z.array(z.string()).nullish(),
        practicalExercise: z.string().nullish()
      })
    )
});
export type GapEnrichmentOutput = z.infer<typeof GapEnrichmentOutputSchema>;

export const GapSummarySchema = z.object({
  counts: z.object({ total: z.number().int(), improve: z.number().int(), learnAdd: z.number().int() }),
  byPriority: z.object({ HIGH: z.number().int(), MEDIUM: z.number().int(), LOW: z.number().int() }),
  completedCount: z.number().int()
});
export type GapSummary = z.infer<typeof GapSummarySchema>;
export type GapEvidence = z.infer<typeof GapEvidenceSchema>;
