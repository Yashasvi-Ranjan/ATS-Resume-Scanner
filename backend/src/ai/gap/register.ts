import { registerAnalysisCompletedHook } from '../matching/hooks';
import { GapGenerator } from './gapGenerator';

let unregister: (() => void) | null = null;

/**
 * Registers the "generate recommendations when an analysis completes" hook. Idempotent: calling it again replaces
 * (never duplicates) the previous registration, so hot reload / repeated imports are safe.
 */
export function registerGapHook(): () => void {
  if (unregister) unregister();
  unregister = registerAnalysisCompletedHook(async (ctx) => {
    await GapGenerator.tryGenerate(ctx.analysisId);
  });
  return unregister;
}

registerGapHook();
