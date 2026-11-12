import { AnalysisStatus, Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { AiError, aiLog, getLlmService, hashInput, safeErrorMessage } from '../llm';
import { ensureJdParsed, getEffectiveJdData } from '../jd';
import { ensureResumeParsed } from '../resume';
import { MatchResult } from '../schemas/match.schema';
import { MatchingEngine, SCORING_VERSION, defaultWeights, resumeToText } from './engine';
import { onAnalysisCompleted } from './hooks';
import { ASSIST_PROMPT_VERSION, pickAssistCandidates, runSemanticAssist } from './semanticAssist';

/** PROCESSING (or never-started PENDING) rows untouched for this long are treated as abandoned. */
export const ANALYSIS_STALE_MS = 5 * 60 * 1000;

export function isStale(a: { status: AnalysisStatus; updatedAt: Date }, now = Date.now()): boolean {
  return (
    (a.status === AnalysisStatus.PROCESSING || a.status === AnalysisStatus.PENDING) &&
    now - a.updatedAt.getTime() > ANALYSIS_STALE_MS
  );
}

function failureMessage(err: unknown): string {
  if (err instanceof ApiError) return err.isOperational ? err.message : 'Analysis failed unexpectedly';
  if (err instanceof AiError) return safeErrorMessage(err);
  return 'Analysis failed unexpectedly';
}

export function buildSuggestions(result: MatchResult): string[] {
  const out: string[] = [];
  for (const r of result.requirements.missing.filter((x) => x.type === 'skill' && x.level === 'required').slice(0, 5)) {
    out.push(`If you have real experience with ${r.requirement}, add it with a concrete example in experience or projects.`);
  }
  for (const r of result.requirements.matched.filter((x) => x.type === 'skill' && x.reason.startsWith('Listed')).slice(0, 3)) {
    out.push(`Show how you used ${r.requirement} in a project or role instead of only listing it.`);
  }
  for (const r of result.requirements.partial.filter((x) => x.type === 'skill').slice(0, 3)) {
    out.push(`Clarify your experience relevant to ${r.requirement}.`);
  }
  return out;
}

function isDbGone(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError || err instanceof Prisma.PrismaClientInitializationError;
}

export class AnalysisRunner {
  /** Tests (or ops) can turn off the automatic background start after POST /analyses. */
  static autoStart = true;
  private static inFlight = new Set<Promise<void>>();

  /** Fire-and-forget; never rejects. */
  static runInBackground(analysisId: string): void {
    const p: Promise<void> = new Promise<void>((resolve) => setImmediate(resolve))
      .then(() => AnalysisRunner.run(analysisId))
      .catch(() => {
        aiLog.error({ event: 'analysis.run.unhandled' });
      })
      .finally(() => {
        AnalysisRunner.inFlight.delete(p);
      });
    AnalysisRunner.inFlight.add(p);
  }

  /** Resolves when no background runs are in flight (for tests and graceful shutdown). */
  static async whenIdle(): Promise<void> {
    while (AnalysisRunner.inFlight.size > 0) {
      await Promise.all(Array.from(AnalysisRunner.inFlight));
    }
  }

  /**
   * PENDING -> PROCESSING -> COMPLETED | FAILED. Never throws; never leaves a claimed row in PROCESSING.
   */
  static async run(analysisId: string): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - ANALYSIS_STALE_MS);
      const claimed = await prisma.jobAnalysis.updateMany({
        where: {
          id: analysisId,
          OR: [
            { status: AnalysisStatus.PENDING },
            { status: AnalysisStatus.PROCESSING, updatedAt: { lt: cutoff } }
          ]
        },
        data: { status: AnalysisStatus.PROCESSING, startedAt: new Date(), errorMessage: null }
      });
      if (claimed.count === 0) return; // someone else owns it, or it is already finished

      let completed: { userId: string; resumeId: string; jobDescriptionId: string; result: MatchResult } | null = null;
      try {
        completed = await AnalysisRunner.execute(analysisId);
      } catch (err) {
        await prisma.jobAnalysis
          .updateMany({
            where: { id: analysisId, status: AnalysisStatus.PROCESSING },
            data: { status: AnalysisStatus.FAILED, errorMessage: failureMessage(err), completedAt: new Date() }
          })
          .catch(() => undefined);
        aiLog.error({ event: 'analysis.run.failed' });
      }
      if (completed) {
        await onAnalysisCompleted({ analysisId, ...completed });
      }
    } catch (err) {
      if (!isDbGone(err)) aiLog.error({ event: 'analysis.run.error' });
    }
  }

  private static async execute(analysisId: string) {
    const analysis = await prisma.jobAnalysis.findUnique({ where: { id: analysisId } });
    if (!analysis) throw ApiError.notFound('Job analysis record not found');
    const { userId, resumeId, jobDescriptionId } = analysis;

    const { resume, data: resumeData } = await ensureResumeParsed(userId, resumeId);
    const jdRecord = await ensureJdParsed(userId, jobDescriptionId);
    const jdData = getEffectiveJdData(jdRecord);

    const weights = defaultWeights();
    const inputHash = hashInput(resumeData, jdData, weights, SCORING_VERSION, ASSIST_PROMPT_VERSION);

    // Cache: identical inputs already analysed for this user/resume/JD -> copy, no recompute and no LLM.
    const cached = await prisma.jobAnalysis.findFirst({
      where: {
        userId,
        resumeId,
        jobDescriptionId,
        status: AnalysisStatus.COMPLETED,
        inputHash,
        id: { not: analysisId },
        resultData: { not: Prisma.DbNull }
      },
      orderBy: { completedAt: 'desc' }
    });
    if (cached && cached.resultData) {
      const done = await prisma.jobAnalysis.updateMany({
        where: { id: analysisId, status: AnalysisStatus.PROCESSING },
        data: {
          status: AnalysisStatus.COMPLETED,
          overallScore: cached.overallScore,
          skillsScore: cached.skillsScore,
          experienceScore: cached.experienceScore,
          keywordsScore: cached.keywordsScore,
          educationScore: cached.educationScore,
          projectRelevanceScore: cached.projectRelevanceScore,
          strengths: cached.strengths,
          weaknesses: cached.weaknesses,
          suggestions: cached.suggestions,
          missingSkills: cached.missingSkills,
          resultData: cached.resultData as Prisma.InputJsonValue,
          scoringVersion: cached.scoringVersion,
          modelInfo: cached.modelInfo,
          inputHash,
          errorMessage: null,
          completedAt: new Date()
        }
      });
      if (done.count === 0) throw new Error('claim lost');
      return { userId, resumeId, jobDescriptionId, result: cached.resultData as unknown as MatchResult };
    }

    // 1) deterministic score
    let result = MatchingEngine.score(resumeData, jdData, { weights });

    // 2) optional semantic assist (one LLM call max). Failure never fails the analysis.
    let modelInfo = `deterministic:${SCORING_VERSION}`;
    const candidates = pickAssistCandidates(result);
    if (candidates.length > 0) {
      try {
        const llm = getLlmService();
        const text = resume.extractedText && resume.extractedText.trim() ? resume.extractedText : resumeToText(resumeData);
        const outcome = await runSemanticAssist(llm, text, candidates);
        const adjusted = Object.keys(outcome.overrides).length;
        if (adjusted > 0) result = MatchingEngine.score(resumeData, jdData, { weights, overrides: outcome.overrides });
        result = {
          ...result,
          semanticAssist: { used: true, model: outcome.model, promptVersion: ASSIST_PROMPT_VERSION, adjustedRequirements: adjusted }
        };
        modelInfo = `${modelInfo}; semantic-assist:${outcome.model}:${ASSIST_PROMPT_VERSION}`;
      } catch {
        result = {
          ...result,
          uncertainty: [
            ...result.uncertainty,
            'Semantic assist was unavailable; the score is fully deterministic and unmatched requirements were not re-checked for semantic equivalents.'
          ],
          semanticAssist: { used: false, model: null, promptVersion: ASSIST_PROMPT_VERSION }
        };
      }
    } else {
      result = { ...result, semanticAssist: { used: false, model: null, promptVersion: ASSIST_PROMPT_VERSION } };
    }

    const c = result.categories;
    const missingSkills = result.requirements.missing.filter((r) => r.type === 'skill').map((r) => r.requirement);
    const done = await prisma.jobAnalysis.updateMany({
      where: { id: analysisId, status: AnalysisStatus.PROCESSING },
      data: {
        status: AnalysisStatus.COMPLETED,
        overallScore: result.overallScore,
        skillsScore: c.skills.score,
        experienceScore: c.experience.score,
        keywordsScore: c.keywords.score,
        educationScore: c.education.score,
        projectRelevanceScore: c.projects.score,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        suggestions: buildSuggestions(result),
        missingSkills,
        resultData: result as unknown as Prisma.InputJsonValue,
        scoringVersion: result.scoringVersion,
        modelInfo,
        inputHash,
        errorMessage: null,
        completedAt: new Date()
      }
    });
    if (done.count === 0) throw new Error('claim lost');
    return { userId, resumeId, jobDescriptionId, result };
  }
}
