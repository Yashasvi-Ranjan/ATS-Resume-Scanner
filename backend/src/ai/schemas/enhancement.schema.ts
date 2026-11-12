import { z } from 'zod';

/**
 * Enhanced resume (what we persist) and the lenient shape we ask the LLM for.
 * The LLM output is NEVER persisted directly: it is passed through the deterministic grounding validator.
 */

export const ENHANCEMENT_PROMPT_VERSION = 'enhance-v1';
export const GROUNDING_VALIDATOR_VERSION = 'ground-v1';

export const CHANGE_TYPES = ['reworded', 'unchanged', 'reordered', 'merged', 'removed_redundant'] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

const str = (max: number) => z.string().trim().max(max);

// ---------- persisted structure ----------

export const EnhancedBulletSchema = z.object({
  id: str(80),
  text: str(1600),
  sourceIds: z.array(str(80)).max(10),
  originalText: str(4000),
  changeType: z.enum(CHANGE_TYPES),
  justification: str(600)
});
export type EnhancedBullet = z.infer<typeof EnhancedBulletSchema>;

export const EnhancedResumeSchema = z.object({
  contact: z.object({
    name: str(150).nullish(),
    email: str(200).nullish(),
    phone: str(50).nullish(),
    links: z.array(str(500)).default([])
  }),
  summary: EnhancedBulletSchema.nullish(),
  skills: z.array(str(100)).default([]),
  experience: z
    .array(
      z.object({
        id: str(80),
        title: str(200).nullish(),
        company: str(200),
        location: str(200).nullish(),
        dates: str(100),
        bullets: z.array(EnhancedBulletSchema)
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        id: str(80),
        name: str(200),
        technologies: z.array(str(100)).default([]),
        description: EnhancedBulletSchema.nullish(),
        bullets: z.array(EnhancedBulletSchema)
      })
    )
    .default([]),
  education: z
    .array(
      z.object({
        id: str(80),
        institution: str(250),
        degree: str(200).nullish(),
        field: str(200).nullish(),
        dates: str(100),
        gpa: str(30).nullish()
      })
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        id: str(80),
        name: str(250),
        issuer: str(200).nullish(),
        date: str(40).nullish()
      })
    )
    .default([]),
  achievements: z.array(EnhancedBulletSchema).default([])
});
export type EnhancedResume = z.infer<typeof EnhancedResumeSchema>;

export const MetricSuggestionSchema = z.object({ bulletId: str(80), suggestion: str(400) });
export type MetricSuggestion = z.infer<typeof MetricSuggestionSchema>;

export const ChangeMapItemSchema = z.object({
  path: z.string(),
  bulletId: z.string(),
  changeType: z.enum(CHANGE_TYPES),
  sourceIds: z.array(z.string()),
  originalText: z.string(),
  enhancedText: z.string(),
  justification: z.string()
});
export type ChangeMapItem = z.infer<typeof ChangeMapItemSchema>;

export interface ChangeMap {
  inputHash: string | null;
  items: ChangeMapItem[];
  /** Original items intentionally dropped as redundant (declared by the model, validated). */
  omitted: Array<{ sourceId: string; text: string; changeType: 'removed_redundant'; reason: string }>;
  metricSuggestions: MetricSuggestion[];
}

export type GroundingIssue =
  | 'unsupported'
  | 'invented_metric'
  | 'new_skill'
  | 'new_proper_noun'
  | 'invented_credential'
  | 'altered_entity'
  | 'leadership_claim'
  | 'not_in_original';

export interface GroundingFlag {
  path: string;
  issue: GroundingIssue;
  detail?: string;
  originalText: string;
  proposedText: string;
  action: 'reverted' | 'needs_review';
}

export interface GroundingReport {
  validatorVersion: string;
  /** True only when every item was verified with nothing flagged. */
  passed: boolean;
  /** AI generation: flagged items were auto-reverted. USER/USER_EDIT text: advisory only. */
  advisory: boolean;
  /** True when no original resume data was available to verify against. */
  skipped: boolean;
  checkedItems: number;
  acceptedItems: number;
  revertedItems: number;
  needsReviewItems: number;
  restoredItems: number;
  flagged: GroundingFlag[];
  warnings: string[];
}

// ---------- LLM output (lenient) ----------

const llmText = z.string().nullish();
export const LlmBulletSchema = z.object({
  text: z.string(),
  sourceIds: z.array(z.string()).nullish(),
  changeType: z.string().nullish(),
  justification: llmText
});
export type LlmBullet = z.infer<typeof LlmBulletSchema>;

const removed = z.array(z.object({ sourceId: z.string(), reason: llmText })).nullish();

export const EnhancementLlmOutputSchema = z.object({
  summary: LlmBulletSchema.nullish(),
  skills: z.array(z.string()).nullish(),
  experience: z
    .array(
      z.object({
        sourceId: z.string(),
        title: llmText,
        company: llmText,
        dates: llmText,
        bullets: z.array(LlmBulletSchema).nullish(),
        removed
      })
    )
    .nullish(),
  projects: z
    .array(
      z.object({
        sourceId: z.string(),
        name: llmText,
        technologies: z.array(z.string()).nullish(),
        description: LlmBulletSchema.nullish(),
        bullets: z.array(LlmBulletSchema).nullish(),
        removed
      })
    )
    .nullish(),
  education: z
    .array(
      z.object({
        sourceId: z.string(),
        institution: llmText,
        degree: llmText,
        field: llmText,
        dates: llmText
      })
    )
    .nullish(),
  certifications: z
    .array(z.object({ sourceId: z.string(), name: llmText, issuer: llmText, date: llmText }))
    .nullish(),
  achievements: z.array(LlmBulletSchema).nullish(),
  metricSuggestions: z.array(z.object({ sourceId: z.string(), suggestion: z.string() })).nullish()
});
export type EnhancementLlmOutput = z.infer<typeof EnhancementLlmOutputSchema>;
