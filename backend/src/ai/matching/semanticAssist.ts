import {
  LlmService,
  UNTRUSTED_DATA_POLICY,
  truncateForPrompt,
  wrapUntrusted
} from '../llm';
import { MatchResult, RequirementResult, SemanticAssistOutputSchema } from '../schemas/match.schema';
import { OverrideMap, requirementKey } from './engine';

export const ASSIST_PROMPT_VERSION = 'match-assist-v1';
const MAX_CANDIDATES = 12;
const MAX_RESUME_CHARS = 12000;

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** Skill/keyword requirements the deterministic pass could not fully credit. */
export function pickAssistCandidates(result: MatchResult): RequirementResult[] {
  const all = [...result.requirements.missing, ...result.requirements.partial].filter(
    (r) => r.type === 'skill' || r.type === 'keyword'
  );
  const rank = (r: RequirementResult) => (r.level === 'required' ? 0 : 1) * 2 + (r.status === 'missing' ? 0 : 1);
  return all
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i)
    .map((x) => x.r)
    .slice(0, MAX_CANDIDATES);
}

/** True only when `snippet` literally occurs in the resume text (whitespace/case-insensitive). */
export function snippetExistsInResume(snippet: string, resumeText: string): boolean {
  const s = norm(snippet);
  if (s.length < 12 || s.length > 400) return false;
  return norm(resumeText).includes(s);
}

export interface AssistOutcome {
  overrides: OverrideMap;
  model: string;
  considered: number;
}

/**
 * One LLM call. The model may only classify requirement/evidence pairs; every upgrade must cite a
 * snippet that is verified verbatim against the resume text. It never produces scores.
 * Throws on LLM failure (caller treats that as "assist unavailable").
 */
export async function runSemanticAssist(
  llm: LlmService,
  resumeText: string,
  candidates: RequirementResult[]
): Promise<AssistOutcome> {
  const system = [
    UNTRUSTED_DATA_POLICY,
    'You help explain a resume-to-job match. For each listed requirement, decide whether the resume text shows genuinely equivalent or closely related experience that a keyword/taxonomy match could have missed.',
    'Rules: verdict "matched" only for clear semantic equivalence; "partial" for closely related experience; otherwise "none".',
    'For "matched" or "partial" you MUST copy ONE verbatim snippet (12-300 characters) from the resume data that supports your verdict. If you cannot quote the resume exactly, answer "none".',
    'Never output scores or numbers. Keep each explanation under 200 characters.',
    'Respond with JSON only: {"assessments":[{"requirement":"<exact name>","verdict":"matched|partial|none","resumeSnippet":"<verbatim quote or null>","explanation":"<short>"}]}'
  ].join('\n');
  const user = [
    'Requirements to assess (data):',
    wrapUntrusted('requirements', JSON.stringify(candidates.map((c) => ({ requirement: c.requirement, type: c.type, level: c.level })))),
    'Resume text (data):',
    wrapUntrusted('resume', truncateForPrompt(resumeText, MAX_RESUME_CHARS))
  ].join('\n\n');

  const { data, meta } = await llm.generateJson({
    task: 'match_assist',
    promptVersion: ASSIST_PROMPT_VERSION,
    system,
    user,
    schema: SemanticAssistOutputSchema,
    maxOutputTokens: 1500,
    temperature: 0
  });

  const byName = new Map(candidates.map((c) => [norm(c.requirement), c]));
  const overrides: OverrideMap = {};
  for (const a of data.assessments ?? []) {
    if (a.verdict === 'none') continue;
    const cand = byName.get(norm(a.requirement));
    if (!cand || (cand.type !== 'skill' && cand.type !== 'keyword')) continue;
    const snippet = (a.resumeSnippet ?? '').replace(/\s+/g, ' ').trim();
    if (!snippetExistsInResume(snippet, resumeText)) continue; // unverifiable citation: ignored
    const key = requirementKey(cand.type, cand.requirement);
    if (overrides[key]) continue;
    const expl = (a.explanation ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
    overrides[key] = {
      status: a.verdict,
      evidence: { section: 'resume', snippet: snippet.slice(0, 300), source: 'semantic_assist' },
      reason: `Semantic assist (${a.verdict}, bounded credit): ${expl || 'related experience cited from the resume.'}`
    };
  }
  return { overrides, model: meta.model, considered: candidates.length };
}
