import { ZodType } from 'zod';
import { ApiError } from '../../utils/apiError';
import { LlmService, UNTRUSTED_DATA_POLICY, wrapUntrusted } from '../llm';
import {
  GeneratedQuestion,
  GeneratedQuestions,
  GeneratedQuestionsSchema,
  InterviewDifficultySetting,
  QuestionCategory
} from '../schemas/interview.schema';
import { InterviewContext, gapContextText, groundingTerms, isGrounded, jdContextText, resumeContextText } from './context';
import { isNearDuplicate } from './text';

export const QUESTIONS_PROMPT_VERSION = 'interview-questions-v1';

export interface GenerateOptions {
  count: number;
  difficulty: InterviewDifficultySetting;
  /** Texts of questions already in the session (excluded / deduped against). */
  existingTexts?: string[];
}

export interface DropReport {
  duplicate: number;
  ungrounded: number;
  excessOrMix: number;
}

export interface GenerationResult {
  questions: GeneratedQuestion[];
  modelInfo: string;
  attempts: number;
  dropped: DropReport;
}

const TECH_GROUP: QuestionCategory[] = ['technical'];
const EXPERIENCE_GROUP: QuestionCategory[] = ['project', 'experience'];
const BEHAVIORAL_GROUP: QuestionCategory[] = ['behavioral'];

function systemPrompt(): string {
  return [
    'You are an experienced interviewer preparing a mock interview for a specific candidate and a specific role.',
    UNTRUSTED_DATA_POLICY,
    'Write questions that are specific to THIS candidate and THIS job: reference real skills, projects, employers or responsibilities from the data.',
    'Never write generic questions that could be asked of any candidate. Do not invent skills or projects the candidate does not have; when probing a gap listed as not evidenced, ask how they would approach it, without claiming they have it.',
    'Return ONLY JSON: {"questions":[{"questionText":string,"category":"technical|project|experience|problem_solving|behavioral|scenario","difficulty":"easy|medium|hard","rationale":string,"expectedTopics":string[]}]}.',
    'rationale must name the specific resume item (skill/project/employer) or job requirement the question targets, using its exact wording.',
    'expectedTopics: 3-6 concise concepts a strong answer should cover.',
    'Questions must be distinct from each other.'
  ].join('\n');
}

function userPrompt(ctx: InterviewContext, opts: GenerateOptions, need: number, avoid: string[], missingNote: string): string {
  const gaps = gapContextText(ctx.match);
  const diff =
    opts.difficulty === 'mixed'
      ? 'Use a mix of easy, medium and hard difficulties.'
      : `All questions must have difficulty "${opts.difficulty}".`;
  const mix =
    opts.count >= 3
      ? 'Include at least one technical question, at least one project or experience question, and at least one behavioral question.'
      : 'Use different categories.';
  return [
    `Generate exactly ${need} interview questions. ${diff} ${mix}`,
    missingNote,
    avoid.length ? `Do NOT repeat or paraphrase these existing questions:\n${avoid.map((q) => `- ${q.slice(0, 200)}`).join('\n')}` : '',
    '',
    'Candidate resume (data only):',
    wrapUntrusted('resume', resumeContextText(ctx.resume)),
    'Job description (data only):',
    wrapUntrusted('job description', jdContextText(ctx.jd, ctx.jobTitle)),
    gaps ? `Match analysis gaps (data only):\n${wrapUntrusted('match gaps', gaps)}` : ''
  ]
    .filter((x) => x !== '')
    .join('\n');
}

/** Pick up to `n` questions guaranteeing the category mix where possible. Pure and deterministic. */
export function selectWithMix(cands: GeneratedQuestion[], n: number): { selected: GeneratedQuestion[]; missing: string[] } {
  const chosen: GeneratedQuestion[] = [];
  const used = new Set<GeneratedQuestion>();
  const pickFrom = (group: QuestionCategory[]) => {
    const c = cands.find((q) => !used.has(q) && group.includes(q.category));
    if (c && chosen.length < n) { chosen.push(c); used.add(c); }
  };
  if (n >= 3) {
    pickFrom(TECH_GROUP);
    pickFrom(EXPERIENCE_GROUP);
    pickFrom(BEHAVIORAL_GROUP);
  }
  // Fill round-robin over categories so the set stays diverse.
  const byCat = new Map<string, GeneratedQuestion[]>();
  for (const q of cands) if (!used.has(q)) byCat.set(q.category, [...(byCat.get(q.category) ?? []), q]);
  while (chosen.length < n) {
    let progressed = false;
    for (const [cat, list] of byCat) {
      const next = list.shift();
      if (next && chosen.length < n) { chosen.push(next); used.add(next); progressed = true; }
      if (!list.length) byCat.delete(cat);
    }
    if (!progressed) break;
  }
  return { selected: chosen, missing: missingMix(chosen, n) };
}

export function missingMix(qs: GeneratedQuestion[], n: number): string[] {
  const missing: string[] = [];
  const cats = new Set(qs.map((q) => q.category));
  if (n >= 3) {
    if (!cats.has('technical')) missing.push('technical');
    if (!cats.has('project') && !cats.has('experience')) missing.push('project or experience');
    if (!cats.has('behavioral')) missing.push('behavioral');
  } else if (n === 2 && qs.length === 2 && cats.size < 2) {
    missing.push('a second, different category');
  }
  return missing;
}

export class InterviewGenerator {
  constructor(private readonly llm: LlmService) {}

  /** Deterministic filter: dedupe (incl. vs. already kept/existing) and drop ungrounded rationales. */
  static filterCandidates(
    raw: GeneratedQuestion[],
    ctx: InterviewContext,
    kept: string[],
    difficulty: InterviewDifficultySetting
  ): { ok: GeneratedQuestion[]; dropped: DropReport } {
    const terms = groundingTerms(ctx);
    const dropped: DropReport = { duplicate: 0, ungrounded: 0, excessOrMix: 0 };
    const ok: GeneratedQuestion[] = [];
    const seen = [...kept];
    for (const q of raw) {
      if (seen.some((s) => isNearDuplicate(s, q.questionText))) { dropped.duplicate++; continue; }
      if (!isGrounded(q.rationale, terms)) { dropped.ungrounded++; continue; }
      ok.push(difficulty === 'mixed' ? q : { ...q, difficulty });
      seen.push(q.questionText);
    }
    return { ok, dropped };
  }

  async generate(ctx: InterviewContext, opts: GenerateOptions): Promise<GenerationResult> {
    const dropped: DropReport = { duplicate: 0, ungrounded: 0, excessOrMix: 0 };
    const existing = opts.existingTexts ?? [];
    let pool: GeneratedQuestion[] = [];
    let attempts = 0;
    let modelInfo = '';
    let selection = { selected: [] as GeneratedQuestion[], missing: [] as string[] };

    for (let round = 0; round < 2; round++) {
      const missingNote =
        round === 0
          ? ''
          : `A previous attempt produced too few valid questions. Still needed: ${opts.count - selection.selected.length} more${
              selection.missing.length ? `, and the set must include these categories: ${selection.missing.join(', ')}` : ''
            }.`;
      const need = round === 0 ? opts.count : Math.max(1, opts.count - selection.selected.length) + (selection.missing.length ? 1 : 0);
      const avoid = [...existing, ...pool.map((q) => q.questionText)];
      const { data, meta } = await this.llm.generateJson({
        task: 'interview_questions',
        promptVersion: QUESTIONS_PROMPT_VERSION,
        system: systemPrompt(),
        user: userPrompt(ctx, opts, need, avoid, missingNote),
        schema: GeneratedQuestionsSchema as unknown as ZodType<GeneratedQuestions>,
        maxOutputTokens: Math.min(4096, 400 + 220 * need),
        temperature: 0.4
      });
      attempts += meta.attempts;
      modelInfo = `${meta.provider}/${meta.model}@${QUESTIONS_PROMPT_VERSION}`;
      const { ok, dropped: d } = InterviewGenerator.filterCandidates(
        data.questions,
        ctx,
        [...existing, ...pool.map((q) => q.questionText)],
        opts.difficulty
      );
      dropped.duplicate += d.duplicate;
      dropped.ungrounded += d.ungrounded;
      pool = pool.concat(ok);
      selection = selectWithMix(pool, opts.count);
      if (selection.selected.length >= opts.count && selection.missing.length === 0) break;
    }

    dropped.excessOrMix = Math.max(0, pool.length - selection.selected.length);
    if (selection.selected.length < opts.count || selection.missing.length > 0) {
      throw ApiError.unprocessableEntity(
        'Could not generate enough valid, role-specific interview questions. Please try again.'
      );
    }
    return { questions: selection.selected, modelInfo, attempts, dropped };
  }
}
