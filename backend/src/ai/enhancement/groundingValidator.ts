import { findSkillInText, canonicalSkillKey } from '../skills';
import { StructuredResume } from '../schemas/resume.schema';
import {
  ChangeMap,
  ChangeMapItem,
  ChangeType,
  CHANGE_TYPES,
  EnhancedBullet,
  EnhancedResume,
  EnhancementLlmOutput,
  GROUNDING_VALIDATOR_VERSION,
  GroundingFlag,
  GroundingIssue,
  GroundingReport,
  LlmBullet,
  MetricSuggestion
} from '../schemas/enhancement.schema';
import { checkText, numericTokens, wordSet } from './textChecks';
import { NormalizedResume, SourceItem, certId, collapse, eduDates, expDates, normalizeResume, projBulletId } from './sourceIndex';
import { renderPlainText } from './render';

export const VALIDATOR_VERSION = GROUNDING_VALIDATOR_VERSION;

/** Normalised comparison for entity strings (employers, titles, dates, degrees ...). */
export function normEntity(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\b(present|current|now|ongoing)\b/g, 'present')
    .replace(/\b(to|until|through)\b/g, ' ')
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim();
}

export interface GroundingOutcome {
  structured: EnhancedResume;
  changeMap: ChangeMap;
  report: GroundingReport;
  text: string;
  /** Items taken from the model output that survived validation. 0 => nothing usable was produced. */
  acceptedCount: number;
}

class Acc {
  flagged: GroundingFlag[] = [];
  warnings: string[] = [];
  checked = 0;
  accepted = 0;
  restored = 0;
  items: ChangeMapItem[] = [];
  omitted: ChangeMap['omitted'] = [];

  flag(path: string, issue: GroundingIssue, action: GroundingFlag['action'], originalText: string, proposedText: string, detail?: string) {
    this.flagged.push({ path, issue, detail, originalText, proposedText, action });
  }
}

const normType = (t: string | null | undefined): ChangeType =>
  (CHANGE_TYPES as readonly string[]).includes(String(t)) ? (t as ChangeType) : 'reworded';

const MAX_BULLET = 1500;

export function groundEnhancement(
  originalInput: StructuredResume,
  llm: EnhancementLlmOutput,
  opts: { extractedText?: string | null; inputHash?: string | null } = {}
): GroundingOutcome {
  const norm: NormalizedResume = normalizeResume(originalInput, opts.extractedText);
  const orig = norm.resume;
  const acc = new Acc();
  const corpusWords = wordSet(norm.corpus);
  const corpusWordList = Array.from(corpusWords);
  const base = { corpus: norm.corpus, corpusWords, corpusWordList };

  let seq = 0;
  const nextId = (prefix: string) => `${prefix}-e${++seq}`;

  const mkBullet = (
    prefix: string,
    path: string,
    text: string,
    sourceIds: string[],
    originalText: string,
    changeType: ChangeType,
    justification: string
  ): EnhancedBullet => {
    const b: EnhancedBullet = {
      id: nextId(prefix),
      text,
      sourceIds,
      originalText,
      changeType,
      justification
    };
    acc.items.push({ path, bulletId: b.id, changeType, sourceIds, originalText, enhancedText: text, justification });
    return b;
  };

  const unchanged = (prefix: string, path: string, src: SourceItem, why: string): EnhancedBullet =>
    mkBullet(prefix, path, src.text, [src.id], src.text, 'unchanged', why);

  /**
   * Validate one model-proposed bullet against its sources. Returns the bullets to emit
   * (the proposal, or the originals when it is reverted, or nothing when unsupported).
   */
  function processBullet(
    prefix: string,
    path: string,
    lb: LlmBullet,
    allowed: Set<string>,
    skillText: string,
    cited: Set<string>
  ): EnhancedBullet[] {
    acc.checked++;
    const text = collapse(lb.text).slice(0, MAX_BULLET);
    if (!text) return [];
    const valid = Array.from(new Set((lb.sourceIds ?? []).filter((id) => allowed.has(id))));
    if (valid.length === 0) {
      acc.flag(path, 'unsupported', 'reverted', '', text, 'Bullet cites no valid source from the original resume');
      return [];
    }
    const srcs = valid.map((id) => norm.items.get(id) as SourceItem);
    const srcText = srcs.map((s) => s.text).join(' ');
    srcs.forEach((s) => cited.add(s.id));
    const justification = collapse(lb.justification ?? '') || 'No justification provided by the model.';

    if (srcs.length === 1 && normEntity(text) === normEntity(srcs[0].text)) {
      acc.accepted++;
      const ct: ChangeType = normType(lb.changeType) === 'reordered' ? 'reordered' : 'unchanged';
      return [mkBullet(prefix, path, srcs[0].text, valid, srcs[0].text, ct, justification)];
    }

    const issues = checkText(text, { ...base, sourceText: srcText, skillText });
    const hard = issues.filter((i) => i.hard);
    if (hard.length) {
      for (const i of hard) acc.flag(path, i.issue, 'reverted', srcText, text, i.detail);
      return srcs.map((s) => unchanged(prefix, path, s, 'Reverted to original: proposed rewrite failed grounding checks'));
    }
    for (const i of issues) acc.flag(path, i.issue, 'needs_review', srcText, text, i.detail);
    acc.accepted++;
    let ct = normType(lb.changeType);
    if (ct === 'unchanged' || ct === 'removed_redundant') ct = 'reworded';
    if (srcs.length > 1) ct = 'merged';
    return [mkBullet(prefix, path, text, valid, srcText, ct, justification)];
  }

  // ---------- summary ----------
  let summary: EnhancedBullet | null = null;
  if (orig.summary) {
    const src = norm.items.get('summary') as SourceItem;
    if (llm.summary && collapse(llm.summary.text)) {
      const out = processBullet('summary', 'summary', { ...llm.summary, sourceIds: ['summary'] }, new Set(['summary']), norm.corpus, new Set());
      summary = out[0] ?? unchanged('summary', 'summary', src, 'Original summary kept');
    } else {
      summary = unchanged('summary', 'summary', src, 'Original summary kept');
      acc.restored++;
    }
  } else if (llm.summary && collapse(llm.summary.text)) {
    acc.checked++;
    acc.flag('summary', 'unsupported', 'reverted', '', collapse(llm.summary.text), 'The original resume has no summary; none is invented');
  }

  // ---------- experience ----------
  const experience: EnhancedResume['experience'] = [];
  const usedExp = new Set<string>();
  const checkEntity = (path: string, label: string, original: string | null | undefined, proposed: string | null | undefined) => {
    if (proposed === null || proposed === undefined || !collapse(proposed)) return;
    acc.checked++;
    if (normEntity(proposed) !== normEntity(original)) {
      acc.flag(path, 'altered_entity', 'reverted', original ?? '', collapse(proposed), `${label} must match the original exactly`);
    } else acc.accepted++;
  };

  const expBulletsOf = (e: StructuredResume['experience'][number]) => e.bullets.map((b) => norm.items.get(b.id) as SourceItem);

  const pushExp = (e: StructuredResume['experience'][number], bullets: EnhancedBullet[]) => {
    experience.push({
      id: e.id,
      title: e.title ?? null,
      company: e.company,
      location: e.location ?? null,
      dates: expDates(e),
      bullets
    });
  };

  for (const le of llm.experience ?? []) {
    const e = orig.experience.find((x) => x.id === le.sourceId);
    const path = `experience[${le.sourceId}]`;
    if (!e || usedExp.has(e.id)) {
      acc.checked++;
      acc.flag(path, 'unsupported', 'reverted', '', `${le.title ?? ''} ${le.company ?? ''}`.trim(), e ? 'Duplicate experience entry' : 'Experience entry does not exist in the original resume');
      continue;
    }
    usedExp.add(e.id);
    checkEntity(`${path}.title`, 'Job title', e.title, le.title);
    checkEntity(`${path}.company`, 'Employer', e.company, le.company);
    checkEntity(`${path}.dates`, 'Dates', expDates(e), le.dates);

    const ids = new Set(e.bullets.map((b) => b.id));
    const skillText = [e.title, e.company, ...e.skillsUsed, ...e.bullets.map((b) => b.text)].filter(Boolean).join('\n');
    const cited = new Set<string>();
    const bullets: EnhancedBullet[] = [];
    (le.bullets ?? []).forEach((lb, i) => bullets.push(...processBullet(e.id, `${path}.bullets[${i}]`, lb, ids, skillText, cited)));
    const removed = new Set<string>();
    for (const r of le.removed ?? []) {
      if (ids.has(r.sourceId) && !cited.has(r.sourceId)) {
        removed.add(r.sourceId);
        acc.omitted.push({ sourceId: r.sourceId, text: (norm.items.get(r.sourceId) as SourceItem).text, changeType: 'removed_redundant', reason: collapse(r.reason ?? '') || 'Redundant' });
      }
    }
    for (const src of expBulletsOf(e)) {
      if (!cited.has(src.id) && !removed.has(src.id)) {
        bullets.push(unchanged(e.id, `${path}.bullets[restored:${src.id}]`, src, 'Original bullet kept (not covered by the enhanced output)'));
        acc.restored++;
      }
    }
    pushExp(e, bullets);
  }
  for (const e of orig.experience) {
    if (usedExp.has(e.id)) continue;
    acc.restored++;
    pushExp(e, expBulletsOf(e).map((s) => unchanged(e.id, `experience[${e.id}].bullets[restored:${s.id}]`, s, 'Original entry kept (missing from enhanced output)')));
  }

  // ---------- projects ----------
  const projects: EnhancedResume['projects'] = [];
  const usedProj = new Set<string>();
  const projSources = (p: StructuredResume['projects'][number]): SourceItem[] =>
    [`${p.id}-d`, ...p.bullets.map((_, j) => projBulletId(p.id, j))].map((id) => norm.items.get(id)).filter(Boolean) as SourceItem[];
  const pushProj = (p: StructuredResume['projects'][number], description: EnhancedBullet | null, bullets: EnhancedBullet[], techs: string[]) =>
    projects.push({ id: p.id, name: p.name, technologies: techs, description, bullets });

  for (const lp of llm.projects ?? []) {
    const p = orig.projects.find((x) => x.id === lp.sourceId);
    const path = `projects[${lp.sourceId}]`;
    if (!p || usedProj.has(p.id)) {
      acc.checked++;
      acc.flag(path, 'unsupported', 'reverted', '', lp.name ?? '', p ? 'Duplicate project entry' : 'Project does not exist in the original resume');
      continue;
    }
    usedProj.add(p.id);
    checkEntity(`${path}.name`, 'Project name', p.name, lp.name);
    const techs: string[] = [];
    for (const t of lp.technologies ?? []) {
      acc.checked++;
      const ok = p.technologies.some((o) => canonicalSkillKey(o) === canonicalSkillKey(t));
      if (ok) {
        acc.accepted++;
        techs.push(p.technologies.find((o) => canonicalSkillKey(o) === canonicalSkillKey(t)) as string);
      } else acc.flag(`${path}.technologies`, 'new_skill', 'reverted', p.technologies.join(', '), t, 'Technology is not listed for this project in the original');
    }
    for (const o of p.technologies) if (!techs.some((t) => canonicalSkillKey(t) === canonicalSkillKey(o))) techs.push(o);

    const srcs = projSources(p);
    const ids = new Set(srcs.map((s) => s.id));
    const skillText = [p.name, ...p.technologies, ...srcs.map((s) => s.text)].join('\n');
    const cited = new Set<string>();
    let description: EnhancedBullet | null = null;
    if (lp.description && p.description) {
      description = processBullet(p.id, `${path}.description`, lp.description, ids, skillText, cited)[0] ?? null;
    }
    const bullets: EnhancedBullet[] = [];
    (lp.bullets ?? []).forEach((lb, i) => bullets.push(...processBullet(p.id, `${path}.bullets[${i}]`, lb, ids, skillText, cited)));
    const removed = new Set<string>();
    for (const r of lp.removed ?? []) {
      if (ids.has(r.sourceId) && !cited.has(r.sourceId)) {
        removed.add(r.sourceId);
        acc.omitted.push({ sourceId: r.sourceId, text: (norm.items.get(r.sourceId) as SourceItem).text, changeType: 'removed_redundant', reason: collapse(r.reason ?? '') || 'Redundant' });
      }
    }
    for (const s of srcs) {
      if (cited.has(s.id) || removed.has(s.id)) continue;
      acc.restored++;
      const b = unchanged(p.id, `${path}.restored:${s.id}`, s, 'Original kept (not covered by the enhanced output)');
      if (s.kind === 'proj_desc') description = b;
      else bullets.push(b);
    }
    pushProj(p, description, bullets, techs);
  }
  for (const p of orig.projects) {
    if (usedProj.has(p.id)) continue;
    acc.restored++;
    const srcs = projSources(p);
    const d = srcs.find((s) => s.kind === 'proj_desc');
    pushProj(p, d ? unchanged(p.id, `projects[${p.id}].description`, d, 'Original project kept') : null,
      srcs.filter((s) => s.kind === 'proj_bullet').map((s) => unchanged(p.id, `projects[${p.id}].bullets`, s, 'Original project kept')), p.technologies);
  }

  // ---------- education ----------
  const education: EnhancedResume['education'] = [];
  const usedEdu = new Set<string>();
  const pushEdu = (e: StructuredResume['education'][number]) =>
    education.push({ id: e.id, institution: e.institution, degree: e.degree ?? null, field: e.field ?? null, dates: eduDates(e), gpa: e.gpa ?? null });
  for (const le of llm.education ?? []) {
    const e = orig.education.find((x) => x.id === le.sourceId);
    const path = `education[${le.sourceId}]`;
    if (!e || usedEdu.has(e.id)) {
      acc.checked++;
      acc.flag(path, 'unsupported', 'reverted', '', `${le.degree ?? ''} ${le.institution ?? ''}`.trim(), 'Education entry does not exist in the original resume');
      continue;
    }
    usedEdu.add(e.id);
    checkEntity(`${path}.institution`, 'Institution', e.institution, le.institution);
    checkEntity(`${path}.degree`, 'Degree', e.degree, le.degree);
    checkEntity(`${path}.field`, 'Field of study', e.field, le.field);
    checkEntity(`${path}.dates`, 'Dates', eduDates(e), le.dates);
    pushEdu(e);
  }
  for (const e of orig.education) if (!usedEdu.has(e.id)) { acc.restored++; pushEdu(e); }

  // ---------- certifications ----------
  const certifications: EnhancedResume['certifications'] = [];
  const usedCert = new Set<string>();
  const pushCert = (c: StructuredResume['certifications'][number], i: number) =>
    certifications.push({ id: certId(i), name: c.name, issuer: c.issuer ?? null, date: c.date ?? null });
  for (const lc of llm.certifications ?? []) {
    const idx = orig.certifications.findIndex((_, i) => certId(i) === lc.sourceId);
    const path = `certifications[${lc.sourceId}]`;
    if (idx < 0 || usedCert.has(lc.sourceId)) {
      acc.checked++;
      acc.flag(path, 'invented_credential', 'reverted', '', `${lc.name ?? ''} ${lc.issuer ?? ''}`.trim(), 'Certification does not exist in the original resume');
      continue;
    }
    usedCert.add(lc.sourceId);
    const c = orig.certifications[idx];
    checkEntity(`${path}.name`, 'Certification', c.name, lc.name);
    checkEntity(`${path}.issuer`, 'Issuer', c.issuer, lc.issuer);
    checkEntity(`${path}.date`, 'Date', c.date, lc.date);
    pushCert(c, idx);
  }
  orig.certifications.forEach((c, i) => { if (!usedCert.has(certId(i))) { acc.restored++; pushCert(c, i); } });

  // ---------- achievements ----------
  const achievements: EnhancedBullet[] = [];
  const achIds = new Set(orig.achievements.map((_, i) => `ach-${i + 1}`));
  const achCited = new Set<string>();
  (llm.achievements ?? []).forEach((la, i) => achievements.push(...processBullet('ach', `achievements[${i}]`, la, achIds, norm.corpus, achCited)));
  for (const id of achIds) {
    if (!achCited.has(id)) {
      acc.restored++;
      achievements.push(unchanged('ach', `achievements[restored:${id}]`, norm.items.get(id) as SourceItem, 'Original kept (not covered by the enhanced output)'));
    }
  }

  // ---------- skills ----------
  const skills: string[] = [];
  const seenSkill = new Set<string>();
  const addSkill = (s: string) => {
    const k = canonicalSkillKey(s);
    if (!k || seenSkill.has(k)) return false;
    seenSkill.add(k);
    skills.push(s);
    return true;
  };
  for (const s of llm.skills ?? []) {
    const name = collapse(s);
    if (!name) continue;
    acc.checked++;
    const o = orig.skills.find((x) => canonicalSkillKey(x.name) === canonicalSkillKey(name));
    if (o) { acc.accepted++; addSkill(o.name); }
    else if (findSkillInText(norm.corpus, name) && !/^[a-z]{1,2}$/i.test(name)) { acc.accepted++; addSkill(name); }
    else acc.flag('skills', 'new_skill', 'reverted', '', name, 'Skill is not present anywhere in the original resume (a JD mention alone is not evidence)');
  }
  for (const o of orig.skills) if (addSkill(o.name)) acc.restored++;

  // ---------- metric suggestions (advice only; must not carry numbers) ----------
  const metricSuggestions: MetricSuggestion[] = [];
  for (const m of llm.metricSuggestions ?? []) {
    const text = collapse(m.suggestion);
    if (!text || !norm.items.has(m.sourceId) || numericTokens(text).size > 0 || /\d/.test(text)) continue;
    const eb = [...experience.flatMap((e) => e.bullets), ...projects.flatMap((p) => p.bullets)].find((b) => b.sourceIds.includes(m.sourceId));
    metricSuggestions.push({ bulletId: eb?.id ?? m.sourceId, suggestion: text.slice(0, 400) });
    if (metricSuggestions.length >= 10) break;
  }

  const structured: EnhancedResume = {
    contact: {
      name: orig.contact.name ?? null,
      email: orig.contact.email ?? null,
      phone: orig.contact.phone ?? null,
      links: orig.contact.links.map((l) => l.url)
    },
    summary,
    skills,
    experience,
    projects,
    education,
    certifications,
    achievements
  };

  const report: GroundingReport = {
    validatorVersion: VALIDATOR_VERSION,
    passed: acc.flagged.length === 0,
    advisory: false,
    skipped: false,
    checkedItems: acc.checked,
    acceptedItems: acc.accepted,
    revertedItems: new Set(acc.flagged.filter((f) => f.action === 'reverted').map((f) => f.path)).size,
    needsReviewItems: new Set(acc.flagged.filter((f) => f.action === 'needs_review').map((f) => f.path)).size,
    restoredItems: acc.restored,
    flagged: acc.flagged,
    warnings: acc.warnings
  };
  return {
    structured,
    changeMap: { inputHash: opts.inputHash ?? null, items: acc.items, omitted: acc.omitted, metricSuggestions },
    report,
    text: renderPlainText(structured),
    acceptedCount: acc.accepted
  };
}

/**
 * Advisory validation of free text (manual / user-edited content) against the original resume.
 * Never blocks: the user is the authority, but unsupported additions are surfaced.
 */
export function validatePlainText(
  content: string,
  original: StructuredResume | null,
  extractedText?: string | null
): GroundingReport {
  const empty = (skipped: boolean, warnings: string[]): GroundingReport => ({
    validatorVersion: VALIDATOR_VERSION, passed: false, advisory: true, skipped,
    checkedItems: 0, acceptedItems: 0, revertedItems: 0, needsReviewItems: 0, restoredItems: 0, flagged: [], warnings
  });
  const corpus = original ? normalizeResume(original, extractedText).corpus : extractedText ?? '';
  if (!corpus.trim()) {
    return empty(true, ['No parsed resume text is available, so this content could not be checked against the original.']);
  }
  const words = wordSet(corpus);
  const list = Array.from(words);
  const flagged: GroundingFlag[] = [];
  let checked = 0;
  content.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/^[\s\-*•·]+/, '').trim();
    if (!line || /^[A-Z][A-Z &/]{2,}$/.test(line)) return;
    checked++;
    for (const issue of checkText(line, { sourceText: corpus, skillText: corpus, corpus, corpusWords: words, corpusWordList: list })) {
      flagged.push({ path: `line:${i + 1}`, issue: issue.issue, detail: issue.detail, originalText: '', proposedText: line, action: 'needs_review' });
    }
  });
  return {
    validatorVersion: VALIDATOR_VERSION, passed: flagged.length === 0, advisory: true, skipped: false,
    checkedItems: checked, acceptedItems: checked - new Set(flagged.map((f) => f.path)).size, revertedItems: 0,
    needsReviewItems: flagged.length, restoredItems: 0, flagged, warnings: []
  };
}
