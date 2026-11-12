import {
  ParsedJobDescription,
  emptyParsedJd,
  parsedJobDescriptionSchema
} from '../schemas/jobDescription.schema';
import { normalizeSkill, getSkillCategory } from '../skills';
import { runDeterministicPass } from './deterministic';

export interface JdLike {
  title?: string | null;
  description?: string | null;
  requiredSkills?: string[] | null;
  preferredSkills?: string[] | null;
  experienceRequirements?: string | null;
  educationRequirements?: string | null;
  parsedData?: unknown;
  userEditedData?: unknown;
}

function tryParse(v: unknown): ParsedJobDescription | null {
  if (v === null || v === undefined) return null;
  const r = parsedJobDescriptionSchema.safeParse(v);
  return r.success ? r.data : null;
}

/** Adapt the legacy flat columns to the parsed schema (for JDs created before AI parsing). */
export function adaptLegacyJd(jd: JdLike): ParsedJobDescription {
  const out = emptyParsedJd(jd.title ?? '');
  const mk = (name: string) => ({
    name,
    canonical: normalizeSkill(name),
    evidence: '',
    ...(getSkillCategory(name) ? { category: getSkillCategory(name) as string } : {})
  });
  const seen = new Set<string>();
  for (const n of jd.requiredSkills ?? []) {
    const k = normalizeSkill(n).toLowerCase();
    if (!n.trim() || seen.has(k)) continue;
    seen.add(k);
    out.requiredSkills.push(mk(n.trim()));
  }
  for (const n of jd.preferredSkills ?? []) {
    const k = normalizeSkill(n).toLowerCase();
    if (!n.trim() || seen.has(k)) continue;
    seen.add(k);
    out.preferredSkills.push(mk(n.trim()));
  }
  if (jd.experienceRequirements?.trim()) {
    const txt = jd.experienceRequirements.trim();
    const det = runDeterministicPass(txt).experience;
    if (det.length) out.experienceRequirements.push(...det.map((d) => ({ ...d, required: true })));
    else out.experienceRequirements.push({ required: true, evidence: txt.slice(0, 600) });
  }
  if (jd.educationRequirements?.trim()) {
    const txt = jd.educationRequirements.trim();
    const det = runDeterministicPass(txt).education;
    if (det.length) out.educationRequirements.push(...det.map((d) => ({ ...d, required: true })));
    else out.educationRequirements.push({ required: true, evidence: txt.slice(0, 600) });
  }
  out.technologies = out.requiredSkills.concat(out.preferredSkills).map((s) => s.canonical);
  out.completeness = out.requiredSkills.length + out.preferredSkills.length > 0 ? 'partial' : 'vague';
  out.parseWarnings.push('Adapted from legacy structured fields; this job description has not been AI-parsed.');
  if (out.completeness === 'vague') out.ambiguityNotes.push('No structured requirements are available for this job description.');
  return out;
}

/** The data every downstream module should use: user corrections, else parsed output, else adapted legacy columns. */
export function getEffectiveJdData(jd: JdLike): ParsedJobDescription {
  return tryParse(jd.userEditedData) ?? tryParse(jd.parsedData) ?? adaptLegacyJd(jd);
}
