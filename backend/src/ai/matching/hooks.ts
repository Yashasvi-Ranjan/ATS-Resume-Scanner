import { aiLog } from '../llm';
import type { MatchResult } from '../schemas/match.schema';

export interface AnalysisCompletedContext {
  analysisId: string;
  userId: string;
  resumeId: string;
  jobDescriptionId: string;
  result: MatchResult;
}

export type AnalysisCompletedHook = (ctx: AnalysisCompletedContext) => Promise<void> | void;

const hooks: AnalysisCompletedHook[] = [];

/** Register a function called (awaited, errors swallowed) after an analysis reaches COMPLETED. Returns an unregister fn. */
export function registerAnalysisCompletedHook(fn: AnalysisCompletedHook): () => void {
  hooks.push(fn);
  return () => {
    const i = hooks.indexOf(fn);
    if (i >= 0) hooks.splice(i, 1);
  };
}

export function clearAnalysisCompletedHooks(): void {
  hooks.length = 0;
}

/** Never throws: a failing hook must not fail the analysis. Logs only a fixed event name. */
export async function onAnalysisCompleted(ctx: AnalysisCompletedContext): Promise<void> {
  for (const hook of [...hooks]) {
    try {
      await hook(ctx);
    } catch {
      aiLog.error({ event: 'analysis.completed_hook_failed' });
    }
  }
}
