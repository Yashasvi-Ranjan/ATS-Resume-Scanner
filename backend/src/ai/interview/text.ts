const STOPWORDS = new Set(
  ('a an the and or but if then else of to in on at by for with from as is are was were be been being it its this that these those ' +
    'you your yours we our they their i me my he she his her what which who whom how why when where do does did done can could ' +
    'would should will shall may might must have has had not no yes about into over under than so such also just very more most ' +
    'any all each other some there here use used using explain describe tell walk through please give example examples').split(' ')
);

/** Lowercased content tokens (stopwords removed, trailing plural 's' folded). */
export function contentTokens(text: string): string[] {
  const raw = String(text ?? '')
    .toLowerCase()
    .replace(/c\+\+/g, 'cpp')
    .replace(/c#/g, 'csharp')
    .replace(/\.net\b/g, 'dotnet')
    .replace(/node\.js/g, 'nodejs')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const out: string[] = [];
  for (let t of raw) {
    if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
    if (t.length < 2 || STOPWORDS.has(t)) continue;
    out.push(t);
  }
  return out;
}

export function wordCount(text: string): number {
  return (String(text ?? '').trim().match(/\S+/g) ?? []).length;
}

export function normalizeText(text: string): string {
  return contentTokens(text).join(' ');
}

export function jaccard(a: Iterable<string>, b: Iterable<string>): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export function isNearDuplicate(a: string, b: string, threshold = 0.8): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  return jaccard(contentTokens(a), contentTokens(b)) > threshold;
}

/** Whole-term, case-insensitive containment (handles terms like c++, node.js). */
export function containsTerm(haystack: string, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (t.length < 2) return false;
  const h = haystack.toLowerCase();
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#])${esc}($|[^a-z0-9+#])`).test(h);
}
