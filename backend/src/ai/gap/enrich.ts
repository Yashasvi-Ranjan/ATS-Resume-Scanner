import { LlmService, UNTRUSTED_DATA_POLICY, wrapUntrusted } from '../llm';
import { GAP_PROMPT_VERSION, GapEnrichmentOutputSchema, GapItem } from '../schemas/recommendation.schema';

const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|org|net|io|edu|dev)\b\/?)/i;
const ADD_TO_RESUME_RE = /\b(add|include|list|put|insert)\b[^.]{0,60}\b(to|on|in|into)\b[^.]{0,20}\b(your )?(resume|cv)\b/i;
const INVENTED_METRIC_RE = /\d+(\.\d+)?\s*(%|x\b|percent)|[$€£]\s*\d/i;

export interface EnrichOutcome {
  items: GapItem[];
  enriched: boolean;
  model?: string;
}

function clean(s: string | null | undefined, max: number): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t || t.length < 5 || URL_RE.test(t) || INVENTED_METRIC_RE.test(t)) return null;
  return t.slice(0, max);
}

/** For skills the candidate lacks, wording must never tell them to put it on the resume now. */
function safeForKind(text: string, item: GapItem): boolean {
  if (item.kind === 'new_skill' && ADD_TO_RESUME_RE.test(text) && !/\b(only after|once you|after you|until you)\b/i.test(text)) return false;
  return true;
}

/**
 * One optional LLM call that may only reword fields of EXISTING items (matched by key). It cannot add, remove or
 * re-categorise items, change priorities, evidence or requirements. Any failure returns the input unchanged.
 */
export async function enrichGapItems(llm: LlmService, items: GapItem[]): Promise<EnrichOutcome> {
  if (items.length === 0) return { items, enriched: false };
  const system = [
    UNTRUSTED_DATA_POLICY,
    'You improve the wording of career-gap recommendations for a job seeker. You receive a list of existing items (data). For each item you may rewrite: whyItMatters, suggestedAction, suggestedLearningTopics (generic topic names, max 5), practicalExercise.',
    'Rules: reference items ONLY by their exact "id". Do not add, remove or merge items. Do not invent requirements, skills, employers, numbers or metrics. Do not output URLs or course/website names.',
    'For items with kind "new_skill" the candidate does NOT have the skill: tell them to learn or practise it, never to add it to their resume until they have genuinely used it.',
    'For items with kind "presentation" the candidate has real evidence: advise on wording only, never supply a number or achievement they have not stated.',
    'Respond with JSON only: {"items":[{"id":"<id>","whyItMatters":"...","suggestedAction":"...","suggestedLearningTopics":["..."],"practicalExercise":"..."}]}'
  ].join('\n');
  const payload = items.map((i) => ({
    id: i.key,
    kind: i.kind,
    category: i.category,
    requirement: i.relatedRequirement,
    level: i.requirementLevel,
    hasEvidence: i.evidence.length > 0,
    evidence: i.evidence.map((e) => e.snippet.slice(0, 200)),
    currentAction: i.suggestedAction
  }));
  const user = ['Items to reword (data):', wrapUntrusted('gap_items', JSON.stringify(payload))].join('\n\n');

  try {
    const { data, meta } = await llm.generateJson({
      task: 'gap_enrich',
      promptVersion: GAP_PROMPT_VERSION,
      system,
      user,
      schema: GapEnrichmentOutputSchema,
      maxOutputTokens: 3000,
      temperature: 0.2
    });
    const byKey = new Map(items.map((i) => [i.key, i]));
    const patches = new Map<string, (typeof data.items)[number]>();
    for (const p of data.items) {
      if (byKey.has(p.id) && !patches.has(p.id)) patches.set(p.id, p); // unknown ids dropped
    }
    let changed = 0;
    const out = items.map((item) => {
      const p = patches.get(item.key);
      if (!p) return item;
      const next = { ...item };
      const why = clean(p.whyItMatters, 400);
      const act = clean(p.suggestedAction, 500);
      const ex = clean(p.practicalExercise, 400);
      const topics = (p.suggestedLearningTopics ?? [])
        .map((t) => clean(t, 80))
        .filter((t): t is string => !!t)
        .slice(0, 5);
      if (why && safeForKind(why, item)) next.whyItMatters = why;
      if (act && safeForKind(act, item)) next.suggestedAction = act;
      if (ex && safeForKind(ex, item) && item.kind === 'new_skill') next.practicalExercise = ex;
      if (topics.length && item.kind === 'new_skill') next.suggestedLearningTopics = topics;
      if (JSON.stringify(next) !== JSON.stringify(item)) changed++;
      return next;
    });
    return { items: out, enriched: changed > 0, model: meta.model };
  } catch {
    return { items, enriched: false };
  }
}
