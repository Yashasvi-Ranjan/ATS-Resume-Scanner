import { ZodType } from 'zod';
import { LlmService, UNTRUSTED_DATA_POLICY, safeErrorMessage } from '../llm';
import {
  FinalReport,
  INTERVIEW_DISCLAIMER,
  ReportNarrativeSchema
} from '../schemas/interview.schema';
import { DIMENSION_NAMES } from '../schemas/interview.schema';

export const REPORT_PROMPT_VERSION = 'interview-report-v1';

export interface ReportQuestion {
  id: string;
  order: number;
  category: string | null;
  difficulty: string | null;
  source: string;
  questionText: string;
  answer: { id: string; answerText: string } | null;
  evaluation: { score: number | null; feedback: string | null; details: unknown } | null;
}

export const SCORING_NOTE =
  'Overall and per-category averages use only evaluated AI-generated questions. Unanswered questions and practice (user-authored) questions are listed but excluded from the averages.';

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

function detailsOf(q: ReportQuestion): Record<string, unknown> {
  const d = q.evaluation?.details;
  return d && typeof d === 'object' ? (d as Record<string, unknown>) : {};
}

function topFrequent(lists: string[][], limit = 5): string[] {
  const counts = new Map<string, { text: string; n: number }>();
  for (const list of lists) {
    for (const raw of list) {
      const text = String(raw).trim();
      if (!text) continue;
      const key = text.toLowerCase();
      const cur = counts.get(key);
      if (cur) cur.n++;
      else counts.set(key, { text, n: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.text.localeCompare(b.text))
    .slice(0, limit)
    .map((c) => c.text);
}

const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export class ReportGenerator {
  constructor(private readonly llm: LlmService | null) {}

  /** Purely deterministic aggregation from persisted data. */
  static aggregate(questions: ReportQuestion[], now = new Date()): FinalReport {
    const ordered = [...questions].sort((a, b) => a.order - b.order);
    const ai = ordered.filter((q) => q.source !== 'USER');
    const scored = ai.filter((q) => q.answer && q.evaluation && typeof q.evaluation.score === 'number');
    const scores = scored.map((q) => q.evaluation!.score as number);

    const byCat: Record<string, number[]> = {};
    for (const q of scored) (byCat[q.category ?? 'uncategorized'] ??= []).push(q.evaluation!.score as number);
    const averageByCategory: Record<string, number> = {};
    for (const [k, v] of Object.entries(byCat)) averageByCategory[k] = mean(v);

    const dimSums: Record<string, number[]> = {};
    for (const q of scored) {
      const dims = detailsOf(q).dimensions as Record<string, unknown> | null | undefined;
      if (!dims) continue;
      for (const d of DIMENSION_NAMES) {
        const v = dims[d];
        if (typeof v === 'number') (dimSums[d] ??= []).push(v);
      }
    }
    const averageByDimension: Record<string, number> = {};
    for (const [k, v] of Object.entries(dimSums)) averageByDimension[k] = mean(v);

    const answered = ordered.filter((q) => q.answer).length;
    const evaluated = scored.length;
    const overallScore = scores.length ? mean(scores) : null;
    const practice = ordered.filter((q) => q.source === 'USER').length;

    const summary =
      overallScore === null
        ? `You answered ${answered} of ${ordered.length} questions; none have been evaluated yet.`
        : `You answered ${answered} of ${ordered.length} questions. Average score across ${evaluated} evaluated question(s): ${overallScore}/100.`;

    return {
      overallScore,
      averageByCategory,
      ...(Object.keys(averageByDimension).length ? { averageByDimension } : {}),
      counts: {
        totalQuestions: ordered.length,
        answered,
        unanswered: ordered.length - answered,
        evaluated,
        answeredNotEvaluated: ai.filter((q) => q.answer).length - evaluated,
        practiceQuestions: practice
      },
      scoringNote: SCORING_NOTE,
      summary,
      narrative: null,
      narrativeNote: 'Narrative summary has not been generated.',
      topStrengths: topFrequent(scored.map((q) => strArr(detailsOf(q).strengths))),
      areasToImprove: topFrequent(scored.map((q) => strArr(detailsOf(q).weaknesses))),
      topicsToRevise: topFrequent(scored.map((q) => [...strArr(detailsOf(q).topicsToRevise), ...strArr(detailsOf(q).missingConcepts)])),
      perQuestion: ordered.map((q) => ({
        questionId: q.id,
        order: q.order,
        category: q.category,
        difficulty: q.difficulty,
        source: q.source,
        questionText: q.questionText,
        answered: !!q.answer,
        evaluated: !!q.evaluation && typeof q.evaluation.score === 'number',
        score: q.evaluation && typeof q.evaluation.score === 'number' ? q.evaluation.score : null,
        feedback: q.evaluation?.feedback ?? null
      })),
      generatedAt: now.toISOString(),
      disclaimer: INTERVIEW_DISCLAIMER
    };
  }

  /** Deterministic report plus one optional narrative LLM call. Never throws because of the LLM. */
  async generate(questions: ReportQuestion[], jobTitle: string): Promise<{ report: FinalReport; modelInfo: string | null }> {
    const report = ReportGenerator.aggregate(questions);
    if (!this.llm || report.counts.evaluated === 0) {
      report.narrativeNote = this.llm ? 'No evaluated answers to summarise.' : 'Narrative unavailable (LLM not configured).';
      return { report, modelInfo: null };
    }
    try {
      const facts = {
        jobTitle,
        overallScore: report.overallScore,
        averageByCategory: report.averageByCategory,
        counts: report.counts,
        topStrengths: report.topStrengths,
        areasToImprove: report.areasToImprove,
        topicsToRevise: report.topicsToRevise
      };
      const { data, meta } = await this.llm.generateJson({
        task: 'interview_report',
        promptVersion: REPORT_PROMPT_VERSION,
        system: [
          'You write a short, encouraging, honest coaching summary of a mock interview.',
          UNTRUSTED_DATA_POLICY,
          'Use ONLY the facts in the JSON given by the user. Do not invent scores, skills or experience. Do not state or imply a hiring decision.',
          'Return ONLY JSON: {"narrative": string} (max ~120 words).'
        ].join('\n'),
        user: `Facts (JSON):\n${JSON.stringify(facts)}`,
        schema: ReportNarrativeSchema as unknown as ZodType<{ narrative: string }>,
        maxOutputTokens: 500,
        temperature: 0.3
      });
      report.narrative = data.narrative;
      report.narrativeNote = null;
      return { report, modelInfo: `${meta.provider}/${meta.model}@${REPORT_PROMPT_VERSION}` };
    } catch (err) {
      report.narrative = null;
      report.narrativeNote = `Narrative unavailable: ${safeErrorMessage(err)}`;
      return { report, modelInfo: null };
    }
  }
}
