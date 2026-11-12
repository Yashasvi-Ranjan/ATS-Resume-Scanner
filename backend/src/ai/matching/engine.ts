import { env } from '../../config/env';
import {
  CATEGORY_NAMES,
  CategoryName,
  CategoryResult,
  MATCH_DISCLAIMER,
  MATCH_LABEL,
  MatchResult,
  MatchWeights,
  RequirementResult,
  ResumeEvidence
} from '../schemas/match.schema';
import { ParsedJobDescription } from '../schemas/jobDescription.schema';
import { StructuredResume } from '../schemas/resume.schema';
import { canonicalSkillKey, extractKnownSkillsFromText, findSkillInText, skillsRelated } from '../skills';
import { findTerm, tokenSet, tokens } from './text';

export const SCORING_VERSION = 'match-v1';

/** Credit for evidence strength. Repetition never raises it: the best single piece of evidence counts once. */
export const CREDIT = { demonstrated: 1, claimed: 0.85, listed: 0.7 } as const;
export const REQUIRED_ITEM_WEIGHT = 3;
export const PREFERRED_ITEM_WEIGHT = 1;
export const RELATED_CREDIT_FACTOR = 0.5;
export const ASSIST_CREDIT = { matched: 0.7, partial: 0.4 } as const;

export interface SemanticOverride {
  status: 'matched' | 'partial';
  evidence: ResumeEvidence;
  reason: string;
}
/** Keyed by requirementKey(). Produced only by the verified semantic-assist step. */
export type OverrideMap = Record<string, SemanticOverride>;

export interface ScoreOptions {
  weights?: Partial<MatchWeights>;
  overrides?: OverrideMap;
}

export const requirementKey = (type: 'skill' | 'keyword', name: string): string =>
  `${type}:${type === 'skill' ? canonicalSkillKey(name) : name.trim().toLowerCase()}`;

export function defaultWeights(): MatchWeights {
  return normalizeWeights({
    skills: env.MATCH_WEIGHT_SKILLS,
    experience: env.MATCH_WEIGHT_EXPERIENCE,
    keywords: env.MATCH_WEIGHT_KEYWORDS,
    education: env.MATCH_WEIGHT_EDUCATION,
    projects: env.MATCH_WEIGHT_PROJECTS
  });
}

const FALLBACK_WEIGHTS: MatchWeights = { skills: 0.35, experience: 0.25, keywords: 0.15, education: 0.1, projects: 0.15 };

/** Invalid/negative values become 0; result sums to 1 (falls back to defaults if everything is 0). */
export function normalizeWeights(input: Partial<MatchWeights> = {}): MatchWeights {
  const raw = {} as Record<CategoryName, number>;
  for (const c of CATEGORY_NAMES) {
    const v = input[c];
    raw[c] = typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
  }
  let sum = CATEGORY_NAMES.reduce((a, c) => a + raw[c], 0);
  const src = sum > 0 ? raw : { ...FALLBACK_WEIGHTS };
  sum = CATEGORY_NAMES.reduce((a, c) => a + src[c], 0);
  const out = {} as MatchWeights;
  for (const c of CATEGORY_NAMES) out[c] = Math.round((src[c] / sum) * 1e6) / 1e6;
  return out;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const uniq = <T>(a: T[]): T[] => Array.from(new Set(a));
const clip = (s: string, n = 220) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// ---------------------------------------------------------------------------------------------
// Resume evidence sources
// ---------------------------------------------------------------------------------------------

type Strength = keyof typeof CREDIT;
interface Src {
  section: string;
  text: string;
  strength: Strength;
}

function expText(e: StructuredResume['experience'][number]): string {
  return [e.title ?? '', e.company, ...e.bullets.map((b) => b.text), e.skillsUsed.join(', ')].filter(Boolean).join('\n');
}
function projText(p: StructuredResume['projects'][number]): string {
  return [p.name, p.description ?? '', ...p.bullets, p.technologies.join(', ')].filter(Boolean).join('\n');
}

export function buildSources(resume: StructuredResume): Src[] {
  const out: Src[] = [];
  for (const e of resume.experience) {
    out.push({ section: e.type === 'internship' ? 'internships' : 'experience', text: expText(e), strength: 'demonstrated' });
  }
  for (const p of resume.projects) out.push({ section: 'projects', text: projText(p), strength: 'demonstrated' });
  for (const s of resume.skills) {
    for (const ev of s.evidence) {
      if (/experience|intern|project/i.test(ev.section)) {
        out.push({ section: ev.section, text: ev.snippet, strength: 'demonstrated' });
      }
    }
  }
  if (resume.summary) out.push({ section: 'summary', text: resume.summary, strength: 'claimed' });
  for (const c of resume.certifications) {
    out.push({ section: 'certifications', text: [c.name, c.issuer ?? ''].join(' '), strength: 'claimed' });
  }
  for (const a of resume.achievements) out.push({ section: 'achievements', text: a.text, strength: 'claimed' });
  const list = resume.skills.map((s) => (s.canonical && s.canonical !== s.name ? `${s.name} (${s.canonical})` : s.name));
  if (list.length) out.push({ section: 'skills', text: list.join(', '), strength: 'listed' });
  if (resume.keywords.length) out.push({ section: 'skills', text: resume.keywords.join(', '), strength: 'listed' });
  return out;
}

/** Plain-text rendering of the structured resume (used to verify semantic-assist quotes when no raw text exists). */
export function resumeToText(resume: StructuredResume): string {
  return buildSources(resume)
    .map((s) => s.text)
    .join('\n');
}

interface PoolItem {
  name: string;
  section: string;
  credit: number;
}
function skillPool(resume: StructuredResume): PoolItem[] {
  const pool: PoolItem[] = [];
  for (const s of resume.skills) pool.push({ name: s.canonical || s.name, section: 'skills', credit: CREDIT.listed });
  for (const e of resume.experience) {
    const section = e.type === 'internship' ? 'internships' : 'experience';
    for (const k of e.skillsUsed) pool.push({ name: k, section, credit: CREDIT.demonstrated });
    for (const m of extractKnownSkillsFromText(expText(e))) pool.push({ name: m.skill, section, credit: CREDIT.demonstrated });
  }
  for (const p of resume.projects) {
    for (const k of p.technologies) pool.push({ name: k, section: 'projects', credit: CREDIT.demonstrated });
    for (const m of extractKnownSkillsFromText(projText(p))) pool.push({ name: m.skill, section: 'projects', credit: CREDIT.demonstrated });
  }
  return pool;
}

interface SkillEval {
  name: string;
  level: 'required' | 'preferred';
  credit: number;
  status: 'matched' | 'partial' | 'missing';
  evidence: ResumeEvidence[];
  reason: string;
  similarity?: number;
  listedOnly?: boolean;
  related?: string;
}

function evalSkill(
  name: string,
  level: 'required' | 'preferred',
  sources: Src[],
  pool: PoolItem[],
  overrides: OverrideMap
): SkillEval {
  let best: { credit: number; ev: ResumeEvidence; strength: Strength } | null = null;
  const evidence: ResumeEvidence[] = [];
  for (const src of sources) {
    const m = findSkillInText(src.text, name);
    if (!m) continue;
    const credit = CREDIT[src.strength];
    const ev: ResumeEvidence = { section: src.section, snippet: clip(m.snippet), source: 'parsed' };
    if (!best || credit > best.credit) best = { credit, ev, strength: src.strength };
    if (evidence.length < 2 && !evidence.some((e) => e.section === ev.section)) evidence.push(ev);
  }
  let out: SkillEval;
  if (best) {
    const listedOnly = best.strength === 'listed';
    out = {
      name,
      level,
      credit: best.credit,
      status: 'matched',
      evidence: [best.ev, ...evidence.filter((e) => e !== best!.ev && e.section !== best!.ev.section)].slice(0, 2),
      listedOnly,
      reason: listedOnly
        ? `Listed in the skills section but no usage found in experience or projects (credit ${best.credit}).`
        : best.strength === 'claimed'
          ? `Mentioned in the ${best.ev.section} section (credit ${best.credit}).`
          : `Demonstrated in ${best.ev.section}.`
    };
  } else {
    let bestSim = 0;
    let bestItem: PoolItem | null = null;
    for (const p of pool) {
      const sim = skillsRelated(name, p.name);
      if (sim < 1 && sim >= 0.3 && (sim > bestSim || (sim === bestSim && bestItem && p.credit > bestItem.credit))) {
        bestSim = sim;
        bestItem = p;
      }
    }
    if (bestItem) {
      const credit = Math.min(RELATED_CREDIT_FACTOR, bestSim * RELATED_CREDIT_FACTOR) * bestItem.credit;
      out = {
        name,
        level,
        credit,
        status: 'partial',
        similarity: bestSim,
        related: bestItem.name,
        evidence: [{ section: bestItem.section, snippet: clip(bestItem.name), source: 'derived' }],
        reason: `Not found directly; related skill "${bestItem.name}" gives partial credit (similarity ${bestSim}).`
      };
    } else {
      out = { name, level, credit: 0, status: 'missing', evidence: [], reason: 'No evidence of this skill in the resume.' };
    }
  }
  const ov = overrides[requirementKey('skill', name)];
  return ov ? applyOverride(out, ov) : out;
}

function applyOverride<T extends { credit: number; status: 'matched' | 'partial' | 'missing'; evidence: ResumeEvidence[]; reason: string }>(
  item: T,
  ov: SemanticOverride
): T {
  const credit = ASSIST_CREDIT[ov.status];
  if (credit <= item.credit) return item;
  return { ...item, credit, status: ov.status, evidence: [ov.evidence], reason: ov.reason };
}

const toReq = (type: RequirementResult['type'], e: SkillEval): RequirementResult => ({
  requirement: e.name,
  type,
  level: e.level,
  status: e.status,
  resumeEvidence: e.evidence,
  reason: e.reason,
  ...(e.similarity !== undefined ? { similarity: e.similarity } : {})
});

// ---------------------------------------------------------------------------------------------
// Category scorers
// ---------------------------------------------------------------------------------------------

type Partial5 = Omit<CategoryResult, 'weight' | 'effectiveWeight'>;

const notAssessable = (explanation: string): Partial5 => ({
  score: null,
  explanation,
  deductions: [],
  evidence: [],
  confidence: 'low',
  notAssessable: true
});

interface Ctx {
  resume: StructuredResume;
  jd: ParsedJobDescription;
  sources: Src[];
  overrides: OverrideMap;
  requirements: RequirementResult[];
  uncertainty: string[];
  skillKeys: Set<string>;
}

function jdSkills(jd: ParsedJobDescription): Array<{ name: string; level: 'required' | 'preferred' }> {
  const seen = new Set<string>();
  const out: Array<{ name: string; level: 'required' | 'preferred' }> = [];
  for (const [list, level] of [
    [jd.requiredSkills, 'required'],
    [jd.preferredSkills, 'preferred']
  ] as const) {
    for (const s of list) {
      const name = (s.canonical || s.name).trim();
      const k = canonicalSkillKey(name);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push({ name, level });
    }
  }
  return out;
}

function scoreSkills(ctx: Ctx): Partial5 {
  const skills = jdSkills(ctx.jd);
  if (skills.length === 0) return notAssessable('The job description lists no specific skills to compare against.');
  const pool = skillPool(ctx.resume);
  const evals = skills.map((s) => evalSkill(s.name, s.level, ctx.sources, pool, ctx.overrides));
  let num = 0;
  let den = 0;
  for (const e of evals) {
    const w = e.level === 'required' ? REQUIRED_ITEM_WEIGHT : PREFERRED_ITEM_WEIGHT;
    num += w * e.credit;
    den += w;
    ctx.skillKeys.add(canonicalSkillKey(e.name));
    ctx.requirements.push(toReq('skill', e));
  }
  const score = r1((num / den) * 100);
  const deductions: string[] = [];
  for (const e of evals) {
    if (e.status === 'missing') deductions.push(`Missing ${e.level} skill: ${e.name}`);
    else if (e.status === 'partial' && e.related) deductions.push(`${e.name}: only related skill "${e.related}" found (partial credit)`);
    else if (e.listedOnly) deductions.push(`${e.name} is listed but no usage evidence found (reduced credit)`);
  }
  const matched = evals.filter((e) => e.status === 'matched').length;
  const evidence = evals.flatMap((e) => e.evidence.slice(0, 1)).slice(0, 8);
  const confidence: CategoryResult['confidence'] =
    ctx.jd.completeness === 'vague' || (ctx.resume.skills.length === 0 && ctx.resume.experience.length === 0)
      ? 'low'
      : skills.length >= 3
        ? 'high'
        : 'medium';
  return {
    score,
    explanation: `${matched} of ${evals.length} job skills matched in the resume (required skills count ${REQUIRED_ITEM_WEIGHT}x preferred; skills only listed without usage get ${CREDIT.listed} credit, related skills up to ${RELATED_CREDIT_FACTOR}).`,
    deductions,
    evidence,
    confidence
  };
}

function resumeBlob(ctx: Ctx): string {
  return ctx.sources.map((s) => s.text).join('\n');
}

function scoreKeywords(ctx: Ctx): Partial5 {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const t of [...ctx.jd.domainKeywords, ...ctx.jd.technologies]) {
    const name = t.trim();
    const lk = name.toLowerCase();
    if (!name || seen.has(lk)) continue;
    seen.add(lk);
    // Terms already credited as skills are never counted a second time.
    if (ctx.skillKeys.has(canonicalSkillKey(name))) continue;
    terms.push(name);
  }
  if (terms.length === 0) {
    return notAssessable('No domain keywords beyond the skills already scored were found in the job description.');
  }
  const blob = resumeBlob(ctx);
  const blobTokens = tokenSet(blob);
  let total = 0;
  const evidence: ResumeEvidence[] = [];
  const missing: string[] = [];
  for (const term of terms) {
    let credit = 0;
    let status: RequirementResult['status'] = 'missing';
    let ev: ResumeEvidence[] = [];
    let reason = 'Keyword not found in the resume.';
    const hit = findTerm(blob, term);
    if (hit) {
      credit = 1;
      status = 'matched';
      ev = [{ section: 'resume', snippet: clip(hit.snippet), source: 'parsed' }];
      reason = 'Keyword found in the resume.';
    } else {
      const tk = uniq(tokens(term));
      if (tk.length >= 2 && tk.every((t) => blobTokens.has(t))) {
        credit = 0.5;
        status = 'partial';
        reason = 'All words of this phrase appear in the resume, but not as one phrase (half credit).';
      }
    }
    const ov = ctx.overrides[requirementKey('keyword', term)];
    const item = ov ? applyOverride({ credit, status, evidence: ev, reason }, ov) : { credit, status, evidence: ev, reason };
    total += item.credit;
    if (item.evidence.length && evidence.length < 6) evidence.push(item.evidence[0]!);
    if (item.status === 'missing') missing.push(term);
    ctx.requirements.push({
      requirement: term,
      type: 'keyword',
      level: 'preferred',
      status: item.status,
      resumeEvidence: item.evidence,
      reason: item.reason
    });
  }
  return {
    score: r1((total / terms.length) * 100),
    explanation: `Coverage of ${terms.length} remaining domain keywords/technologies (word-boundary matching; terms already scored as skills excluded; repetition does not add credit).`,
    deductions: missing.map((m) => `Keyword not found: ${m}`),
    evidence,
    confidence: terms.length >= 5 ? 'high' : terms.length >= 2 ? 'medium' : 'low'
  };
}

// ---- dates / experience ----

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function parseMonthIndex(s?: string | null): number | null {
  if (!s) return null;
  const t = s.toLowerCase();
  if (/present|current|now|ongoing/.test(t)) return null;
  const y = /\b(19|20)\d{2}\b/.exec(t);
  if (!y) return null;
  const year = Number(y[0]);
  const mName = MONTHS.findIndex((m) => new RegExp(`\\b${m}`).test(t));
  const mNum = /\b(0?[1-9]|1[0-2])\s*[\/\-.]\s*(19|20)\d{2}\b/.exec(t);
  const month = mName >= 0 ? mName : mNum ? Number(mNum[1]) - 1 : 0;
  return year * 12 + month;
}

function internshipMonths(resume: StructuredResume): number {
  let m = 0;
  for (const e of resume.experience) {
    if (e.type !== 'internship') continue;
    const a = parseMonthIndex(e.startDate);
    const b = parseMonthIndex(e.endDate);
    if (a !== null && b !== null && b >= a) m += b - a + 1;
  }
  return m;
}

function scoreExperience(ctx: Ctx): Partial5 {
  const { jd, resume } = ctx;
  const reqs = jd.experienceRequirements;
  const requiredYears = reqs.filter((r) => r.required && (r.minYears ?? 0) > 0).map((r) => r.minYears as number);
  const prefYears = reqs.filter((r) => !r.required && (r.minYears ?? 0) > 0).map((r) => r.minYears as number);
  const minYears = requiredYears.length ? Math.max(...requiredYears) : prefYears.length ? Math.max(...prefYears) : 0;
  const yearsLevel: 'required' | 'preferred' = requiredYears.length ? 'required' : 'preferred';

  const titleTokens = uniq(tokens([jd.jobTitle, ...reqs.map((r) => r.area ?? '')].join(' ')));
  const responsibilities = jd.responsibilities.slice(0, 15);

  if (minYears === 0 && titleTokens.length === 0 && responsibilities.length === 0) {
    return notAssessable('The job description has no experience requirement, title or responsibilities to compare.');
  }

  // Alignment: title overlap + responsibilities coverage (experience counts fully, projects at 0.8).
  const expTokens = new Set<string>();
  for (const e of resume.experience) tokenSet(expText(e)).forEach((t) => expTokens.add(t));
  const projTokens = new Set<string>();
  for (const p of resume.projects) tokenSet(projText(p)).forEach((t) => projTokens.add(t));

  let title: number | null = null;
  if (titleTokens.length) {
    title = 0;
    for (const e of resume.experience) {
      const have = tokenSet(e.title ?? '');
      title = Math.max(title, titleTokens.filter((t) => have.has(t)).length / titleTokens.length);
    }
  }
  let resp: number | null = null;
  const respEvidence: ResumeEvidence[] = [];
  if (responsibilities.length) {
    let sum = 0;
    for (const r of responsibilities) {
      const tk = uniq(tokens(r));
      if (tk.length < 2) continue;
      const inExp = tk.filter((t) => expTokens.has(t)).length / tk.length;
      const inProj = (tk.filter((t) => projTokens.has(t)).length / tk.length) * 0.8;
      sum += clamp01(Math.max(inExp, inProj) / 0.6);
    }
    const n = responsibilities.filter((r) => uniq(tokens(r)).length >= 2).length;
    resp = n ? sum / n : null;
  }
  const alignParts: Array<[number, number]> = [];
  if (title !== null) alignParts.push([title, 0.35]);
  if (resp !== null) alignParts.push([resp, 0.65]);
  const alignment = alignParts.length
    ? alignParts.reduce((a, [v, w]) => a + v * w, 0) / alignParts.reduce((a, [, w]) => a + w, 0)
    : null;

  for (const e of resume.experience.slice(0, 2)) {
    if (e.title) respEvidence.push({ section: e.type === 'internship' ? 'internships' : 'experience', snippet: clip(`${e.title} at ${e.company}`), source: 'parsed' });
  }

  const deductions: string[] = [];
  const evidence = respEvidence;
  let confidence: CategoryResult['confidence'] = jd.completeness === 'vague' ? 'low' : 'high';

  let yearsScore: number | null = null;
  const est = resume.totalExperienceMonthsEstimate ?? null;
  let effYears: number | null = null;
  if (minYears > 0) {
    if (est === null) {
      ctx.uncertainty.push('Total years of experience could not be determined from the resume dates; the experience score uses title/responsibility alignment only.');
      confidence = 'low';
    } else {
      const intern = internshipMonths(resume);
      const effMonths = intern > 0 && intern <= est ? est - 0.5 * intern : est;
      effYears = effMonths / 12;
      const ratio = clamp01(effYears / minYears);
      yearsScore = alignment === null ? ratio : ratio * (0.4 + 0.6 * alignment);
      if (ratio < 1) deductions.push(`About ${r1(effYears)} years of experience (internships count half) vs ${minYears} ${yearsLevel === 'required' ? 'required' : 'preferred'}`);
      if (alignment !== null && alignment < 0.5 && ratio > 0) deductions.push('Years of experience count less because the roles look weakly related to this job');
      ctx.requirements.push({
        requirement: `${minYears}+ years of experience`,
        type: 'experience',
        level: yearsLevel,
        status: ratio >= 1 && (alignment ?? 1) >= 0.5 ? 'matched' : ratio > 0 ? 'partial' : 'missing',
        resumeEvidence: [{ section: 'experience', snippet: `~${r1(effYears)} years estimated from resume dates`, source: 'derived' }],
        reason: `Resume shows about ${r1(effYears)} effective years vs ${minYears} needed.`
      });
    }
  }
  if (alignment !== null && alignment < 0.4) deductions.push('Few job responsibilities/title terms appear in the resume experience');
  if (resume.experience.length === 0) {
    confidence = 'low';
    ctx.uncertainty.push('No work experience entries were found in the resume.');
  }

  const comps: Array<[number, number]> = [];
  if (yearsScore !== null) comps.push([yearsScore, 0.5]);
  if (alignment !== null) comps.push([alignment, 0.5]);
  if (comps.length === 0) {
    return { ...notAssessable('Experience could not be compared with the available information.'), deductions };
  }
  const score = r1((comps.reduce((a, [v, w]) => a + v * w, 0) / comps.reduce((a, [, w]) => a + w, 0)) * 100);
  return {
    score,
    explanation:
      `Years of experience (${minYears > 0 ? `${minYears}+ wanted` : 'none specified'}) weighed 50/50 with title and responsibility alignment` +
      (est === null && minYears > 0 ? '; years unknown so alignment only' : '') +
      '.',
    deductions,
    evidence,
    confidence
  };
}

// ---- education ----

const LEVELS: Array<[RegExp, number]> = [
  [/\b(ph\.?\s?d|doctorate|doctoral)\b/i, 5],
  [/\b(m\.?\s?tech|m\.?\s?sc|m\.?\s?eng|m\.?\s?s\b|m\.?\s?a\b|mba|masters?|master's|postgraduate)\b/i, 4],
  [/\b(b\.?\s?tech|b\.?\s?e\b|b\.?\s?sc|b\.?\s?s\b|b\.?\s?a\b|b\.?\s?eng|bca|bachelors?|bachelor's|undergraduate|graduate degree|degree)\b/i, 3],
  [/\b(diploma|associate|a\.?\s?a\.?s)\b/i, 2],
  [/\b(high school|secondary|12th|hsc|ged)\b/i, 1]
];
export function parseDegreeLevel(text?: string | null): number | null {
  if (!text) return null;
  for (const [re, rank] of LEVELS) if (re.test(text)) return rank;
  return null;
}
const LEVEL_NAME = ['', 'high school', 'diploma/associate', "bachelor's", "master's", 'PhD'];

const FIELD_GROUPS: string[][] = [
  ['computer science', 'software engineering', 'information technology', 'computer engineering', 'information systems', 'computer applications', 'informatics', 'it', 'cse', 'computing', 'data science', 'artificial intelligence'],
  ['electrical engineering', 'electronics', 'electronics engineering', 'electrical and electronics', 'ece', 'eee'],
  ['mechanical engineering', 'mechanical', 'industrial engineering'],
  ['business administration', 'business', 'management', 'commerce', 'finance', 'economics'],
  ['mathematics', 'statistics', 'applied mathematics', 'physics']
];
function fieldScore(reqField: string, haveText: string): number {
  const a = reqField.toLowerCase();
  const b = haveText.toLowerCase();
  const rt = uniq(tokens(a));
  const ht = tokenSet(b);
  if (rt.length && rt.filter((t) => ht.has(t)).length / rt.length >= 0.5) return 1;
  const inGroup = (txt: string, g: string[]) => g.some((f) => new RegExp(`(?<![a-z])${f}(?![a-z])`).test(txt));
  for (const g of FIELD_GROUPS) if (inGroup(a, g) && inGroup(b, g)) return 1;
  return 0.3;
}

function scoreEducation(ctx: Ctx): Partial5 {
  const { jd, resume } = ctx;
  const required = jd.educationRequirements.filter((e) => e.required);
  const reqs = required.length ? required : jd.educationRequirements;
  const level: 'required' | 'preferred' = required.length ? 'required' : 'preferred';
  const usable = reqs
    .map((r) => ({
      raw: r,
      rank: parseDegreeLevel(r.level) ?? parseDegreeLevel(r.evidence),
      field: (r.field ?? '').trim()
    }))
    .filter((r) => r.rank !== null || r.field);
  if (usable.length === 0) {
    return notAssessable('The job description has no education requirement, so this category is not scored and its weight is redistributed.');
  }
  if (resume.education.length === 0) {
    ctx.uncertainty.push('No education entries were found in the resume, so the education match is uncertain.');
    for (const r of usable) {
      ctx.requirements.push({
        requirement: [r.rank ? LEVEL_NAME[r.rank] : '', r.field].filter(Boolean).join(' in ') || 'Education',
        type: 'education',
        level,
        status: 'missing',
        resumeEvidence: [],
        reason: 'No education information found in the resume.'
      });
    }
    return { score: 0, explanation: 'Education requirement present but the resume lists no education.', deductions: ['No education found in resume'], evidence: [], confidence: 'low' };
  }
  const ranks = resume.education.map((e) => parseDegreeLevel(e.degree));
  const known = ranks.filter((x): x is number => x !== null);
  const haveRank = known.length ? Math.max(...known) : null;
  const evidence: ResumeEvidence[] = resume.education.slice(0, 2).map((e) => ({
    section: 'education',
    snippet: clip([e.degree, e.field, e.institution].filter(Boolean).join(', ')),
    source: 'parsed'
  }));
  const deductions: string[] = [];
  let lowConf = false;
  const scores: number[] = [];
  for (const r of usable) {
    const parts: Array<[number, number]> = [];
    if (r.rank !== null) {
      if (haveRank === null) {
        lowConf = true;
      } else {
        const v = haveRank >= r.rank ? 1 : haveRank === r.rank - 1 ? 0.5 : 0.15;
        parts.push([v, 0.6]);
        if (v < 1) deductions.push(`Highest degree found is ${LEVEL_NAME[haveRank]}; ${LEVEL_NAME[r.rank]} ${level === 'required' ? 'required' : 'preferred'}`);
      }
    }
    if (r.field) {
      const best = Math.max(...resume.education.map((e) => fieldScore(r.field, `${e.field ?? ''} ${e.degree ?? ''}`)));
      parts.push([best, 0.4]);
      if (best < 1) deductions.push(`Field of study differs from ${r.field}`);
    }
    const v = parts.length ? parts.reduce((a, [x, w]) => a + x * w, 0) / parts.reduce((a, [, w]) => a + w, 0) : null;
    const name = [r.rank ? LEVEL_NAME[r.rank] : '', r.field].filter(Boolean).join(' in ') || 'Education';
    if (v !== null) scores.push(v);
    ctx.requirements.push({
      requirement: name,
      type: 'education',
      level,
      status: v === null ? 'partial' : v >= 0.95 ? 'matched' : v >= 0.4 ? 'partial' : 'missing',
      resumeEvidence: evidence,
      reason: v === null ? 'Degree level could not be determined from the resume.' : `Education comparison scored ${r1(v * 100)}/100.`
    });
  }
  if (scores.length === 0) {
    ctx.uncertainty.push('The degree level in the resume could not be determined, so the education match is uncertain.');
    return { score: 50, explanation: 'Degree level could not be determined from the resume; neutral estimate.', deductions, evidence, confidence: 'low' };
  }
  if (lowConf) ctx.uncertainty.push('Some education requirements could not be compared because the degree level is unclear in the resume.');
  return {
    score: r1((scores.reduce((a, b) => a + b, 0) / scores.length) * 100),
    explanation: 'Degree level (60%) and field of study (40%) compared with the job requirement.',
    deductions,
    evidence,
    confidence: lowConf ? 'low' : 'high'
  };
}

// ---- projects ----

function scoreProjects(ctx: Ctx): Partial5 {
  const { jd, resume } = ctx;
  const skills = jdSkills(jd);
  const responsibilities = jd.responsibilities.slice(0, 15);
  if (skills.length === 0 && responsibilities.length === 0) {
    return notAssessable('The job description has no skills or responsibilities to relate projects to.');
  }
  if (resume.projects.length === 0) {
    ctx.uncertainty.push('The resume lists no projects, so project relevance is not scored and its weight is redistributed.');
    return notAssessable('The resume lists no projects; this category is not scored and its weight is redistributed.');
  }
  const scored = resume.projects.map((p) => {
    const text = projText(p);
    const ptokens = tokenSet(text);
    const techPool: PoolItem[] = [
      ...p.technologies.map((t) => ({ name: t, section: 'projects', credit: 1 })),
      ...extractKnownSkillsFromText(text).map((m) => ({ name: m.skill, section: 'projects', credit: 1 }))
    ];
    let skillCov: number | null = null;
    if (skills.length) {
      let num = 0;
      let den = 0;
      for (const s of skills) {
        const w = s.level === 'required' ? REQUIRED_ITEM_WEIGHT : PREFERRED_ITEM_WEIGHT;
        den += w;
        if (findSkillInText(text, s.name)) num += w;
        else {
          const sim = Math.max(0, ...techPool.map((t) => skillsRelated(s.name, t.name)));
          if (sim >= 0.3 && sim < 1) num += w * sim * RELATED_CREDIT_FACTOR;
        }
      }
      skillCov = clamp01(num / den / 0.6); // covering ~60% of the JD skills in one project is highly relevant
    }
    let respCov: number | null = null;
    if (responsibilities.length) {
      const vals = responsibilities
        .map((r) => uniq(tokens(r)))
        .filter((tk) => tk.length >= 2)
        .map((tk) => clamp01(tk.filter((t) => ptokens.has(t)).length / tk.length / 0.6));
      respCov = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    const parts: Array<[number, number]> = [];
    if (skillCov !== null) parts.push([skillCov, 0.7]);
    if (respCov !== null) parts.push([respCov, 0.3]);
    const rel = parts.length ? parts.reduce((a, [v, w]) => a + v * w, 0) / parts.reduce((a, [, w]) => a + w, 0) : 0;
    return { project: p, rel };
  });
  const sorted = [...scored].sort((a, b) => b.rel - a.rel);
  const top = sorted.slice(0, 3);
  const score = r1((0.6 * top[0]!.rel + 0.4 * (top.reduce((a, b) => a + b.rel, 0) / top.length)) * 100);
  const evidence: ResumeEvidence[] = top
    .filter((t) => t.rel > 0)
    .slice(0, 2)
    .map((t) => ({ section: 'projects', snippet: clip(`${t.project.name}${t.project.technologies.length ? ` (${t.project.technologies.slice(0, 6).join(', ')})` : ''}`), source: 'parsed' }));
  const deductions: string[] = [];
  if (top[0]!.rel < 0.5) deductions.push('No project closely matches the job skills or responsibilities');
  return {
    score,
    explanation: `Relevance of ${resume.projects.length} project(s) to the job's required skills and responsibilities (best project 60%, top-3 average 40%).`,
    deductions,
    evidence,
    confidence: resume.projects.length >= 2 ? 'medium' : 'low'
  };
}

// ---------------------------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------------------------

function qualificationRequirements(ctx: Ctx): void {
  const blob = resumeBlob(ctx);
  const blobTokens = tokenSet(blob);
  for (const q of ctx.jd.minimumQualifications.slice(0, 15)) {
    const tk = uniq(tokens(q));
    if (tk.length < 2) continue;
    const frac = tk.filter((t) => blobTokens.has(t)).length / tk.length;
    const status = frac >= 0.7 ? 'matched' : frac >= 0.4 ? 'partial' : 'missing';
    ctx.requirements.push({
      requirement: clip(q, 160),
      type: 'qualification',
      level: 'required',
      status,
      resumeEvidence: [],
      reason: `${Math.round(frac * 100)}% of this qualification's key terms appear in the resume (informational; not separately scored).`
    });
  }
}

export class MatchingEngine {
  /** Pure and deterministic: identical inputs always give an identical result. */
  static score(resume: StructuredResume, jd: ParsedJobDescription, options: ScoreOptions = {}): MatchResult {
    const weights = normalizeWeights({ ...defaultWeights(), ...(options.weights ?? {}) });
    const ctx: Ctx = {
      resume,
      jd,
      sources: buildSources(resume),
      overrides: options.overrides ?? {},
      requirements: [],
      uncertainty: [],
      skillKeys: new Set()
    };

    const raw: Record<CategoryName, Partial5> = {
      skills: scoreSkills(ctx),
      experience: scoreExperience(ctx),
      keywords: scoreKeywords(ctx),
      education: scoreEducation(ctx),
      projects: scoreProjects(ctx)
    };
    qualificationRequirements(ctx);

    const assessable = CATEGORY_NAMES.filter((c) => raw[c].score !== null && weights[c] > 0);
    const wSum = assessable.reduce((a, c) => a + weights[c], 0);
    const categories = {} as MatchResult['categories'];
    let overall = 0;
    for (const c of CATEGORY_NAMES) {
      const eff = assessable.includes(c) && wSum > 0 ? weights[c] / wSum : 0;
      const effR = Math.round(eff * 1e6) / 1e6;
      categories[c] = { ...raw[c], weight: weights[c], effectiveWeight: effR } as CategoryResult;
      if (raw[c].score !== null) overall += eff * (raw[c].score as number);
      if (raw[c].notAssessable) ctx.uncertainty.push(`${c[0]!.toUpperCase()}${c.slice(1)}: ${raw[c].explanation}`);
      else if (raw[c].confidence === 'low') ctx.uncertainty.push(`${c[0]!.toUpperCase()}${c.slice(1)} score has low confidence.`);
    }
    if (assessable.length === 0) ctx.uncertainty.push('No category could be assessed; overall score defaults to 0.');
    if (jd.completeness !== 'complete') {
      ctx.uncertainty.push(
        jd.completeness === 'vague'
          ? 'The job description is vague; scores may not reflect the real requirements.'
          : 'The job description is only partially specified; scores may miss unstated requirements.'
      );
    }
    if (jd.parseWarnings.some((w) => /legacy/i.test(w))) {
      ctx.uncertainty.push('This job description was not AI-parsed; requirements come from its manually entered fields.');
    }
    for (const n of jd.ambiguityNotes.slice(0, 3)) ctx.uncertainty.push(`JD ambiguity: ${n}`);

    const reqs = ctx.requirements;
    const requirements = {
      matched: reqs.filter((r) => r.status === 'matched'),
      partial: reqs.filter((r) => r.status === 'partial'),
      missing: reqs.filter((r) => r.status === 'missing')
    };

    const strengths: string[] = [];
    const matchedSkills = requirements.matched.filter((r) => r.type === 'skill' && r.level === 'required' && r.resumeEvidence[0] && r.resumeEvidence[0].section !== 'skills');
    for (const r of matchedSkills.slice(0, 5)) strengths.push(`Demonstrates ${r.requirement} (${r.resumeEvidence[0]!.section})`);
    for (const c of CATEGORY_NAMES) {
      const s = categories[c].score;
      if (s !== null && s >= 80) strengths.push(`Strong ${c} alignment (${s}/100)`);
    }
    const weaknesses: string[] = [];
    for (const r of requirements.missing.filter((x) => x.type === 'skill' && x.level === 'required').slice(0, 8)) {
      weaknesses.push(`Missing required skill: ${r.requirement}`);
    }
    for (const c of CATEGORY_NAMES) {
      const s = categories[c].score;
      if (s !== null && s < 50) weaknesses.push(`Weak ${c} alignment (${s}/100)`);
    }

    return {
      scoringVersion: SCORING_VERSION,
      estimatedLabel: MATCH_LABEL,
      overallScore: r1(Math.max(0, Math.min(100, overall))),
      weights,
      categories,
      requirements,
      uncertainty: uniq(ctx.uncertainty),
      strengths,
      weaknesses,
      semanticAssist: { used: false, model: null, promptVersion: 'match-assist-v1' },
      disclaimer: MATCH_DISCLAIMER
    };
  }
}

