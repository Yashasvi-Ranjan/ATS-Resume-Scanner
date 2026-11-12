/**
 * Generic polling helper with exponential backoff, a hard time limit and cancellation.
 * No fake progress: it only reports what `fetchFn` returns.
 *
 * Returns a cancel() function. After cancel() (or a terminal state / timeout) no more callbacks fire.
 */
export function startPolling({
  fetchFn,
  isTerminal,
  onUpdate = () => {},
  onTimeout = () => {},
  onError = () => {},
  intervalMs = 2000,
  backoffFactor = 1.25,
  maxIntervalMs = 8000,
  maxDurationMs = 5 * 60 * 1000,
  maxConsecutiveErrors = 3
}) {
  let cancelled = false;
  let timer = null;
  let delay = intervalMs;
  let errors = 0;
  const startedAt = Date.now();

  const stop = () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const tick = async () => {
    if (cancelled) return;
    try {
      const value = await fetchFn();
      if (cancelled) return;
      errors = 0;
      onUpdate(value);
      if (isTerminal(value)) {
        stop();
        return;
      }
    } catch (err) {
      if (cancelled) return;
      // Auth failures and missing records will not fix themselves: stop immediately.
      const fatal = err?.status === 401 || err?.status === 403 || err?.status === 404;
      errors += 1;
      if (fatal || errors >= maxConsecutiveErrors) {
        stop();
        onError(err);
        return;
      }
    }
    if (Date.now() - startedAt >= maxDurationMs) {
      stop();
      onTimeout();
      return;
    }
    delay = Math.min(Math.round(delay * backoffFactor), maxIntervalMs);
    timer = setTimeout(tick, delay);
  };

  timer = setTimeout(tick, 0);
  return stop;
}

export const ANALYSIS_TERMINAL = new Set(['COMPLETED', 'FAILED']);
export const isAnalysisTerminal = (a) => ANALYSIS_TERMINAL.has(a?.status);
