import { StructuredResume } from '../schemas/resume.schema';
import { ParsedJobDescription } from '../schemas/jobDescription.schema';
import { MatchResult } from '../schemas/match.schema';
import { containsTerm, contentTokens } from './text';
import { extractKnownSkillsFromText, isSameSkill, textMentionsSkill } from '../skills';

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


/**
 * True when the resume itself evidences `term` (alias-aware: React / React.js / ReactJS, any listed skill,
 * experience skillsUsed, project technologies, or a mention in the resume text). The parsed resume is the
 * source of truth: a stored match analysis saying a skill is "missing" never overrides it.
 */
export function resumeEvidences(r: StructuredResume, term: string): boolean {
  const own: string[] = [];
  r.skills.forEach((s) => { own.push(s.name); if (s.canonical) own.push(s.canonical); });
  r.keywords.forEach((k) => own.push(k));
  r.experience.forEach((e) => e.skillsUsed.forEach((k) => own.push(k)));
  r.projects.forEach((p) => p.technologies.forEach((k) => own.push(k)));
  r.certifications.forEach((c) => own.push(c.name));
  const text = resumeContextText(r);
  const direct = (t: string) =>
    own.some((o) => isSameSkill(o, t)) || textMentionsSkill(text, t) || containsTerm(text, t);
  if (direct(term)) return true;
  // Requirement phrases such as "React.js experience" -> check each known skill inside the phrase.
  const inner = extractKnownSkillsFromText(term);
  return inner.length > 0 && inner.every((m) => direct(m.skill));
}

export function gapContextText(m: MatchResult | null, resume: StructuredResume): string {
  if (!m) return '';
  const lines: string[] = [];
  const missing = m.requirements.missing.filter((r) => r.level === 'required' && !resumeEvidences(resume, r.requirement)).slice(0, 10).map((r) => r.requirement);
  const partial = m.requirements.partial.filter((r) => !resumeEvidences(resume, r.requirement)).slice(0, 8).map((r) => r.requirement);
  if (missing.length) lines.push(`Required but NOT evidenced in resume: ${missing.join(', ')}`);
  if (partial.length) lines.push(`Only partially evidenced: ${partial.join(', ')}`);
  const weak = m.weaknesses.filter((w) => !extractKnownSkillsFromText(w).some((k) => resumeEvidences(resume, k.skill)));
  if (weak.length) lines.push(`Weaknesses: ${weak.slice(0, 5).join('; ')}`);
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

/**
 * Skills/technologies named by the JD (or flagged as gaps) that the resume does NOT evidence.
 * A question may mention these only as a gap, never as something the candidate has done.
 */
export function unevidencedTerms(ctx: InterviewContext): string[] {
  const { resume: r, jd } = ctx;
  const evidenced = (t: string) => resumeEvidences(r, t);

  const candidates = new Set<string>();
  const addCand = (s?: string | null) => { const v = (s ?? '').trim(); if (v.length >= 2 && v.length <= 40) candidates.add(v); };
  [...jd.requiredSkills, ...jd.preferredSkills].forEach((s) => { addCand(s.name); addCand(s.canonical); });
  jd.technologies.forEach(addCand);
  if (ctx.match) {
    ctx.match.requirements.missing.forEach((x) => addCand(x.requirement));
    ctx.match.requirements.partial.forEach((x) => addCand(x.requirement));
  }
  return [...candidates].filter((t) => !evidenced(t));
}

const CLAIM_RE =
  /\b(your (?:experience|work|background|expertise|proficiency|knowledge|familiarity|hands-on|time|projects?)\b|given your|based on your|you(?:'ve| have)\b|you (?:used|worked|built|developed|implemented|led|managed|deployed)\b|as (?:a|an) (?:experienced|seasoned)|since you)/i;
const GAP_FRAME_RE =
  /\b(how would you (?:approach|go about|ramp|get up|learn|pick up|prepare)|if you (?:were|had|needed|are)|haven'?t|have not|not (?:yet )?(?:used|worked)|no (?:direct |prior |hands-on )?experience|limited experience|new to|unfamiliar|learn(?:ing)?|ramp up|get up to speed|although|even though)\b/i;

/**
 * True when the question text refers to a skill the resume does not evidence in a way that
 * implies the candidate has experience with it (the fabrication we must never show a user).
 * Returns the offending term, or null when the question is factually safe.
 */
export function claimsUnevidencedExperience(questionText: string, unevidenced: string[]): string | null {
  const hit = unevidenced.find((t) => containsTerm(questionText, t));
  if (!hit) return null;
  if (CLAIM_RE.test(questionText) || !GAP_FRAME_RE.test(questionText)) return hit;
  return null;
}

/** Deterministic skill coverage so the model never has to guess which JD skills the resume has. */
export function skillCoverageText(ctx: InterviewContext): string {
  const { resume: r, jd } = ctx;
  const seen = new Set<string>();
  const have: string[] = [];
  const lack: string[] = [];
  for (const s of [...jd.requiredSkills, ...jd.preferredSkills]) {
    const name = (s.canonical || s.name).trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    (resumeEvidences(r, name) || resumeEvidences(r, s.name) ? have : lack).push(name);
  }
  const lines: string[] = [];
  if (have.length) lines.push(`Job skills the candidate DOES have (present in the resume; never say these are missing): ${have.join(', ')}`);
  if (lack.length) lines.push(`Job skills NOT found in the resume (the only skills that may be treated as gaps): ${lack.join(', ')}`);
  return lines.join('\n');
}

const ABSENCE_RE =
  /\b(not (?:highlighted|listed|mentioned|shown|evidenced|present|included|found|on your resume|in your resume)|isn'?t (?:highlighted|listed|mentioned|on your resume|in your resume)|aren'?t (?:highlighted|listed|mentioned)|missing from your resume|(?:don'?t|do not|doesn'?t|does not) (?:have|list|show|mention|highlight)|(?:no|lack of|without|limited|little) (?:direct |prior |hands-on |demonstrated |evidence of )?(?:experience|exposure)|haven'?t (?:used|worked|listed|shown)|have not (?:used|worked|listed|shown)|gap in your)\b/i;

/**
 * True when the question says the resume lacks a skill that the resume actually evidences.
 * Returns the offending skill, or null.
 */
export function deniesEvidencedSkill(questionText: string, ctx: InterviewContext): string | null {
  if (!ABSENCE_RE.test(questionText)) return null;
  const mentioned = extractKnownSkillsFromText(questionText).map((m) => m.skill);
  const { jd } = ctx;
  for (const s of [...jd.requiredSkills, ...jd.preferredSkills, ...jd.technologies.map((t) => ({ name: t, canonical: t }))]) {
    const name = (s.canonical || s.name || '').trim();
    if (name && containsTerm(questionText, name) && resumeEvidences(ctx.resume, name)) return name;
  }
  return mentioned.find((k) => resumeEvidences(ctx.resume, k)) ?? null;
}
