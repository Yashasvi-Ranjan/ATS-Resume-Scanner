import { StructuredResume } from '../schemas/resume.schema';

export interface SourceItem {
  id: string;
  kind: 'summary' | 'exp_bullet' | 'proj_bullet' | 'proj_desc' | 'achievement';
  text: string;
  entryId?: string;
}

export interface NormalizedResume {
  /** Copy of the resume with every id filled and unique (positional when missing). */
  resume: StructuredResume;
  items: Map<string, SourceItem>;
  /** Concatenated original text: structured fields plus (optionally) the raw extracted text. */
  corpus: string;
}

export const collapse = (s: string): string => String(s ?? '').replace(/\s+/g, ' ').trim();

export function expDates(e: { startDate?: string | null; endDate?: string | null; isCurrent?: boolean | null }): string {
  const end = e.endDate || (e.isCurrent ? 'Present' : null);
  return [e.startDate, end].filter(Boolean).join(' - ');
}

export function eduDates(e: { startDate?: string | null; endDate?: string | null }): string {
  return [e.startDate, e.endDate].filter(Boolean).join(' - ');
}

function uniqueId(wanted: string, fallback: string, used: Set<string>): string {
  let id = wanted && !used.has(wanted) ? wanted : fallback;
  let n = 2;
  while (used.has(id)) id = `${fallback}-${n++}`;
  used.add(id);
  return id;
}

export function normalizeResume(input: StructuredResume, extractedText?: string | null): NormalizedResume {
  const r: StructuredResume = JSON.parse(JSON.stringify(input));
  const used = new Set<string>(['summary']);
  const items = new Map<string, SourceItem>();
  const parts: string[] = [];

  if (r.summary) {
    items.set('summary', { id: 'summary', kind: 'summary', text: collapse(r.summary) });
    parts.push(r.summary);
  }
  parts.push(...r.skills.map((s) => s.name), ...r.keywords);

  r.experience.forEach((e, i) => {
    e.id = uniqueId(e.id, `exp-${i + 1}`, used);
    parts.push(e.title ?? '', e.company, e.location ?? '', expDates(e), ...e.skillsUsed);
    e.bullets.forEach((b, j) => {
      b.id = uniqueId(b.id, `${e.id}-b${j + 1}`, used);
      items.set(b.id, { id: b.id, kind: 'exp_bullet', text: collapse(b.text), entryId: e.id });
      parts.push(b.text);
    });
  });
  r.projects.forEach((p, i) => {
    p.id = uniqueId(p.id, `proj-${i + 1}`, used);
    parts.push(p.name, p.description ?? '', ...p.technologies);
    if (p.description) {
      const id = `${p.id}-d`;
      used.add(id);
      items.set(id, { id, kind: 'proj_desc', text: collapse(p.description), entryId: p.id });
    }
    p.bullets.forEach((b, j) => {
      const id = `${p.id}-b${j + 1}`;
      used.add(id);
      items.set(id, { id, kind: 'proj_bullet', text: collapse(b), entryId: p.id });
      parts.push(b);
    });
  });
  r.education.forEach((e, i) => {
    e.id = uniqueId(e.id, `edu-${i + 1}`, used);
    parts.push(e.institution, e.degree ?? '', e.field ?? '', eduDates(e), e.gpa ?? '');
  });
  r.certifications.forEach((c) => parts.push(c.name, c.issuer ?? '', c.date ?? ''));
  r.achievements.forEach((a, i) => {
    const id = `ach-${i + 1}`;
    items.set(id, { id, kind: 'achievement', text: collapse(a.text) });
    parts.push(a.text);
  });
  if (extractedText) parts.push(extractedText);
  return { resume: r, items, corpus: parts.filter(Boolean).join('\n') };
}

export const certId = (i: number): string => `cert-${i + 1}`;
export const projBulletId = (projId: string, j: number): string => `${projId}-b${j + 1}`;
