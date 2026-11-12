import { SectionName } from '../schemas/resume.schema';

// ---------- verification helpers (anti-fabrication) ----------

/** Lowercase, keep only letters/digits/+/#: whitespace, punctuation and hyphenation differences vanish. */
export function squash(s: string): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9+#À-￿]+/g, '');
}

export function collapseWs(s: string): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Index of snippet in text (whitespace-tolerant, case-insensitive) with the matched original slice; null if absent. */
export function locate(text: string, snippet: string): { index: number; slice: string } | null {
  const words = collapseWs(snippet).slice(0, 400).split(' ').filter(Boolean);
  if (words.length === 0) return null;
  const re = new RegExp(words.map(escapeRe).join('\\s+'), 'i');
  const m = re.exec(text);
  return m ? { index: m.index, slice: m[0] } : null;
}

export interface TextIndex {
  text: string;
  squashed: string;
}

export function indexText(text: string): TextIndex {
  return { text, squashed: squash(text) };
}

/** True when `value` appears in the text, verbatim up to case/whitespace/punctuation. */
export function isPresent(idx: TextIndex, value: string | null | undefined): boolean {
  if (!value) return false;
  const sq = squash(value);
  if (sq.length < 2) return locate(idx.text, value) !== null;
  return idx.squashed.includes(sq);
}

/** Verbatim-checked snippet: returns the collapsed original slice, or null when not in the text. */
export function verifiedSnippet(idx: TextIndex, snippet: string | null | undefined): string | null {
  if (!snippet || squash(snippet).length < 2) return null;
  const loc = locate(idx.text, snippet);
  if (loc) return collapseWs(loc.slice).slice(0, 400);
  return null;
}

// ---------- sections ----------

const HEADERS: Array<[SectionName, RegExp]> = [
  ['summary', /^(professional\s+)?(summary|profile|objective|career\s+objective|about(\s+me)?|professional\s+profile)$/i],
  ['skills', /^((technical|key|core|relevant)\s+)?(skills|competencies|technologies|tech\s+stack|skills\s*(&|and)\s*tools|technical\s+proficiency|areas\s+of\s+expertise)$/i],
  ['experience', /^((professional|work|relevant|employment)\s+)?(experience|work\s+history|employment(\s+history)?)$/i],
  ['internships', /^internships?(\s+experience)?$/i],
  ['projects', /^((academic|personal|key|selected|technical)\s+)?projects?$/i],
  ['education', /^(education(al)?(\s+(background|qualifications?))?|academic(s|\s+background|\s+qualifications?)|qualifications?)$/i],
  ['certifications', /^(certifications?|licenses?(\s*(&|and)\s*certifications?)?|certificates?|courses|training)$/i],
  ['achievements', /^(achievements?|awards?(\s*(&|and)\s*honou?rs)?|honou?rs|accomplishments?|extra[\s-]?curricular(\s+activities)?|activities|leadership)$/i]
];

export interface SectionRange {
  name: SectionName;
  start: number; // offset of header line
  end: number;
}

export function detectSections(text: string): SectionRange[] {
  const found: Array<{ name: SectionName; start: number }> = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    const cleaned = line.trim().replace(/[:\-–—_=*#|]+$/g, '').replace(/^[:\-–—_=*#|\s]+/, '').trim();
    if (cleaned.length > 0 && cleaned.length <= 45) {
      for (const [name, re] of HEADERS) {
        if (re.test(cleaned)) {
          found.push({ name, start: offset });
          break;
        }
      }
    }
    offset += line.length + 1;
  }
  return found.map((f, i) => ({ name: f.name, start: f.start, end: found[i + 1]?.start ?? text.length }));
}

export function sectionAt(ranges: SectionRange[], index: number): SectionName {
  if (index < 0) return 'other';
  const r = ranges.find((x) => index >= x.start && index < x.end);
  if (r) return r.name;
  return ranges.length === 0 || index < ranges[0].start ? 'contact' : 'other';
}

// ---------- contact ----------

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
const PHONE_RE = /(?<![\w.])(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{2,4}[\s.-])?\d{3,5}[\s.-]?\d{3,5}(?![\w])/g;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>()",;]+|\b(?:linkedin\.com|github\.com|gitlab\.com|bitbucket\.org)\/[^\s<>()",;]+/gi;

export function extractEmail(text: string): string | null {
  return EMAIL_RE.exec(text)?.[0] ?? null;
}

export function extractPhone(text: string): string | null {
  const head = text.slice(0, 1500);
  PHONE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PHONE_RE.exec(head)) !== null) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15 && !/^(19|20)\d{2}[\s.-]?(19|20)\d{2}$/.test(m[0].trim())) {
      return m[0].trim();
    }
  }
  return null;
}

export type LinkType = 'linkedin' | 'github' | 'portfolio' | 'other';

export function extractLinks(text: string): Array<{ url: string; type: LinkType }> {
  const out: Array<{ url: string; type: LinkType }> = [];
  const seen = new Set<string>();
  const emailHosts = new Set<string>();
  for (const m of text.matchAll(new RegExp(EMAIL_RE.source, 'g'))) {
    emailHosts.add(m[0].split('@')[1].toLowerCase());
  }
  URL_RE.lastIndex = 0;
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:]+$/, '');
    const key = url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    if (seen.has(key) || emailHosts.has(key)) continue;
    seen.add(key);
    const type: LinkType = /linkedin\.com/i.test(url)
      ? 'linkedin'
      : /github\.com|gitlab\.com|bitbucket\.org/i.test(url)
        ? 'github'
        : /^(https?:\/\/|www\.)/i.test(url)
          ? 'portfolio'
          : 'other';
    out.push({ url, type });
  }
  return out.slice(0, 20);
}

/** Fallback candidate name: first short alphabetic line near the top. */
export function guessName(text: string): string | null {
  for (const line of text.split('\n').slice(0, 6)) {
    const l = line.trim();
    if (/^[A-Za-z][A-Za-z.'’-]*(\s+[A-Za-z][A-Za-z.'’-]*){1,3}$/.test(l) && l.length <= 50 && !HEADERS.some(([, re]) => re.test(l))) {
      return l;
    }
  }
  return null;
}

// ---------- dates ----------

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE_TOKEN = `(?:${MONTH_RE}\\.?,?\\s+(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])[/.-](?:19|20)\\d{2}|(?:19|20)\\d{2})`;
const PRESENT = '(?:present|current|now|ongoing|till\\s+date|to\\s+date)';
export const DATE_RANGE_RE = new RegExp(`(${DATE_TOKEN})\\s*(?:-|–|—|to|until)\\s*(${DATE_TOKEN}|${PRESENT})`, 'gi');
export const PRESENT_RE = new RegExp(`\\b${PRESENT}\\b`, 'i');

export function findDateRanges(text: string): Array<{ start: string; end: string; index: number }> {
  return Array.from(text.matchAll(DATE_RANGE_RE)).map((m) => ({ start: m[1], end: m[2], index: m.index ?? 0 }));
}

/** Parse "Jan 2020", "01/2020", "2020", "present". Returns months since year 0, or null. */
export function parseDateToMonthIndex(input: string | null | undefined, now = new Date()): number | null {
  const s = String(input ?? '').trim().toLowerCase();
  if (!s) return null;
  if (new RegExp(`^${PRESENT}$`, 'i').test(s)) return now.getFullYear() * 12 + now.getMonth();
  let m = new RegExp(`^(${MONTH_RE})\\.?,?\\s+((?:19|20)\\d{2})$`, 'i').exec(s);
  if (m) return Number(m[2]) * 12 + MONTHS.indexOf(m[1].slice(0, 3));
  m = /^(0?[1-9]|1[0-2])[/.-]((?:19|20)\d{2})$/.exec(s);
  if (m) return Number(m[2]) * 12 + (Number(m[1]) - 1);
  m = /^((?:19|20)\d{2})$/.exec(s);
  if (m) return Number(m[1]) * 12 + 0;
  return null;
}

/** Union of date intervals (overlaps counted once) in months; null if no interval is parseable. */
export function estimateTotalMonths(
  items: Array<{ startDate?: string | null; endDate?: string | null; isCurrent?: boolean | null }>,
  now = new Date()
): number | null {
  const iv: Array<[number, number]> = [];
  for (const it of items) {
    const a = parseDateToMonthIndex(it.startDate, now);
    const b = it.isCurrent && !it.endDate ? parseDateToMonthIndex('present', now) : parseDateToMonthIndex(it.endDate, now);
    if (a === null || b === null || b < a) continue;
    iv.push([a, b + 1]);
  }
  if (iv.length === 0) return null;
  iv.sort((x, y) => x[0] - y[0]);
  let total = 0;
  let [cs, ce] = iv[0];
  for (const [s, e] of iv.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      total += ce - cs;
      [cs, ce] = [s, e];
    }
  }
  total += ce - cs;
  return Math.min(total, 1200);
}
