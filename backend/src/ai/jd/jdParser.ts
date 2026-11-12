import { ZodSchema } from 'zod';
import { LlmService } from '../llm';
import {
  JdEducationRequirement,
  JdExperienceRequirement,
  JdSkill,
  ParsedJobDescription,
  parsedJobDescriptionSchema
} from '../schemas/jobDescription.schema';
import { canonicalSkillKey, findSkillInText, getSkillCategory, normalizeSkill } from '../skills';
import { DeterministicResult, runDeterministicPass } from './deterministic';
import { JD_PROMPT_VERSION, JD_SYSTEM_PROMPT, JD_TASK, buildJdUserPrompt } from './prompt';

export const JD_PARSER_VERSION = 'jd-parser-1';

/** Lowercase, unify quotes/bullets and collapse whitespace so evidence can be compared tolerant of formatting. */
export function normText(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[•·*#>_`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanEvidence(e: string): string {
  return normText(e).replace(/^[-\s]+/, '').replace(/(\.\.\.|…)\s*$/, '').replace(/^(\.\.\.|…)\s*/, '').trim();
}

export function evidenceInText(evidence: string, normalizedText: string): boolean {
  const ev = cleanEvidence(evidence);
  return ev.length >= 3 && normalizedText.includes(ev);
}

const tokens = (s: string) => normText(s).split(/[^a-z0-9+#.]+/).filter((t) => t.length >= 3);

/** For paraphrase-tolerant string items (responsibilities etc.): most content words must occur in the JD. */
function supportedByText(item: string, textTokens: Set<string>, normalizedText: string): boolean {
  if (normalizedText.includes(normText(item))) return true;
  const t = tokens(item);
  if (t.length === 0) return false;
  return t.filter((x) => textTokens.has(x)).length / t.length >= 0.75;
}

const WORD_NUMS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen)\b/i;

export interface ParseJdInput {
  title: string;
  description: string;
}

export interface ParseJdResult {
  data: ParsedJobDescription;
  meta: { provider: string; model: string; promptVersion: string; attempts: number; latencyMs: number };
}

export function computeCompleteness(d: ParsedJobDescription, textWords: number): ParsedJobDescription['completeness'] {
  const skills = d.requiredSkills.length + d.preferredSkills.length;
  const concrete =
    skills +
    d.responsibilities.length +
    d.minimumQualifications.length +
    d.educationRequirements.length +
    d.experienceRequirements.length;
  if (textWords < 25 || concrete < 2 || (skills === 0 && d.responsibilities.length === 0)) return 'vague';
  if (d.requiredSkills.length === 0 || d.responsibilities.length === 0) return 'partial';
  return 'complete';
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of items) {
    const k = normText(i);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(i);
  }
  return out;
}

/**
 * Validate the LLM output against the real JD text and merge in explicit-cue facts from the deterministic pass.
 * Pure function (no I/O) so it is easy to test.
 */
export function postValidate(
  raw: ParsedJobDescription,
  text: string,
  title: string,
  det: DeterministicResult
): ParsedJobDescription {
  const warnings: string[] = [...raw.parseWarnings];
  const notes: string[] = [...raw.ambiguityNotes];
  const nText = normText(text);
  const textTokens = new Set(tokens(text));

  const hintByKey = new Map(det.skills.map((h) => [canonicalSkillKey(h.skill), h]));

  const required = new Map<string, JdSkill>();
  const preferred = new Map<string, JdSkill>();

  const consider = (s: JdSkill, llmLevel: 'required' | 'preferred') => {
    const name = s.name.trim();
    const hit = findSkillInText(text, name) ?? (s.canonical ? findSkillInText(text, s.canonical) : null);
    if (!hit) {
      warnings.push(`Dropped "${name}": not found in the job description text.`);
      return;
    }
    const canonical = normalizeSkill(name);
    const key = canonicalSkillKey(name);
    let evidence = s.evidence;
    if (!evidenceInText(evidence, nText)) {
      evidence = hit.snippet;
      warnings.push(`Evidence for "${canonical}" was not verbatim; replaced with the text snippet where the skill appears.`);
    }
    let level = llmLevel;
    // Explicit cues in the text override the model (guards against injected "mark everything required" text).
    const hint = hintByKey.get(key);
    const cuedPreferred = hint?.level === 'preferred';
    if (cuedPreferred) level = 'preferred';
    else if (hint?.level === 'required') level = 'required';
    const category = s.category || getSkillCategory(name) || undefined;
    const entry: JdSkill = { name, canonical, evidence, ...(category ? { category } : {}) };
    if (level === 'required') {
      if (!required.has(key) && !preferred.has(key)) required.set(key, entry);
      else if (preferred.has(key)) {
        preferred.delete(key);
        required.set(key, entry);
      }
    } else if (!required.has(key) && !preferred.has(key)) {
      preferred.set(key, entry);
    }
  };

  for (const s of raw.requiredSkills) consider(s, 'required');
  for (const s of raw.preferredSkills) consider(s, 'preferred');

  // Fill in skills the scanner found with an explicit required/preferred cue that the model missed.
  for (const h of det.skills) {
    const key = canonicalSkillKey(h.skill);
    if (required.has(key) || preferred.has(key) || h.level === 'unknown') continue;
    const entry: JdSkill = { name: h.skill, canonical: h.skill, evidence: h.snippet, ...(h.category ? { category: h.category } : {}) };
    (h.level === 'required' ? required : preferred).set(key, entry);
  }

  // Technologies: only terms really present in the text.
  const technologies: string[] = [];
  for (const t of raw.technologies) {
    if (findSkillInText(text, t)) technologies.push(normalizeSkill(t));
    else warnings.push(`Dropped technology "${t}": not found in the job description text.`);
  }
  for (const h of det.skills) technologies.push(h.skill);

  const domainKeywords: string[] = [];
  for (const k of raw.domainKeywords) {
    if (nText.includes(normText(k))) domainKeywords.push(k);
    else warnings.push(`Dropped domain keyword "${k}": not found in the job description text.`);
  }

  const filterStrings = (items: string[], label: string) => {
    const kept: string[] = [];
    for (const i of items) {
      if (supportedByText(i, textTokens, nText)) kept.push(i);
      else warnings.push(`Dropped ${label} item not supported by the job description text.`);
    }
    return dedupeStrings(kept);
  };

  // Education
  const education: JdEducationRequirement[] = [];
  for (const e of raw.educationRequirements) {
    if (!evidenceInText(e.evidence, nText)) {
      warnings.push('Dropped an education requirement whose evidence is not in the job description text.');
      continue;
    }
    education.push(e);
  }
  for (const d of det.education) {
    if (!education.some((e) => e.level?.toLowerCase() === d.level?.toLowerCase())) education.push(d);
  }

  // Experience
  const experience: JdExperienceRequirement[] = [];
  for (const e of raw.experienceRequirements) {
    if (!evidenceInText(e.evidence, nText)) {
      warnings.push('Dropped an experience requirement whose evidence is not in the job description text.');
      continue;
    }
    const ev = normText(e.evidence);
    const stated = (n: number | undefined) => n === undefined || new RegExp(`(?<![0-9])${n}(?![0-9])`).test(ev) || WORD_NUMS.test(ev);
    if (!stated(e.minYears) || !stated(e.maxYears)) {
      warnings.push('Removed years of experience that are not stated in the evidence text.');
      experience.push({ ...e, minYears: undefined, maxYears: undefined });
    } else experience.push(e);
  }
  for (const d of det.experience) {
    if (!experience.some((e) => e.minYears === d.minYears)) experience.push(d);
  }

  const out: ParsedJobDescription = {
    jobTitle: raw.jobTitle || title,
    seniority: raw.seniority || det.seniority,
    requiredSkills: [...required.values()],
    preferredSkills: [...preferred.values()],
    responsibilities: filterStrings(raw.responsibilities, 'responsibility'),
    minimumQualifications: filterStrings(raw.minimumQualifications, 'qualification'),
    educationRequirements: education,
    experienceRequirements: experience,
    technologies: dedupeStrings(technologies),
    domainKeywords: dedupeStrings(domainKeywords),
    otherRequirements: filterStrings(raw.otherRequirements, 'requirement'),
    ambiguityNotes: dedupeStrings(notes),
    completeness: raw.completeness,
    parseWarnings: dedupeStrings(warnings)
  };

  const words = text.split(/\s+/).filter(Boolean).length;
  const computed = computeCompleteness(out, words);
  const rank = { complete: 2, partial: 1, vague: 0 } as const;
  out.completeness = rank[computed] < rank[raw.completeness] ? computed : raw.completeness === 'vague' ? 'vague' : computed;
  if (out.completeness === 'vague' && !out.ambiguityNotes.some((n) => /vague|few concrete/i.test(n))) {
    out.ambiguityNotes.push(
      'The job description contains few concrete requirements; none were invented. Consider adding explicit skills, responsibilities and qualifications.'
    );
  }
  return out;
}

/** Deterministic pass + one LLM call + post-validation. Throws AiError subclasses on LLM failure (never fabricates). */
export async function parseJdText(llm: LlmService, input: ParseJdInput): Promise<ParseJdResult> {
  const title = input.title ?? '';
  const text = input.description;
  const det = runDeterministicPass(text, title);
  const res = await llm.generateJson({
    task: JD_TASK,
    promptVersion: JD_PROMPT_VERSION,
    system: JD_SYSTEM_PROMPT,
    user: buildJdUserPrompt(title, text, det.skills),
    schema: parsedJobDescriptionSchema as unknown as ZodSchema<ParsedJobDescription>,
    maxOutputTokens: 3000,
    temperature: 0
  });
  const data = postValidate(res.data, text, title, det);
  if (text.length > llm.maxInputChars) {
    data.parseWarnings.push('The job description was truncated before being sent to the model; later requirements may be missing.');
  }
  return {
    data,
    meta: {
      provider: res.meta.provider,
      model: res.meta.model,
      promptVersion: res.meta.promptVersion,
      attempts: res.meta.attempts,
      latencyMs: res.meta.latencyMs
    }
  };
}
