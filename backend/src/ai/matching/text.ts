import { findSkillInText, getSkillDef } from '../skills';

const STOP = new Set(
  (
    'a an and are as at be by for from has have in is it its of on or that the this to with will you your our we their they them ' +
    'who which can able etc using use used including include experience working work strong good knowledge understanding ' +
    'ability skills skill team teams years year new role responsible build building develop developing development ' +
    'other related such per across within into over also more most than both any all'
  ).split(' ')
);

export function stem(w: string): string {
  if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 6 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 5 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/** Significant, stemmed tokens (stopwords and very short tokens removed). */
export function tokens(text: string): string[] {
  return (String(text ?? '').toLowerCase().match(/[a-z0-9][a-z0-9+#.]*[a-z0-9+#]|[a-z0-9]/g) ?? [])
    .map((t) => t.replace(/\.+$/, ''))
    .filter((t) => t.length > 2 && !STOP.has(t))
    .map(stem);
}

export const tokenSet = (text: string): Set<string> => new Set(tokens(text));

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function snippetAround(text: string, start: number, end: number): string {
  return text
    .slice(Math.max(0, start - 40), Math.min(text.length, end + 40))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Word-boundary term lookup (never a naive substring). Known skills go through the skill taxonomy
 * (alias aware); other terms use a boundary-anchored, plural-tolerant regex.
 */
export function findTerm(text: string, term: string): { snippet: string } | null {
  const t = String(term ?? '').trim();
  if (!t || !text) return null;
  if (getSkillDef(t)) {
    const m = findSkillInText(text, t);
    return m ? { snippet: m.snippet } : null;
  }
  const body = t.split(/\s+/).map(escapeRe).join('[\\s\\-]+');
  const re = new RegExp(`(?<![A-Za-z0-9_])${body}(?:s|es)?(?![A-Za-z0-9_])`, 'i');
  const r = re.exec(text);
  return r ? { snippet: snippetAround(text, r.index, r.index + r[0].length) } : null;
}
