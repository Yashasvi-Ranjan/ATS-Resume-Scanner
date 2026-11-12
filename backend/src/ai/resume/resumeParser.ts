import { ZodType } from 'zod';
import { LlmService, UNTRUSTED_DATA_POLICY, wrapUntrusted } from '../llm';
import {
  canonicalSkillKey,
  extractKnownSkillsFromText,
  findSkillInText,
  getSkillCategory,
  normalizeSkill
} from '../skills';
import {
  ResumeLlmOutput,
  ResumeLlmOutputSchema,
  ResumeSkill,
  StructuredResume,
  StructuredResumeSchema
} from '../schemas/resume.schema';
import {
  PRESENT_RE,
  collapseWs,
  detectSections,
  estimateTotalMonths,
  extractEmail,
  extractLinks,
  extractPhone,
  findDateRanges,
  guessName,
  indexText,
  isPresent,
  locate,
  sectionAt,
  verifiedSnippet
} from './textUtils';

export const RESUME_PROMPT_VERSION = 'resume-parse-v1';
export const RESUME_PARSER_VERSION = `resume-parser-1.0+${RESUME_PROMPT_VERSION}`;
export const RESUME_PARSE_TASK = 'resume_parse';

const SYSTEM = `${UNTRUSTED_DATA_POLICY}

You convert the plain text of a resume into structured JSON. Rules:
- Copy facts only from the resume text. Never invent or guess employers, titles, degrees, dates, skills, certifications or links.
- Every item must include "sourceSnippet": a short (<= 200 chars) passage copied VERBATIM from the resume that supports it.
- company, institution, degree, dates, gpa and certification names must appear in the resume exactly as written (no expansion of abbreviations).
- Skills: list only skills literally written in the resume (confidence "explicit"). If a skill is only implied, set confidence "inferred" and give the verbatim sourceSnippet that implies it; otherwise omit it.
- Bullets must be copied from the resume text (one string per bullet, without the bullet symbol).
- Use null for unknown optional fields. Internships go in "experience" with type "internship".
- Dates are copied as written (e.g. "Jan 2020", "2019"). Set isCurrent true only if the resume says Present/Current/Ongoing.
Respond with ONLY one JSON object of this shape:
{"name": string|null, "nameSnippet": string|null, "summary": string|null,
 "skills": [{"name": string, "category": string|null, "confidence": "explicit"|"inferred", "sourceSnippet": string}],
 "experience": [{"type": "job"|"internship"|"other", "title": string|null, "company": string, "location": string|null, "startDate": string|null, "endDate": string|null, "isCurrent": boolean, "bullets": [string], "skillsUsed": [string], "sourceSnippet": string}],
 "projects": [{"name": string, "description": string|null, "bullets": [string], "technologies": [string], "url": string|null, "sourceSnippet": string}],
 "education": [{"institution": string, "degree": string|null, "field": string|null, "startDate": string|null, "endDate": string|null, "gpa": string|null, "sourceSnippet": string}],
 "certifications": [{"name": string, "issuer": string|null, "date": string|null, "sourceSnippet": string}],
 "achievements": [{"text": string, "sourceSnippet": string}]}`;

export interface ParseOutcome {
  data: StructuredResume;
  meta: { provider: string; model: string; promptVersion: string; attempts: number; latencyMs: number };
}

export class ResumeStructureError extends Error {
  constructor(public readonly publicMessage: string) {
    super(publicMessage);
    this.name = 'ResumeStructureError';
  }
}

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PRESENT_SRC = '(?:present|current|now|ongoing|till\\s+date|to\\s+date)';

const cap = (s: string | null | undefined, n: number): string | null => {
  const v = collapseWs(s ?? '');
  return v ? v.slice(0, n) : null;
};

/** Hybrid parse: deterministic extraction + ONE LLM call, then every claim is verified against the text. */
export async function parseResumeText(text: string, llm: LlmService): Promise<ParseOutcome> {
  const idx = indexText(text);
  const sections = detectSections(text);
  const warnings: string[] = [];
  const dateRanges = findDateRanges(text);

  const hints =
    `Detected section headings (in order): ${sections.map((s) => s.name).join(', ') || 'none'}.\n` +
    `Date ranges found: ${dateRanges.slice(0, 15).map((d) => `${d.start} - ${d.end}`).join('; ') || 'none'}.`;
  if (text.length > llm.maxInputChars) {
    warnings.push('Resume text was longer than the AI input limit; the end of the document was not analysed.');
  }

  const { data: raw, meta } = await llm.generateJson<ResumeLlmOutput>({
    task: RESUME_PARSE_TASK,
    promptVersion: RESUME_PROMPT_VERSION,
    system: SYSTEM,
    user: `${hints}\n\nResume text:\n${wrapUntrusted('resume', text)}`,
    schema: ResumeLlmOutputSchema as unknown as ZodType<ResumeLlmOutput>
  });

  const sectionOf = (snip: string | null): string => {
    const loc = snip ? locate(text, snip) : null;
    return loc ? sectionAt(sections, loc.index) : 'other';
  };

  // ----- contact (deterministic first) -----
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const links = extractLinks(text);
  let name: string | null = null;
  if (raw.name && isPresent(idx, raw.name)) name = cap(raw.name, 150);
  else {
    if (raw.name) warnings.push('Candidate name from the AI was not found in the text and was dropped.');
    name = guessName(text);
  }

  // ----- skills -----
  const skills = new Map<string, ResumeSkill>();
  for (const m of extractKnownSkillsFromText(text)) {
    skills.set(canonicalSkillKey(m.skill), {
      name: m.skill,
      canonical: m.skill,
      category: m.category ?? null,
      evidence: [{ section: sectionAt(sections, m.index), snippet: m.snippet.slice(0, 400) }],
      confidence: 'explicit',
      source: 'parsed',
      sourceSnippet: m.snippet.slice(0, 400)
    });
  }
  let removedSkills = 0;
  const addLiteralSkill = (rawName: string, category?: string | null): boolean => {
    const n = collapseWs(rawName);
    if (!n || n.length > 100) return false;
    const hit = findSkillInText(text, n);
    if (!hit) return false;
    const key = canonicalSkillKey(n);
    const existing = skills.get(key);
    if (existing) {
      if (!existing.category && category) existing.category = category.slice(0, 60);
      return true;
    }
    skills.set(key, {
      name: hit.matchedText || n,
      canonical: normalizeSkill(n),
      category: getSkillCategory(n) ?? cap(category, 60),
      evidence: [{ section: sectionAt(sections, hit.index), snippet: hit.snippet.slice(0, 400) }],
      confidence: 'explicit',
      source: 'parsed',
      sourceSnippet: hit.snippet.slice(0, 400)
    });
    return true;
  };
  for (const s of raw.skills) {
    if (addLiteralSkill(s.name, s.category)) continue;
    const snip = s.confidence === 'inferred' ? verifiedSnippet(idx, s.sourceSnippet) : null;
    const key = canonicalSkillKey(s.name);
    if (snip && key && s.name.length <= 100 && !skills.has(key)) {
      skills.set(key, {
        name: collapseWs(s.name),
        canonical: normalizeSkill(s.name),
        category: getSkillCategory(s.name) ?? cap(s.category, 60),
        evidence: [{ section: sectionOf(snip), snippet: snip }],
        confidence: 'inferred',
        source: 'parsed',
        sourceSnippet: snip
      });
    } else {
      removedSkills++;
    }
  }
  const verifiedList = (items: string[]): string[] => {
    const out: string[] = [];
    for (const it of items) {
      if (addLiteralSkill(it)) out.push(normalizeSkill(it));
      else removedSkills++;
    }
    return Array.from(new Set(out));
  };

  // ----- experience -----
  let droppedBullets = 0;
  const experience: StructuredResume['experience'] = [];
  for (const e of raw.experience) {
    if (!isPresent(idx, e.company)) {
      warnings.push('An experience entry was dropped because its company name was not found in the resume text.');
      continue;
    }
    const sn = verifiedSnippet(idx, e.sourceSnippet) ?? verifiedSnippet(idx, e.company);
    const loc = sn ? locate(text, sn) : locate(text, e.company);
    const section = loc ? sectionAt(sections, loc.index) : 'experience';
    const title = e.title && isPresent(idx, e.title) ? cap(e.title, 200) : null;
    if (e.title && !title) warnings.push(`Job title at "${cap(e.company, 60)}" was not found in the text and was dropped.`);
    const startDate = e.startDate && isPresent(idx, e.startDate) ? cap(e.startDate, 40) : null;
    let endDate = e.endDate && isPresent(idx, e.endDate) ? cap(e.endDate, 40) : null;
    if ((e.startDate && !startDate) || (e.endDate && !endDate && !PRESENT_RE.test(e.endDate))) {
      warnings.push(`Some dates at "${cap(e.company, 60)}" were not found in the text and were dropped.`);
    }
    let isCurrent = !!e.isCurrent;
    if (isCurrent) {
      const from = loc ? text.lastIndexOf('\n', loc.index) + 1 : 0;
      const win = loc ? text.slice(from, loc.index + 300) : text;
      const ok = startDate
        ? new RegExp(`${startDate.split(/\s+/).map(escapeRe).join('\\s+')}\\s*(?:-|\u2013|\u2014|to|until)\\s*${PRESENT_SRC}`, 'i').test(win)
        : PRESENT_RE.test(win);
      if (!ok) {
        isCurrent = false;
        warnings.push(`"Current" status at "${cap(e.company, 60)}" was not supported by the text and was removed.`);
      } else if (!endDate) endDate = null;
    }
    const bullets: Array<{ id: string; text: string }> = [];
    for (const b of e.bullets) {
      if (isPresent(idx, b)) bullets.push({ id: `exp-${experience.length + 1}-b${bullets.length + 1}`, text: collapseWs(b).slice(0, 1500) });
      else droppedBullets++;
    }
    experience.push({
      id: `exp-${experience.length + 1}`,
      type: section === 'internships' ? 'internship' : (e.type ?? 'job'),
      title,
      company: collapseWs(e.company).slice(0, 200),
      location: e.location && isPresent(idx, e.location) ? cap(e.location, 200) : null,
      startDate,
      endDate,
      isCurrent,
      bullets,
      skillsUsed: verifiedList(e.skillsUsed),
      evidence: sn ? [{ section, snippet: sn }] : [],
      sourceSnippet: sn
    });
  }

  // ----- projects -----
  const projects: StructuredResume['projects'] = [];
  for (const p of raw.projects) {
    if (!isPresent(idx, p.name)) {
      warnings.push('A project was dropped because its name was not found in the resume text.');
      continue;
    }
    const bullets: string[] = [];
    for (const b of p.bullets) {
      if (isPresent(idx, b)) bullets.push(collapseWs(b).slice(0, 1500));
      else droppedBullets++;
    }
    projects.push({
      id: `proj-${projects.length + 1}`,
      name: collapseWs(p.name).slice(0, 200),
      description: p.description && isPresent(idx, p.description) ? cap(p.description, 2000) : null,
      bullets,
      technologies: verifiedList(p.technologies),
      url: p.url && isPresent(idx, p.url) ? cap(p.url, 500) : null,
      sourceSnippet: verifiedSnippet(idx, p.sourceSnippet) ?? verifiedSnippet(idx, p.name)
    });
  }

  // ----- education -----
  const education: StructuredResume['education'] = [];
  for (const ed of raw.education) {
    if (!isPresent(idx, ed.institution)) {
      warnings.push('An education entry was dropped because its institution was not found in the resume text.');
      continue;
    }
    const keep = (v: string | null | undefined, label: string, max: number): string | null => {
      if (!v) return null;
      if (isPresent(idx, v)) return cap(v, max);
      warnings.push(`Education ${label} "${cap(v, 60)}" was not found in the text and was dropped.`);
      return null;
    };
    education.push({
      id: `edu-${education.length + 1}`,
      institution: collapseWs(ed.institution).slice(0, 250),
      degree: keep(ed.degree, 'degree', 200),
      field: keep(ed.field, 'field', 200),
      startDate: keep(ed.startDate, 'start date', 40),
      endDate: keep(ed.endDate, 'end date', 40),
      gpa: keep(ed.gpa, 'GPA', 30),
      sourceSnippet: verifiedSnippet(idx, ed.sourceSnippet) ?? verifiedSnippet(idx, ed.institution)
    });
  }

  // ----- certifications / achievements -----
  const certifications: StructuredResume['certifications'] = [];
  for (const c of raw.certifications) {
    if (!isPresent(idx, c.name)) {
      warnings.push('A certification was dropped because it was not found in the resume text.');
      continue;
    }
    certifications.push({
      name: collapseWs(c.name).slice(0, 250),
      issuer: c.issuer && isPresent(idx, c.issuer) ? cap(c.issuer, 200) : null,
      date: c.date && isPresent(idx, c.date) ? cap(c.date, 40) : null,
      sourceSnippet: verifiedSnippet(idx, c.sourceSnippet) ?? verifiedSnippet(idx, c.name)
    });
  }
  const achievements: StructuredResume['achievements'] = [];
  for (const a of raw.achievements) {
    if (!isPresent(idx, a.text)) {
      droppedBullets++;
      continue;
    }
    achievements.push({
      text: collapseWs(a.text).slice(0, 1000),
      sourceSnippet: verifiedSnippet(idx, a.text)
    });
  }

  if (removedSkills > 0) warnings.push(`${removedSkills} skill(s) listed by the AI were not found in the resume text and were removed.`);
  if (droppedBullets > 0) warnings.push(`${droppedBullets} bullet/achievement item(s) were not found verbatim in the resume text and were removed.`);

  const skillList = Array.from(skills.values());
  const summary = raw.summary && isPresent(idx, raw.summary) ? cap(raw.summary, 3000) : null;
  if (raw.summary && !summary) warnings.push('Summary from the AI was not found in the text and was dropped.');

  if (skillList.length === 0 && experience.length === 0 && education.length === 0 && projects.length === 0) {
    throw new ResumeStructureError('Could not extract any verifiable resume content from this document.');
  }

  const keywords = Array.from(
    new Set([...skillList.map((s) => s.canonical), ...projects.flatMap((p) => p.technologies)])
  ).slice(0, 300);

  const data = StructuredResumeSchema.parse({
    contact: { name, email, phone, links, sourceSnippet: name ? verifiedSnippet(idx, raw.nameSnippet ?? name) : null },
    summary,
    skills: skillList,
    experience,
    projects,
    education,
    certifications,
    achievements,
    keywords,
    totalExperienceMonthsEstimate: estimateTotalMonths(experience),
    sectionsDetected: Array.from(new Set(sections.map((s) => s.name))),
    parseWarnings: warnings.slice(0, 100)
  });
  return { data, meta };
}
