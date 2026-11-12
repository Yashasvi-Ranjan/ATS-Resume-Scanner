import { extractKnownSkillsFromText, findSkillInText } from '../skills';
import { GroundingIssue } from '../schemas/enhancement.schema';

/** Pure, deterministic text-level fabrication checks shared by the structured and plain-text validators. */

const WORD_NUMBERS: Record<string, string> = {
  one: '1', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17',
  eighteen: '18', nineteen: '19',
  half: 'w:half', halved: 'w:half', halves: 'w:half',
  fourfold: 'w:4fold', fivefold: 'w:5fold', sixfold: 'w:6fold', sevenfold: 'w:7fold', eightfold: 'w:8fold', ninefold: 'w:9fold',
  tenfold: 'w:10fold', hundredfold: 'w:100fold', manifold: 'w:manyfold',
  first: 'o:1', third: 'o:3', fourth: 'o:4', fifth: 'o:5', sixth: 'o:6', seventh: 'o:7', eighth: 'o:8', ninth: 'o:9', tenth: 'o:10',
  two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  twenty: '20', thirty: '30', forty: '40', fifty: '50', sixty: '60', seventy: '70', eighty: '80', ninety: '90',
  hundred: '100', thousand: '1000', million: '1000000', billion: '1000000000', dozen: '12', dozens: '12',
  double: 'w:double', doubled: 'w:double', triple: 'w:triple', tripled: 'w:triple',
  quadruple: 'w:quad', quadrupled: 'w:quad', twofold: 'w:double', threefold: 'w:triple'
};
const WORD_NUM_RE = new RegExp(`(?<![A-Za-z])(${Object.keys(WORD_NUMBERS).join('|')})(?![A-Za-z])`, 'gi');

const NUM_RE =
  /(?<![A-Za-z0-9_.])([$€£])?\s?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s?(%|percent\b|k\b|mm\b|m\b|bn\b|b\b|x\b|million\b|billion\b|thousand\b)?(?![A-Za-z0-9])/gi;

const MULT: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, mm: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 };

/** Canonical numeric tokens (digits, percentages, currency, k/M suffixes, number words). */
export function numericTokens(text: string): Set<string> {
  const out = new Set<string>();
  const t = String(text ?? '');
  NUM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUM_RE.exec(t)) !== null) {
    const cur = m[1] ?? '';
    const base = Number(`${m[2].replace(/,/g, '')}${m[3] ?? ''}`);
    const suf = (m[4] ?? '').toLowerCase();
    if (Number.isNaN(base)) continue;
    const pct = suf === '%' || suf === 'percent';
    const x = suf === 'x';
    const val = base * (MULT[suf] ?? 1);
    out.add(`${cur}${val}${pct ? '%' : ''}${x ? 'x' : ''}`);
  }
  WORD_NUM_RE.lastIndex = 0;
  while ((m = WORD_NUM_RE.exec(t)) !== null) out.add(WORD_NUMBERS[m[1].toLowerCase()]);
  return out;
}

const CREDENTIAL_RE =
  /\b(certified|certification|certifications|certificate|certificates|degree|degrees|bachelor|bachelors|master|masters|ph\.?d|doctorate|diploma|licensed|license|accredited|award|awarded|awards|scholarship)\b/gi;

function credentialKey(w: string): string {
  const k = w.toLowerCase().replace(/\./g, '');
  if (/^certif/.test(k)) return 'certif';
  if (/^degree/.test(k)) return 'degree';
  if (/^bachelor/.test(k)) return 'bachelor';
  if (/^master/.test(k)) return 'master';
  if (/^licen/.test(k)) return 'licen';
  if (/^award/.test(k)) return 'award';
  return k;
}

export function credentialKeys(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of String(text ?? '').matchAll(CREDENTIAL_RE)) out.add(credentialKey(m[1]));
  return out;
}

const LEADERSHIP_RE =
  /\b(led|lead|leads|leading|leader|managed|manages|managing|manager|mentored|mentoring|supervised|supervising|directed|directing|headed|heading|oversaw|overseeing|coached|spearheaded|spearheading|architected|owned|owning|pioneered|pioneering|founded|founding|co-?founded|orchestrated|championed)\b/gi;

/** Stem key so that e.g. "leading"/"led" or "managed"/"managing" count as the same leadership verb. */
function leadershipStem(w: string): string {
  const k = w.toLowerCase().replace(/-/g, '');
  if (/^(led|lead|leads|leading|leader)$/.test(k)) return 'lead';
  if (/^manag/.test(k)) return 'manage';
  if (/^mentor/.test(k)) return 'mentor';
  if (/^supervis/.test(k)) return 'supervise';
  if (/^direct/.test(k)) return 'direct';
  if (/^head/.test(k)) return 'head';
  if (/^(oversaw|overseeing)$/.test(k)) return 'oversee';
  if (/^coach/.test(k)) return 'coach';
  if (/^spearhead/.test(k)) return 'spearhead';
  if (/^architect/.test(k)) return 'architect';
  if (/^own/.test(k)) return 'own';
  if (/^pioneer/.test(k)) return 'pioneer';
  if (/^(co)?found/.test(k)) return 'found';
  if (/^orchestrat/.test(k)) return 'orchestrate';
  if (/^champion/.test(k)) return 'champion';
  return k;
}

/** Leadership/seniority verbs as stem keys. */
export function leadershipWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of String(text ?? '').matchAll(LEADERSHIP_RE)) out.add(leadershipStem(m[1]));
  return out;
}

export function wordSet(text: string): Set<string> {
  return new Set(
    String(text ?? '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
}

const STOP_CAPS = new Set(
  (
    'i a an the and or of in on at to for with by from as is are was were be been this that these those it its ' +
    'january february march april may june july august september october november december jan feb mar apr jun jul aug sep sept oct nov dec ' +
    'monday tuesday wednesday thursday friday saturday sunday present current ' +
    'summary skills experience projects education certifications achievements ' +
    'resume cv'
  ).split(' ')
);

/** Capitalised terms (excluding the first word of a sentence) whose every part is absent from the original. */
export function newProperNouns(text: string, originalWords: Set<string>, originalWordList: string[]): string[] {
  const t = String(text ?? '');
  const found: string[] = [];
  const re = /(?<![A-Za-z0-9])[A-Za-z][A-Za-z0-9+#&.\-]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const tok = m[0].replace(/[.\-]+$/, '');
    if (!/^[A-Z]/.test(tok)) continue;
    // skip sentence-initial words
    const before = t.slice(0, m.index).replace(/[ \t"'(\[]+$/, '');
    if (before === '' || /[.!?:\n•\-–]$/.test(before)) continue;
    const parts = tok.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (parts.length === 0) continue;
    if (parts.every((p) => STOP_CAPS.has(p))) continue;
    const ok = parts.every((p) => {
      if (STOP_CAPS.has(p) || /^\d+$/.test(p) || originalWords.has(p)) return true;
      // whole-word match only (plus a trailing plural 's'); no prefix acceptance
      const sing = p.replace(/s$/, '');
      return sing.length >= 2 && originalWords.has(sing);
    });
    if (!ok) found.push(tok);
  }
  return Array.from(new Set(found));
}

export interface TextIssue {
  issue: GroundingIssue;
  detail: string;
  /** hard = auto-revert; soft = needs_review. */
  hard: boolean;
}

export interface CheckContext {
  /** Text the enhanced item is allowed to draw numbers / credentials / leadership verbs from. */
  sourceText: string;
  /** Text the enhanced item may draw skills from. */
  skillText: string;
  /** Whole original resume (proper-noun check). */
  corpus: string;
  /** Pre-computed for the corpus (perf). */
  corpusWords?: Set<string>;
  corpusWordList?: string[];
}

export function checkText(text: string, ctx: CheckContext): TextIssue[] {
  const issues: TextIssue[] = [];

  const srcNums = numericTokens(ctx.sourceText);
  const bad = Array.from(numericTokens(text)).filter((n) => !srcNums.has(n));
  if (bad.length) {
    issues.push({
      issue: 'invented_metric',
      detail: `Number/percentage/currency/year not found in the original: ${bad.join(', ')}`,
      hard: true
    });
  }

  const newSkills = extractKnownSkillsFromText(text)
    .map((s) => s.skill)
    .filter((skill) => !findSkillInText(ctx.skillText, skill));
  if (newSkills.length) {
    issues.push({
      issue: 'new_skill',
      detail: `Skill/tool not supported by the original: ${newSkills.join(', ')}`,
      hard: true
    });
  }

  const srcCred = credentialKeys(ctx.sourceText);
  const badCred = Array.from(credentialKeys(text)).filter((k) => !srcCred.has(k));
  if (badCred.length) {
    issues.push({
      issue: 'invented_credential',
      detail: `Credential wording not present in the original source: ${badCred.join(', ')}`,
      hard: true
    });
  }

  const words = ctx.corpusWords ?? wordSet(ctx.corpus);
  const list = ctx.corpusWordList ?? Array.from(words);
  const nouns = newProperNouns(text, words, list).filter(
    // already reported as a new skill
    (n) => !newSkills.some((s) => s.toLowerCase() === n.toLowerCase())
  );
  if (nouns.length) {
    issues.push({
      issue: 'new_proper_noun',
      detail: `Terms not found in the original resume: ${nouns.join(', ')}`,
      hard: true
    });
  }

  const srcLead = leadershipWords(ctx.sourceText);
  const lead = Array.from(leadershipWords(text)).filter((w) => !srcLead.has(w));
  if (lead.length) {
    issues.push({
      issue: 'leadership_claim',
      detail: `Leadership/seniority wording not in the original source: ${lead.join(', ')}`,
      hard: true
    });
  }
  return issues;
}
