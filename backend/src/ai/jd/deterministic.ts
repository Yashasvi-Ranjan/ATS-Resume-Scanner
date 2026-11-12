import { extractKnownSkillsFromText } from '../skills';
import type {
  JdEducationRequirement,
  JdExperienceRequirement,
  JdSkill
} from '../schemas/jobDescription.schema';

export type SectionKind = 'required' | 'preferred' | 'responsibilities' | 'other' | 'none';

export interface LineInfo {
  start: number;
  end: number;
  text: string;
  section: SectionKind;
  isHeader: boolean;
}

const PREFERRED_CUE = /\b(nice[- ]to[- ]haves?|preferred|preferably|bonus|a plus|is a plus|are a plus|good to have|desirable|desired|would be (?:a )?(?:plus|great|nice|an advantage)|advantageous|an advantage|ideally)\b|\bplus\b(?=\s*[:.,;)]|\s*$)/i;
const REQUIRED_HEADER = /^(?:(?:minimum|basic|required|key|core|essential)\s+)?(?:requirements?|qualifications?|skills?|experience)(?:\s+(?:and|&)\s+\w+)?$|^must[- ]haves?$|^what (?:you(?:'|’)ll|you will|you) (?:need|bring|have)$|^what we(?:'|’)re looking for$|^who you are$|^you have$|^about you$|^requirements? (?:and|&) qualifications?$|^skills? (?:and|&) (?:experience|qualifications?)$/i;
const PREFERRED_HEADER = /(nice[- ]to[- ]haves?|preferred|bonus|good to have|desirable|a plus|pluses)/i;
const RESP_HEADER = /^(?:key\s+)?(?:responsibilities|duties|what you(?:'|’)ll do|what you will do|the role|your role|role overview|day[- ]to[- ]day|in this role)$/i;
const OTHER_HEADER = /^(?:about (?:us|the company|the team)|benefits|perks|what we offer|compensation|salary|why join us|equal opportunity.*|how to apply)$/i;

function headerKind(raw: string): SectionKind | null {
  const t = raw.trim().replace(/^[#*\-•\s]+|[\s*:]+$/g, '').trim();
  if (!t || t.length > 70 || t.split(/\s+/).length > 9) return null;
  const hadColon = /:\s*$/.test(raw.trim());
  if (PREFERRED_HEADER.test(t) && (hadColon || t.split(/\s+/).length <= 5)) return 'preferred';
  if (REQUIRED_HEADER.test(t)) return 'required';
  if (RESP_HEADER.test(t)) return 'responsibilities';
  if (OTHER_HEADER.test(t)) return 'other';
  return null;
}

/** Split text into lines annotated with the section they belong to. */
export function analyzeLines(text: string): LineInfo[] {
  const lines: LineInfo[] = [];
  let section: SectionKind = 'none';
  let pos = 0;
  for (const raw of text.split('\n')) {
    const start = pos;
    pos += raw.length + 1;
    const kind = headerKind(raw);
    if (kind) {
      section = kind;
      lines.push({ start, end: start + raw.length, text: raw, section, isHeader: true });
    } else {
      lines.push({ start, end: start + raw.length, text: raw, section, isHeader: false });
    }
  }
  return lines;
}

export function lineAt(lines: LineInfo[], index: number): LineInfo | undefined {
  return lines.find((l) => index >= l.start && index <= l.end);
}

export function hasPreferredCue(s: string): boolean {
  return PREFERRED_CUE.test(s);
}

export interface SkillHint {
  skill: string;
  category?: string;
  snippet: string;
  /** 'required' / 'preferred' only when decided by an explicit cue; otherwise 'unknown'. */
  level: 'required' | 'preferred' | 'unknown';
  inResponsibilities: boolean;
}

export interface DeterministicResult {
  lines: LineInfo[];
  hasSections: boolean;
  skills: SkillHint[];
  experience: JdExperienceRequirement[];
  education: JdEducationRequirement[];
  seniority?: string;
}

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15
};
const NUM = '(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen)';
const toNum = (s: string): number => (/^\d/.test(s) ? parseInt(s, 10) : NUM_WORDS[s.toLowerCase()]);

const RANGE_RE = new RegExp(`\\b${NUM}\\s*(?:-|–|—|to)\\s*${NUM}\\s*\\+?\\s*(?:years?|yrs?)\\b`, 'gi');
const MIN_RE = new RegExp(
  `\\b(?:(?:at least|minimum(?: of)?|min\\.?|over|more than)\\s+)?${NUM}\\s*(\\+)?\\s*(?:years?|yrs?)\\b`,
  'gi'
);

function sentenceAround(text: string, start: number, end: number): string {
  let s = start;
  let e = end;
  while (s > 0 && !/[\n.;]/.test(text[s - 1]) && start - s < 160) s--;
  while (e < text.length && !/[\n.;]/.test(text[e]) && e - end < 160) e++;
  return text.slice(s, e).replace(/\s+/g, ' ').trim().replace(/^[-•*\s]+/, '');
}

function extractExperience(text: string, lines: LineInfo[]): JdExperienceRequirement[] {
  const out: JdExperienceRequirement[] = [];
  const used: Array<[number, number]> = [];
  const push = (min: number, max: number | undefined, start: number, end: number) => {
    if (!(min >= 0 && min <= 60)) return;
    const line = lineAt(lines, start);
    const evidence = sentenceAround(text, start, end);
    const preferred = (line && (line.section === 'preferred' || hasPreferredCue(line.text))) || hasPreferredCue(evidence);
    if (out.some((o) => o.minYears === min && o.maxYears === max && o.evidence === evidence)) return;
    out.push({ minYears: min, ...(max !== undefined ? { maxYears: max } : {}), required: !preferred, evidence });
  };
  let m: RegExpExecArray | null;
  RANGE_RE.lastIndex = 0;
  while ((m = RANGE_RE.exec(text))) {
    used.push([m.index, m.index + m[0].length]);
    push(toNum(m[1]), toNum(m[2]), m.index, m.index + m[0].length);
  }
  MIN_RE.lastIndex = 0;
  while ((m = MIN_RE.exec(text))) {
    if (used.some(([s, e]) => m!.index >= s && m!.index < e)) continue;
    // Only count "N years" that talk about experience, not e.g. "5 years old" or "within 2 years".
    const around = text.slice(m.index, m.index + m[0].length + 60).toLowerCase();
    if (!/(experience|exp\b|background|working|work|professional|developing|engineering|in\b|of\b)/.test(around)) continue;
    push(toNum(m[1]), undefined, m.index, m.index + m[0].length);
  }
  return out;
}

const DEGREE_RE = /\b(ph\.?d\.?|doctorate|doctoral|master(?:'|’)?s|m\.?sc?\.?|m\.?s\.?(?=\s+(?:in|degree))|mba|bachelor(?:'|’)?s|b\.?sc?\.?|b\.?s\.?(?=\s+(?:in|degree))|b\.?tech|b\.?e\.?(?=\s+(?:in|degree))|associate(?:'|’)?s|high school(?: diploma)?|diploma|ged|degree)\b/gi;

function degreeLevel(s: string): string {
  const t = s.toLowerCase().replace(/[.'’]/g, '');
  if (/^(phd|doctorate|doctoral)$/.test(t)) return 'PhD';
  if (/^(masters|msc|ms|mba)$/.test(t)) return 'Master';
  if (/^(bachelors|bsc|bs|btech|be)$/.test(t)) return 'Bachelor';
  if (/^associates$/.test(t)) return 'Associate';
  if (/^(high school|high school diploma|ged)$/.test(t)) return 'High school';
  if (t === 'diploma') return 'Diploma';
  return 'Degree';
}

function extractEducation(text: string, lines: LineInfo[]): JdEducationRequirement[] {
  const out: JdEducationRequirement[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  DEGREE_RE.lastIndex = 0;
  while ((m = DEGREE_RE.exec(text))) {
    const evidence = sentenceAround(text, m.index, m.index + m[0].length);
    if (seen.has(evidence)) continue;
    seen.add(evidence);
    const level = degreeLevel(m[1]);
    const rest = text.slice(m.index + m[0].length, m.index + m[0].length + 120);
    const f = /^\s*(?:degree\s+)?(?:in|of)\s+([A-Za-z][A-Za-z &/-]{2,60}?)(?=\s*(?:,|;|\.|\bor\b|\band\b|\(|\n|$))/.exec(rest);
    const line = lineAt(lines, m.index);
    const preferred = (line && (line.section === 'preferred' || hasPreferredCue(line.text))) || hasPreferredCue(evidence);
    out.push({ level, ...(f ? { field: f[1].trim() } : {}), required: !preferred, evidence });
  }
  // Collapse several matches within the same sentence into the first.
  return out;
}

const SENIORITY: Array<[RegExp, string]> = [
  [/\b(intern(?:ship)?|trainee)\b/i, 'intern'],
  [/\b(entry[- ]level|junior|jr\.?|graduate|new grad)\b/i, 'junior'],
  [/\b(principal|distinguished)\b/i, 'principal'],
  [/\bstaff\b/i, 'staff'],
  [/\b(lead|team lead|tech lead)\b/i, 'lead'],
  [/\b(senior|sr\.?)\b/i, 'senior'],
  [/\b(director|head of|vp|vice president)\b/i, 'director'],
  [/\bmanager\b/i, 'manager'],
  [/\b(mid[- ]level|intermediate)\b/i, 'mid']
];

export function detectSeniority(title: string, text: string): string | undefined {
  for (const src of [title, text.slice(0, 400)]) {
    for (const [re, label] of SENIORITY) if (re.test(src)) return label;
  }
  return undefined;
}

export function runDeterministicPass(text: string, title = ''): DeterministicResult {
  const lines = analyzeLines(text);
  const hasSections = lines.some((l) => l.isHeader && (l.section === 'required' || l.section === 'preferred'));
  const skills: SkillHint[] = extractKnownSkillsFromText(text).map((m) => {
    const line = lineAt(lines, m.index);
    const section = line?.section ?? 'none';
    let level: SkillHint['level'] = 'unknown';
    if (line && hasPreferredCue(line.text)) level = 'preferred';
    else if (section === 'preferred') level = 'preferred';
    else if (section === 'required') level = 'required';
    else if (!hasSections) level = 'unknown';
    return {
      skill: m.skill,
      category: m.category,
      snippet: m.snippet,
      level,
      inResponsibilities: section === 'responsibilities'
    };
  });
  return {
    lines,
    hasSections,
    skills,
    experience: extractExperience(text, lines),
    education: extractEducation(text, lines),
    seniority: detectSeniority(title, text)
  };
}

export type { JdSkill };
