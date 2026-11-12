import { UNTRUSTED_DATA_POLICY, wrapUntrusted } from '../llm';
import type { SkillHint } from './deterministic';

export const JD_PROMPT_VERSION = 'jd-parse-v1';
export const JD_TASK = 'jd-parse';

export const JD_SYSTEM_PROMPT = [
  'You are a precise job description parser for an applicant tracking tool.',
  UNTRUSTED_DATA_POLICY,
  'Extract ONLY what the job description text explicitly states. Never add typical or assumed requirements for the role. If the text is vague or does not state something, leave the field empty and add an ambiguityNotes entry.',
  'Rules:',
  '- requiredSkills: skills/tools/technologies stated as required or must-have (or listed under requirements/qualifications without a softening cue).',
  '- preferredSkills: skills described with cues like "nice to have", "preferred", "bonus", "a plus", "desirable", "ideally". Never put a skill in both lists.',
  '- Every skill, educationRequirement and experienceRequirement MUST include "evidence": an exact verbatim quote (copied character for character, one sentence or phrase) from the job description. Do not paraphrase evidence.',
  '- skill "name" is how the JD writes it; "canonical" is the standard name (e.g. "JS" -> "JavaScript"); "category" is optional (e.g. language, framework, database, cloud, tool, soft skill, domain).',
  '- responsibilities, minimumQualifications, otherRequirements: short strings taken from the text, no invention.',
  '- experienceRequirements: minYears/maxYears only when numbers are stated in the text; "required" is false when stated as preferred.',
  '- educationRequirements: level (e.g. Bachelor, Master, PhD, Diploma) and field only when stated.',
  '- technologies: tools/platforms/technologies mentioned. domainKeywords: domain/industry terms mentioned (e.g. "healthcare", "payments", "financial reporting").',
  '- completeness: "complete" when the JD states concrete skills, responsibilities and qualifications; "partial" when some are missing; "vague" when it contains almost no concrete requirements.',
  '- parseWarnings: leave empty unless you noticed problems in the text.',
  'Output ONLY one JSON object with exactly these keys: jobTitle, seniority, requiredSkills, preferredSkills, responsibilities, minimumQualifications, educationRequirements, experienceRequirements, technologies, domainKeywords, otherRequirements, ambiguityNotes, completeness, parseWarnings. No markdown, no commentary.',
  'Skill object: {"name","canonical","evidence","category"}. Education object: {"level","field","required","evidence"}. Experience object: {"minYears","maxYears","area","required","evidence"}.'
].join('\n');

export function buildJdUserPrompt(title: string, description: string, hints: SkillHint[]): string {
  const hintLine = hints.length
    ? `Skill terms detected by a keyword scanner (hints only; verify against the text, include only if the text actually requires or prefers them): ${hints
        .map((h) => h.skill)
        .join(', ')}`
    : 'The keyword scanner detected no known skill terms.';
  return [
    'Parse the following job description into the required JSON structure.',
    `Job title supplied by the user: ${JSON.stringify(title.slice(0, 200))}`,
    hintLine,
    wrapUntrusted('job_description', description)
  ].join('\n\n');
}
