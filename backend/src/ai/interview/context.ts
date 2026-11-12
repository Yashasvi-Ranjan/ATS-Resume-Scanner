import { StructuredResume } from '../schemas/resume.schema';
import { ParsedJobDescription } from '../schemas/jobDescription.schema';
import { MatchResult } from '../schemas/match.schema';
import { containsTerm, contentTokens } from './text';

export interface InterviewContext {
  resume: StructuredResume;
  jd: ParsedJobDescription;
  jobTitle: string;
  match: MatchResult | null;
}

const clip = (s: string | null | undefined, n: number) => (s ?? '').trim().slice(0, n);

export function resumeContextText(r: StructuredResume): string {
  const lines: string[] = [];
  if (r.summary) lines.push(`Summary: ${clip(r.summary, 500)}`);
  if (r.skills.length) lines.push(`Skills: ${r.skills.slice(0, 50).map((s) => s.name).join(', ')}`);
  r.experience.slice(0, 8).forEach((e, i) => {
    lines.push(`Experience ${i + 1}: ${clip(e.title, 100)} at ${clip(e.company, 100)} (${clip(e.startDate, 20)} - ${clip(e.endDate, 20)})`);
    if (e.skillsUsed.length) lines.push(`  Skills used: ${e.skillsUsed.slice(0, 15).join(', ')}`);
    e.bullets.slice(0, 4).forEach((b) => lines.push(`  - ${clip(b.text, 240)}`));
  });
  r.projects.slice(0, 8).forEach((p, i) => {
    lines.push(`Project ${i + 1}: ${clip(p.name, 100)}${p.technologies.length ? ` [${p.technologies.slice(0, 12).join(', ')}]` : ''}`);
    if (p.description) lines.push(`  ${clip(p.description, 300)}`);
    p.bullets.slice(0, 3).forEach((b) => lines.push(`  - ${clip(b, 200)}`));
  });
  r.education.slice(0, 3).forEach((e) => lines.push(`Education: ${[e.degree, e.field, e.institution].filter(Boolean).join(', ')}`));
  return lines.join('\n');
}

export function jdContextText(jd: ParsedJobDescription, title: string): string {
  const lines: string[] = [`Job title: ${clip(jd.jobTitle || title, 150)}`];
  if (jd.seniority) lines.push(`Seniority: ${jd.seniority}`);
  if (jd.requiredSkills.length) lines.push(`Required skills: ${jd.requiredSkills.slice(0, 40).map((s) => s.name).join(', ')}`);
  if (jd.preferredSkills.length) lines.push(`Preferred skills: ${jd.preferredSkills.slice(0, 30).map((s) => s.name).join(', ')}`);
  if (jd.technologies.length) lines.push(`Technologies: ${jd.technologies.slice(0, 30).join(', ')}`);
  jd.responsibilities.slice(0, 10).forEach((r) => lines.push(`Responsibility: ${clip(r, 240)}`));
  if (jd.domainKeywords.length) lines.push(`Domain: ${jd.domainKeywords.slice(0, 20).join(', ')}`);
  return lines.join('\n');
}

export function gapContextText(m: MatchResult | null): string {
  if (!m) return '';
  const lines: string[] = [];
  const missing = m.requirements.missing.filter((r) => r.level === 'required').slice(0, 10).map((r) => r.requirement);
  const partial = m.requirements.partial.slice(0, 8).map((r) => r.requirement);
  if (missing.length) lines.push(`Required but NOT evidenced in resume: ${missing.join(', ')}`);
  if (partial.length) lines.push(`Only partially evidenced: ${partial.join(', ')}`);
  if (m.weaknesses.length) lines.push(`Weaknesses: ${m.weaknesses.slice(0, 5).join('; ')}`);
  return lines.join('\n');
}

/** Short entity-like terms that a rationale may legitimately reference. */
export function groundingTerms(ctx: InterviewContext): { phrases: string[]; longTexts: string[] } {
  const phrases = new Set<string>();
  const longTexts: string[] = [];
  const add = (s?: string | null) => {
    const v = (s ?? '').trim();
    if (!v) return;
    if (v.length <= 60) phrases.add(v);
    else longTexts.push(v);
  };
  const { resume: r, jd } = ctx;
  r.skills.forEach((s) => { add(s.name); add(s.canonical); });
  r.keywords.forEach(add);
  r.experience.forEach((e) => {
    add(e.title); add(e.company);
    e.skillsUsed.forEach(add);
    e.bullets.forEach((b) => add(b.text));
  });
  r.projects.forEach((p) => {
    add(p.name); add(p.description);
    p.technologies.forEach(add);
    p.bullets.forEach(add);
  });
  r.education.forEach((e) => { add(e.degree); add(e.field); add(e.institution); });
  r.certifications.forEach((c) => add(c.name));
  add(jd.jobTitle); add(ctx.jobTitle); add(jd.seniority);
  [...jd.requiredSkills, ...jd.preferredSkills].forEach((s) => { add(s.name); add(s.canonical); });
  jd.technologies.forEach(add);
  jd.domainKeywords.forEach(add);
  jd.responsibilities.forEach(add);
  jd.minimumQualifications.forEach(add);
  if (ctx.match) {
    [...ctx.match.requirements.missing, ...ctx.match.requirements.partial, ...ctx.match.requirements.matched].forEach((x) => add(x.requirement));
  }
  return { phrases: [...phrases], longTexts };
}

/**
 * A rationale (or the question itself) is grounded when it names a known skill/project/term/title
 * from the resume or JD, or shares >= 3 content tokens with a longer resume/JD statement.
 */
export function isGrounded(text: string, terms: { phrases: string[]; longTexts: string[] }): boolean {
  for (const p of terms.phrases) {
    if (p.length >= 2 && containsTerm(text, p)) return true;
  }
  const tTokens = new Set(contentTokens(text));
  for (const lt of terms.longTexts) {
    let shared = 0;
    for (const tok of new Set(contentTokens(lt))) if (tTokens.has(tok)) shared++;
    if (shared >= 3) return true;
  }
  return false;
}
