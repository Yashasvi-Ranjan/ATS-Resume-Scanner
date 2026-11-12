import { RELATED, SKILLS, SkillCategory, SkillDef } from './taxonomy';

export { SKILLS, SkillCategory, SkillDef };

const cleanKey = (s: string): string =>
  s.toLowerCase().replace(/\s+/g, ' ').trim().replace(/^[\s,;:(){}\[\]"'`*•·\-–—]+|[\s,;:(){}\[\]"'`*•·\-–—]+$/g, '');
const stripTrailingDot = (s: string) => s.replace(/\.+$/, '');
const compact = (s: string): string => s.toLowerCase().replace(/[\s.\-_/]+/g, '');

const BY_NAME = new Map<string, SkillDef>();
const ALIAS = new Map<string, SkillDef>();
const COMPACT = new Map<string, SkillDef>();

for (const def of SKILLS) {
  BY_NAME.set(def.name.toLowerCase(), def);
  for (const a of [def.name, ...def.aliases, ...(def.csAliases ?? [])]) {
    const k = cleanKey(a);
    if (!ALIAS.has(k)) ALIAS.set(k, def);
    const c = compact(a);
    // compact forms only for non-ambiguous, multi-char aliases to avoid collisions
    if (c.length > 1 && !COMPACT.has(c)) COMPACT.set(c, def);
  }
}

function lookup(input: string): SkillDef | undefined {
  const k = cleanKey(String(input ?? ''));
  if (!k) return undefined;
  return ALIAS.get(k) ?? ALIAS.get(stripTrailingDot(k)) ?? COMPACT.get(compact(k));
}

/** Canonical display name for a known skill; otherwise the cleaned input (whitespace-collapsed). */
export function normalizeSkill(input: string): string {
  const def = lookup(input);
  if (def) return def.name;
  return String(input ?? '').replace(/\s+/g, ' ').trim();
}

/** Stable lowercase comparison key (aliases collapse to the same key). */
export function canonicalSkillKey(input: string): string {
  const def = lookup(input);
  if (def) return def.name.toLowerCase();
  return stripTrailingDot(cleanKey(String(input ?? '')));
}

export function getSkillDef(input: string): SkillDef | undefined {
  return lookup(input);
}

export function getSkillCategory(input: string): SkillCategory | undefined {
  return lookup(input)?.category;
}

/** All known spellings (canonical name first) for a skill; [] items only the input for unknown skills. */
export function skillAliases(input: string): string[] {
  const def = lookup(input);
  if (!def) {
    const n = normalizeSkill(input);
    return n ? [n] : [];
  }
  return Array.from(new Set([def.name, ...def.aliases]));
}

export function isSameSkill(a: string, b: string): boolean {
  const ka = canonicalSkillKey(a);
  return ka !== '' && ka === canonicalSkillKey(b);
}

// ---------- text matching ----------

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function aliasPattern(alias: string, caseSensitive: boolean): RegExp {
  const body = alias
    .split(/\s+/)
    .map(escapeRe)
    .join('[\\s\\-]+');
  // Not preceded/followed by identifier chars. Also not followed by "+"/"#" after a letter so "c" never hits "c++"/"c#".
  const tail = /[A-Za-z0-9]$/.test(alias) ? '(?![A-Za-z0-9_])(?![+#]\\w)' : '(?![A-Za-z0-9_])';
  return new RegExp(`(?<![A-Za-z0-9_])${body}${tail}`, caseSensitive ? 'g' : 'gi');
}

const LEFT_CTX = /[,;:|\/(\[•·*\-–—]$/;
const RIGHT_CTX = /^[,;|\/)\]•·*\-–—.]/;

function listContext(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 40), start).replace(/[ \t]+$/, '');
  const after = text.slice(end, end + 40).replace(/^[ \t]+/, '');
  const leftOk = before === '' || /\n$/.test(before) || LEFT_CTX.test(before);
  const rightOk = after === '' || /^\n/.test(after) || RIGHT_CTX.test(after);
  return leftOk && rightOk;
}

interface Matcher {
  def: SkillDef;
  alias: string;
  re: RegExp;
}

const MATCHERS: Matcher[] = [];
const MATCHERS_BY_SKILL = new Map<string, Matcher[]>();
for (const def of SKILLS) {
  const list: Matcher[] = [];
  const seen = new Set<string>();
  for (const a of [def.name, ...def.aliases]) {
    const cs = !!def.caseSensitive || !!def.csAliases?.includes(a);
    if (!def.caseSensitive && !cs && def.csAliases?.some((c) => c.toLowerCase() === a.toLowerCase())) continue;
    const key = (cs ? 'c:' : 'i:') + (cs ? a : a.toLowerCase());
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ def, alias: a, re: aliasPattern(a, cs) });
  }
  MATCHERS.push(...list);
  MATCHERS_BY_SKILL.set(def.name, list);
}

export interface SkillMatch {
  skill: string;
  category?: SkillCategory;
  matchedText: string;
  index: number;
  /** Surrounding text, whitespace-collapsed, for evidence display. */
  snippet: string;
}

function snippetAt(text: string, start: number, end: number): string {
  return text.slice(Math.max(0, start - 40), Math.min(text.length, end + 40)).replace(/\s+/g, ' ').trim();
}

function scan(m: Matcher, text: string): Array<{ start: number; end: number; def: SkillDef; matched: string }> {
  const out: Array<{ start: number; end: number; def: SkillDef; matched: string }> = [];
  m.re.lastIndex = 0;
  let r: RegExpExecArray | null;
  while ((r = m.re.exec(text)) !== null) {
    if (r[0].length === 0) {
      m.re.lastIndex++;
      continue;
    }
    const start = r.index;
    const end = start + r[0].length;
    if (/^[A-Za-z]{1,2}$/.test(r[0]) &&!listContext(text, start, end)) continue;
    out.push({ start, end, def: m.def, matched: r[0] });
  }
  return out;
}

/** Find a specific skill (any alias) in text. Returns first match with evidence, or null. */
export function findSkillInText(text: string, skill: string): SkillMatch | null {
  const src = String(text ?? '');
  if (!src) return null;
  const def = lookup(skill);
  if (def) {
    const all = (MATCHERS_BY_SKILL.get(def.name) ?? []).flatMap((m) => scan(m, src));
    if (all.length === 0) return null;
    // Reject hits that are fully covered by a longer match of another skill (e.g. "node" inside "node.js" is same skill; "react" in "react native").
    const longer = MATCHERS.filter((m) => m.def !== def).flatMap((m) => scan(m, src));
    const valid = all
      .filter((h) => !longer.some((l) => l.start <= h.start && l.end >= h.end && l.end - l.start > h.end - h.start))
      .sort((a, b) => a.start - b.start)[0];
    if (!valid) return null;
    return {
      skill: def.name,
      category: def.category,
      matchedText: valid.matched,
      index: valid.start,
      snippet: snippetAt(src, valid.start, valid.end)
    };
  }
  const name = normalizeSkill(skill);
  if (!name || name.length < 2) return null;
  const re = aliasPattern(name, false);
  const r = re.exec(src);
  if (!r) return null;
  return {
    skill: name,
    matchedText: r[0],
    index: r.index,
    snippet: snippetAt(src, r.index, r.index + r[0].length)
  };
}

export function textMentionsSkill(text: string, skill: string): boolean {
  return findSkillInText(text, skill) !== null;
}

/** Extract all known skills in text (non-overlapping, longest match wins). One entry per canonical skill (first occurrence). */
export function extractKnownSkillsFromText(text: string): SkillMatch[] {
  const src = String(text ?? '');
  if (!src) return [];
  const hits = MATCHERS.flatMap((m) => scan(m, src));
  hits.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const taken: Array<[number, number]> = [];
  const accepted: typeof hits = [];
  for (const h of hits) {
    if (taken.some(([s, e]) => h.start < e && h.end > s)) continue;
    taken.push([h.start, h.end]);
    accepted.push(h);
  }
  accepted.sort((a, b) => a.start - b.start);
  const seen = new Set<string>();
  const out: SkillMatch[] = [];
  for (const h of accepted) {
    if (seen.has(h.def.name)) continue;
    seen.add(h.def.name);
    out.push({
      skill: h.def.name,
      category: h.def.category,
      matchedText: h.matched,
      index: h.start,
      snippet: snippetAt(src, h.start, h.end)
    });
  }
  return out;
}

// ---------- relatedness ----------

const RELATED_MAP = new Map<string, number>();
for (const [a, b, w] of RELATED) {
  const ka = canonicalSkillKey(a);
  const kb = canonicalSkillKey(b);
  RELATED_MAP.set(`${ka}||${kb}`, w);
  RELATED_MAP.set(`${kb}||${ka}`, w);
}

/** 0..1 similarity: 1 for same skill, curated weight for related skills, else 0. Use for PARTIAL credit only. */
export function skillsRelated(a: string, b: string): number {
  const ka = canonicalSkillKey(a);
  const kb = canonicalSkillKey(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 1;
  return RELATED_MAP.get(`${ka}||${kb}`) ?? 0;
}
