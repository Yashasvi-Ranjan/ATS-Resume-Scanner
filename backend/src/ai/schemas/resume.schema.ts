import { z } from 'zod';

/**
 * Structured resume produced by the parser (and editable by the user).
 * Every extracted item carries `sourceSnippet`: text copied from the resume (whitespace-collapsed)
 * so it can be traced back to, and verified against, the extracted text.
 */

const s = (max = 500) => z.string().trim().max(max);
const optS = (max = 500) => s(max).nullish();
const idField = z.string().max(64).default('');
const snippet = s(400).nullish();

export const SECTION_NAMES = [
  'contact',
  'summary',
  'skills',
  'experience',
  'internships',
  'projects',
  'education',
  'certifications',
  'achievements',
  'other'
] as const;
export type SectionName = (typeof SECTION_NAMES)[number];

export const EvidenceSchema = z
  .object({ section: s(40), snippet: s(400) })
  .strict();

export const ContactSchema = z
  .object({
    name: optS(150),
    email: optS(200),
    phone: optS(50),
    links: z
      .array(
        z
          .object({
            url: s(500),
            type: z.enum(['linkedin', 'github', 'portfolio', 'other']).default('other')
          })
          .strict()
      )
      .max(20)
      .default([]),
    sourceSnippet: snippet
  })
  .strict();

export const SkillSchema = z
  .object({
    name: s(100).min(1),
    canonical: s(100).default(''),
    category: optS(60),
    evidence: z.array(EvidenceSchema).max(5).default([]),
    /** explicit = the skill is literally written in the resume; inferred = implied by a quoted snippet. */
    confidence: z.enum(['explicit', 'inferred']).default('explicit'),
    /** parsed = produced by the parser; user = added/confirmed by the user. */
    source: z.enum(['parsed', 'user']).default('parsed'),
    sourceSnippet: snippet
  })
  .strict();

export const BulletSchema = z.object({ id: idField, text: s(1500).min(1) }).strict();

export const ExperienceSchema = z
  .object({
    id: idField,
    type: z.enum(['job', 'internship', 'other']).default('job'),
    title: optS(200),
    company: s(200).min(1),
    location: optS(200),
    startDate: optS(40),
    endDate: optS(40),
    isCurrent: z.boolean().nullish(),
    bullets: z.array(BulletSchema).max(50).default([]),
    skillsUsed: z.array(s(100)).max(60).default([]),
    evidence: z.array(EvidenceSchema).max(5).default([]),
    sourceSnippet: snippet
  })
  .strict();

export const ProjectSchema = z
  .object({
    id: idField,
    name: s(200).min(1),
    description: optS(2000),
    bullets: z.array(s(1500)).max(30).default([]),
    technologies: z.array(s(100)).max(40).default([]),
    url: optS(500),
    sourceSnippet: snippet
  })
  .strict();

export const EducationSchema = z
  .object({
    id: idField,
    institution: s(250).min(1),
    degree: optS(200),
    field: optS(200),
    startDate: optS(40),
    endDate: optS(40),
    gpa: optS(30),
    sourceSnippet: snippet
  })
  .strict();

export const CertificationSchema = z
  .object({
    name: s(250).min(1),
    issuer: optS(200),
    date: optS(40),
    sourceSnippet: snippet
  })
  .strict();

export const AchievementSchema = z
  .object({ text: s(1000).min(1), sourceSnippet: snippet })
  .strict();

export const StructuredResumeSchema = z
  .object({
    contact: ContactSchema.default({ links: [] }),
    summary: optS(3000),
    skills: z.array(SkillSchema).max(300).default([]),
    experience: z.array(ExperienceSchema).max(40).default([]),
    projects: z.array(ProjectSchema).max(40).default([]),
    education: z.array(EducationSchema).max(20).default([]),
    certifications: z.array(CertificationSchema).max(40).default([]),
    achievements: z.array(AchievementSchema).max(40).default([]),
    keywords: z.array(s(100)).max(300).default([]),
    /** null when it cannot be determined from parseable date ranges. */
    totalExperienceMonthsEstimate: z.number().int().min(0).max(1200).nullish(),
    sectionsDetected: z.array(s(40)).max(20).default([]),
    parseWarnings: z.array(s(500)).max(100).default([])
  })
  .strict();

export type StructuredResume = z.infer<typeof StructuredResumeSchema>;
export type ResumeSkill = z.infer<typeof SkillSchema>;
export type ResumeExperience = z.infer<typeof ExperienceSchema>;

/** What we ask the LLM for. Lenient on shape; everything is verified against the text afterwards. */
const llmStr = z.string().nullish();
export const ResumeLlmOutputSchema = z.object({
  name: llmStr,
  nameSnippet: llmStr,
  summary: llmStr,
  skills: z
    .array(
      z.object({
        name: z.string(),
        category: llmStr,
        confidence: z.enum(['explicit', 'inferred']).nullish(),
        sourceSnippet: llmStr
      })
    )
    .default([]),
  experience: z
    .array(
      z.object({
        type: z.enum(['job', 'internship', 'other']).nullish(),
        title: llmStr,
        company: z.string(),
        location: llmStr,
        startDate: llmStr,
        endDate: llmStr,
        isCurrent: z.boolean().nullish(),
        bullets: z.array(z.string()).default([]),
        skillsUsed: z.array(z.string()).default([]),
        sourceSnippet: llmStr
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: llmStr,
        bullets: z.array(z.string()).default([]),
        technologies: z.array(z.string()).default([]),
        url: llmStr,
        sourceSnippet: llmStr
      })
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: llmStr,
        field: llmStr,
        startDate: llmStr,
        endDate: llmStr,
        gpa: llmStr,
        sourceSnippet: llmStr
      })
    )
    .default([]),
  certifications: z
    .array(
      z.object({ name: z.string(), issuer: llmStr, date: llmStr, sourceSnippet: llmStr })
    )
    .default([]),
  achievements: z.array(z.object({ text: z.string(), sourceSnippet: llmStr })).default([])
});
export type ResumeLlmOutput = z.infer<typeof ResumeLlmOutputSchema>;
