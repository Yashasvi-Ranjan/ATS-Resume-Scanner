import type { MatchResult, RequirementResult, ResumeEvidence } from '../schemas/match.schema';
import type { StructuredResume } from '../schemas/resume.schema';
import type { GapEvidence, GapItem } from './types';

/**
 * Deterministic gap derivation (no LLM). Rules (documented, testable):
 *
 * Classification
 *   requirement status 'partial'                    -> IMPROVE (presentation)
 *   requirement 'matched' but only listed in skills -> IMPROVE (show usage; evidence exists)
 *   requirement status 'missing'                    -> LEARN_ADD (new_skill: learn/acquire; never "add to resume")
 *   category score < 60 with evidence present       -> IMPROVE (weak presentation), only when no requirement item
 *                                                      of that category already exists
 *   >= 2 experience bullets without any number      -> IMPROVE (suggest the user add a metric THEY can verify)
 *
 * Priority
 *   HIGH   : missing or partial REQUIRED requirement (skill/experience/education/qualification)
 *   MEDIUM : preferred requirement gap; required keyword gap; listed-only required skill; weak category; missing metrics
 *   LOW    : preferred keyword gap; listed-only preferred skill
 */
export const WEAK_CATEGORY_THRESHOLD = 60;

const CATEGORY_LABEL: Record<string, string> = {
  skills: 'skills',
  experience: 'work experience',
  keywords: 'job keywords',
  education: 'education',
  projects: 'projects'
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function requirementItemKey(r: Pick<RequirementResult, 'type' | 'requirement'>): string {
  return `req:${r.type}:${norm(r.requirement)}`;
}

function toEvidence(ev: ResumeEvidence[]): GapEvidence[] {
  return ev
    .filter((e) => e.snippet && e.snippet.trim())
    .slice(0, 3)
    .map((e) => ({ section: e.section, snippet: clip(e.snippet.trim(), 300) }));
}

function reqPriority(r: RequirementResult, kind: 'gap' | 'listed'): GapItem['priority'] {
  const required = r.level === 'required';
  if (kind === 'listed') return required ? 'MEDIUM' : 'LOW';
  if (r.type === 'keyword') return required ? 'MEDIUM' : 'LOW';
  return required ? 'HIGH' : 'MEDIUM';
}

const topicsFor = (r: RequirementResult): string[] => {
  const name = r.requirement;
  switch (r.type) {
    case 'skill':
      return [`${name} fundamentals`, `${name} in real-world projects`, `${name} best practices`];
    case 'experience':
      return ['Hands-on project work in the target domain', 'Open-source or freelance contribution'];
    case 'education':
      return [`Relevant coursework or certification for: ${name}`];
    default:
      return [`${name} concepts and terminology`];
  }
};

function improveItem(r: RequirementResult, listedOnly: boolean): Omit<GapItem, 'rank'> {
  const name = r.requirement;
  const hasEv = r.resumeEvidence.length > 0;
  const base = {
    key: requirementItemKey(r),
    category: 'IMPROVE' as const,
    kind: 'presentation' as const,
    relatedRequirement: name,
    relatedCategory: null,
    requirementType: r.type,
    requirementLevel: r.level,
    evidence: toEvidence(r.resumeEvidence),
    evidenceNote: hasEv ? null : 'No directly quotable evidence was found in the resume for this item.',
    practicalExercise: null as string | null
  };
  if (listedOnly) {
    return {
      ...base,
      priority: reqPriority(r, 'listed'),
      title: `Show how you used ${name}`,
      whyItMatters: `${name} appears in your skills list but not in any experience or project, so a recruiter or ATS sees only a claim.`,
      suggestedAction: `Where it is true, describe a specific task, project or role in which you used ${name}, and what you built or achieved.`,
      suggestedLearningTopics: []
    };
  }
  return {
    ...base,
    priority: reqPriority(r, 'gap'),
    title: `Strengthen how your resume presents ${name}`,
    whyItMatters: `The job ${r.level === 'required' ? 'requires' : 'prefers'} ${name}; your resume shows only partial or related evidence (${clip(r.reason, 160)})`,
    suggestedAction: `Reword the related experience so the connection to ${name} is explicit, using the job's own terminology where it genuinely describes your work. Only state what you have actually done.`,
    suggestedLearningTopics: r.type === 'skill' ? [`${name} fundamentals (to close any remaining gap)`] : []
  };
}

function learnItem(r: RequirementResult): Omit<GapItem, 'rank'> {
  const name = r.requirement;
  const exercise =
    r.type === 'skill'
      ? `Build a small project that uses ${name}, then document what you learned. Once you have genuinely used it, you can describe it truthfully.`
      : null;
  let action: string;
  switch (r.type) {
    case 'skill':
      action = `Learn ${name} and practise it hands-on until you have real experience; it belongs on your resume only after that.`;
      break;
    case 'experience':
      action = `Build the experience this role asks for (${name}) through projects, internships, freelance or open-source work, then present it.`;
      break;
    case 'education':
      action = `Consider acquiring the education or certification described (${name}), or look for roles that accept equivalent experience.`;
      break;
    default:
      action = `Learn the concepts behind "${name}" and gain hands-on exposure before claiming it.`;
  }
  return {
    key: requirementItemKey(r),
    category: 'LEARN_ADD',
    kind: 'new_skill',
    priority: reqPriority(r, 'gap'),
    title: r.type === 'skill' ? `Learn ${name}` : `Close the gap: ${name}`,
    relatedRequirement: name,
    relatedCategory: null,
    requirementType: r.type,
    requirementLevel: r.level,
    evidence: [],
    evidenceNote: 'No evidence found in resume.',
    whyItMatters: `The job ${r.level === 'required' ? 'requires' : 'prefers'} ${name}, and nothing in your resume shows it.`,
    suggestedAction: action,
    suggestedLearningTopics: topicsFor(r),
    practicalExercise: exercise
  };
}

const HAS_NUMBER = /\d/;

function bulletsWithoutNumbers(resume: StructuredResume): { section: string; snippet: string }[] {
  const out: { section: string; snippet: string }[] = [];
  for (const e of resume.experience ?? []) {
    for (const b of e.bullets ?? []) {
      if (b.text && !HAS_NUMBER.test(b.text)) out.push({ section: 'experience', snippet: clip(b.text.trim(), 300) });
    }
  }
  return out;
}

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

export function deriveGapItems(result: MatchResult, resume?: StructuredResume | null): GapItem[] {
  const items: Omit<GapItem, 'rank'>[] = [];
  const seen = new Set<string>();
  const push = (it: Omit<GapItem, 'rank'>) => {
    if (seen.has(it.key)) return;
    seen.add(it.key);
    items.push(it);
  };

  for (const r of result.requirements.missing) push(learnItem(r));
  for (const r of result.requirements.partial) push(improveItem(r, false));
  for (const r of result.requirements.matched) {
    if (r.type === 'skill' && r.reason.startsWith('Listed')) push(improveItem(r, true));
  }

  const coveredTypes = new Set<string>();
  for (const r of [...result.requirements.missing, ...result.requirements.partial]) {
    coveredTypes.add(r.type === 'skill' ? 'skills' : r.type === 'keyword' ? 'keywords' : r.type);
  }
  for (const [name, cat] of Object.entries(result.categories)) {
    if (cat.notAssessable || cat.score === null || cat.score >= WEAK_CATEGORY_THRESHOLD) continue;
    if (cat.evidence.length === 0 || coveredTypes.has(name)) continue;
    const label = CATEGORY_LABEL[name] ?? name;
    push({
      key: `cat:${name}`,
      category: 'IMPROVE',
      kind: 'presentation',
      priority: 'MEDIUM',
      title: `Make your ${label} more relevant to this job`,
      relatedRequirement: null,
      relatedCategory: name,
      requirementType: null,
      requirementLevel: null,
      evidence: toEvidence(cat.evidence),
      evidenceNote: null,
      whyItMatters: `Your ${label} score is ${Math.round(cat.score)}/100. ${cat.deductions[0] ?? cat.explanation}`,
      suggestedAction: `Review your ${label} entries and make the parts that genuinely relate to this job more prominent and specific.`,
      suggestedLearningTopics: [],
      practicalExercise: null
    });
  }

  if (resume) {
    const noNum = bulletsWithoutNumbers(resume);
    if (noNum.length >= 2) {
      push({
        key: 'gen:metrics',
        category: 'IMPROVE',
        kind: 'presentation',
        priority: 'MEDIUM',
        title: 'Consider adding measurable results to your experience bullets',
        relatedRequirement: null,
        relatedCategory: 'experience',
        requirementType: null,
        requirementLevel: null,
        evidence: noNum.slice(0, 3),
        evidenceNote: null,
        whyItMatters: 'Several experience bullets describe duties without any quantity, scale or outcome, which makes impact hard to judge.',
        suggestedAction:
          'For bullets where you know a real, verifiable figure (scale, time saved, users, volume), add it. If you do not have an accurate number, leave the bullet as it is rather than estimating.',
        suggestedLearningTopics: [],
        practicalExercise: null
      });
    }
  }

  items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  return items.map((it, i) => ({ ...it, rank: i + 1 }));
}
