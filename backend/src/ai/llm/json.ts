/** Remove markdown code fences wrapping the payload. */
function stripFences(text: string): string {
  const m = text.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)```/);
  return m ? m[1] : text;
}

/** Find the first balanced {...} or [...] (string/escape aware) starting from `from`. */
function balancedFrom(text: string, from: number): string | null {
  const open = text[from];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return text.slice(from, i + 1);
    }
  }
  return null;
}

/** Robustly extract a JSON value from model output. Throws SyntaxError if none found. */
export function extractJson(raw: string): unknown {
  const candidates: string[] = [raw.trim(), stripFences(raw).trim()];
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* try next */
    }
  }
  const src = stripFences(raw);
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '{' && src[i] !== '[') continue;
    const slice = balancedFrom(src, i);
    if (!slice) continue;
    try {
      return JSON.parse(slice);
    } catch {
      /* keep scanning */
    }
  }
  throw new SyntaxError('No JSON found in model output');
}
