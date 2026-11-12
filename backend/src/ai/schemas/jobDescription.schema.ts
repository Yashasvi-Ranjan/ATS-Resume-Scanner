import { z } from 'zod';

/**
 * Structured job description. Used both for LLM output validation (lenient: unknown keys stripped,
 * missing arrays defaulted) and for user edits (strict: unknown keys rejected).
 */

const str = (max: number) => z.string().trim().max(max);

function build(strict: boolean) {
  const obj = <T extends z.ZodRawShape>(shape: T) => (strict ? z.object(shape).strict() : z.object(shape));

  const skill = obj({
    name: str(100).min(1),
    canonical: str(100).default(''),
    /** Verbatim snippet of the JD supporting this requirement. May be empty only for user-added items. */
    evidence: str(600).default(''),
    category: str(50).optional()
  });

  const education = obj({
    level: str(60).optional(),
    field: str(120).optional(),
    required: z.boolean().default(true),
    evidence: str(600).default('')
  });

  const experience = obj({
    minYears: z.number().min(0).max(60).optional(),
    maxYears: z.number().min(0).max(60).optional(),
    area: str(120).optional(),
    required: z.boolean().default(true),
    evidence: str(600).default('')
  });

  return obj({
    jobTitle: str(200).default(''),
    seniority: str(60).optional(),
    requiredSkills: z.array(skill).max(100).default([]),
    preferredSkills: z.array(skill).max(100).default([]),
    responsibilities: z.array(str(500)).max(60).default([]),
    minimumQualifications: z.array(str(500)).max(60).default([]),
    educationRequirements: z.array(education).max(20).default([]),
    experienceRequirements: z.array(experience).max(20).default([]),
    technologies: z.array(str(100)).max(100).default([]),
    domainKeywords: z.array(str(100)).max(100).default([]),
    otherRequirements: z.array(str(500)).max(60).default([]),
    ambiguityNotes: z.array(str(500)).max(30).default([]),
    completeness: z.enum(['complete', 'partial', 'vague']).default('partial'),
    parseWarnings: z.array(str(500)).max(60).default([])
  });
}

/** Lenient schema (LLM output and stored data). */
export const parsedJobDescriptionSchema = build(false);
/** Strict schema (user edits via PATCH). */
export const parsedJobDescriptionStrictSchema = build(true);

export type ParsedJobDescription = z.infer<typeof parsedJobDescriptionSchema>;
export type JdSkill = ParsedJobDescription['requiredSkills'][number];
export type JdEducationRequirement = ParsedJobDescription['educationRequirements'][number];
export type JdExperienceRequirement = ParsedJobDescription['experienceRequirements'][number];
export type JdCompleteness = ParsedJobDescription['completeness'];

export function emptyParsedJd(jobTitle = ''): ParsedJobDescription {
  return parsedJobDescriptionSchema.parse({ jobTitle });
}
