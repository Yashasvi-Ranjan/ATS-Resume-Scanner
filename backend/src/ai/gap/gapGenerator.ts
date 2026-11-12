import { AnalysisStatus, Prisma, RecommendationStatus } from '@prisma/client';
import prisma from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { aiLog, getLlmService } from '../llm';
import { getEffectiveResumeData } from '../resume';
import { MatchResultSchema } from '../schemas/match.schema';
import { GAP_PROMPT_VERSION, GAP_VERSION, GapItem } from '../schemas/recommendation.schema';
import { deriveGapItems } from './derive';
import { enrichGapItems } from './enrich';

export interface GenerateOptions {
  /** Regenerate even if AI recommendations already exist for this analysis. */
  force?: boolean;
  /** Set false to skip the optional LLM wording enrichment (deterministic only). */
  enrich?: boolean;
}

export interface GenerateOutcome {
  generated: boolean;
  created: number;
  updated: number;
  removed: number;
  keptProgressed: number;
  enriched: boolean;
}

// Serialise generation per analysis so a double-fired hook can never create duplicates.
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  locks.set(id, next);
  void next.finally(() => {
    if (locks.get(id) === next) locks.delete(id);
  }).catch(() => undefined);
  return next;
}

const detailsOf = (item: GapItem, enriched: boolean, model?: string): Prisma.InputJsonValue => ({
  key: item.key,
  kind: item.kind,
  relatedRequirement: item.relatedRequirement,
  relatedCategory: item.relatedCategory,
  requirementType: item.requirementType,
  requirementLevel: item.requirementLevel,
  evidence: item.evidence,
  evidenceNote: item.evidenceNote,
  whyItMatters: item.whyItMatters,
  suggestedAction: item.suggestedAction,
  suggestedLearningTopics: item.suggestedLearningTopics,
  practicalExercise: item.practicalExercise,
  rank: item.rank,
  enriched,
  gapVersion: GAP_VERSION,
  ...(enriched ? { promptVersion: GAP_PROMPT_VERSION, model: model ?? null } : {})
});

export class GapGenerator {
  /** Generates (or regenerates) AI recommendations for a COMPLETED analysis. Ownership is the caller's responsibility. */
  static generateForAnalysis(analysisId: string, opts: GenerateOptions = {}): Promise<GenerateOutcome> {
    return withLock(analysisId, () => GapGenerator.run(analysisId, opts));
  }

  private static async run(analysisId: string, opts: GenerateOptions): Promise<GenerateOutcome> {
    const analysis = await prisma.jobAnalysis.findUnique({ where: { id: analysisId } });
    if (!analysis) throw ApiError.notFound('Job analysis record not found');
    if (analysis.status !== AnalysisStatus.COMPLETED) {
      throw ApiError.conflict('Recommendations can only be generated for a completed analysis');
    }
    const parsed = MatchResultSchema.safeParse(analysis.resultData);
    if (!parsed.success) throw ApiError.conflict('Analysis has no usable result data');

    if (!opts.force) {
      const existing = await prisma.analysisRecommendation.count({ where: { analysisId, source: 'AI' } });
      if (existing > 0) {
        return { generated: false, created: 0, updated: 0, removed: 0, keptProgressed: 0, enriched: false };
      }
    }

    let resume = null;
    try {
      const r = await prisma.resume.findUnique({ where: { id: analysis.resumeId } });
      resume = r ? getEffectiveResumeData(r) : null;
    } catch {
      resume = null;
    }

    let items = deriveGapItems(parsed.data, resume);
    let enriched = false;
    let model: string | undefined;
    if (opts.enrich !== false && items.length > 0) {
      try {
        const out = await enrichGapItems(getLlmService(), items);
        items = out.items;
        enriched = out.enriched;
        model = out.model;
      } catch {
        enriched = false; // LLM not configured / unavailable: deterministic wording stands
      }
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.analysisRecommendation.findMany({ where: { analysisId, source: 'AI' } });
      const keyOf = (d: unknown) => ((d as { key?: string } | null)?.key ?? '') as string;
      const progressedKeys = new Set(
        existing.filter((e) => e.status !== RecommendationStatus.NOT_STARTED).map((e) => keyOf(e.details))
      );
      const pending = existing.filter((e) => e.status === RecommendationStatus.NOT_STARTED);
      const pendingByKey = new Map<string, (typeof pending)[number]>();
      const dupes: string[] = [];
      for (const p of pending) {
        const k = keyOf(p.details);
        if (k && !pendingByKey.has(k)) pendingByKey.set(k, p);
        else dupes.push(p.id);
      }
      const wanted = items.filter((i) => !progressedKeys.has(i.key));
      const wantedKeys = new Set(wanted.map((i) => i.key));
      const removeIds = [...dupes, ...[...pendingByKey.entries()].filter(([k]) => !wantedKeys.has(k)).map(([, v]) => v.id)];
      if (removeIds.length) await tx.analysisRecommendation.deleteMany({ where: { id: { in: removeIds } } });

      let created = 0;
      let updated = 0;
      for (const item of wanted) {
        const data = {
          category: item.category,
          title: item.title,
          description: item.suggestedAction,
          reason: item.whyItMatters,
          priority: item.priority,
          details: detailsOf(item, enriched, model)
        };
        const prev = pendingByKey.get(item.key);
        if (prev) {
          await tx.analysisRecommendation.update({ where: { id: prev.id }, data });
          updated++;
        } else {
          await tx.analysisRecommendation.create({ data: { ...data, analysisId, source: 'AI' } });
          created++;
        }
      }
      return { created, updated, removed: removeIds.length, keptProgressed: existing.length - pending.length };
    });

    return { generated: true, ...outcome, enriched };
  }

  /** Safe wrapper for hooks/background use: never throws. */
  static async tryGenerate(analysisId: string, opts: GenerateOptions = {}): Promise<void> {
    try {
      await GapGenerator.generateForAnalysis(analysisId, opts);
    } catch {
      aiLog.error({ event: 'gap.generate_failed' });
    }
  }
}
