import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../services/api';
import { startPolling, isAnalysisTerminal } from '../services/polling';

/**
 * Polls GET /analyses/:id until COMPLETED or FAILED.
 * - stops on unmount, id change, terminal state, repeated errors, or after maxDurationMs
 * - `restart()` begins polling again (e.g. after POST /retry)
 * Returns { analysis, error, timedOut, isPolling, restart }.
 */
export function useAnalysisPolling(analysisId, { enabled = true, maxDurationMs = 5 * 60 * 1000, intervalMs = 2000 } = {}) {
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const cancelRef = useRef(null);

  useEffect(() => {
    setAnalysis(null);
    setError(null);
    setTimedOut(false);
    if (!analysisId || !enabled) {
      setIsPolling(false);
      return undefined;
    }
    setIsPolling(true);
    const cancel = startPolling({
      fetchFn: async () => {
        const res = await api.analyses.get(analysisId);
        return res?.data ?? res;
      },
      isTerminal: isAnalysisTerminal,
      onUpdate: (value) => {
        setAnalysis(value);
        if (isAnalysisTerminal(value)) setIsPolling(false);
      },
      onTimeout: () => {
        setTimedOut(true);
        setIsPolling(false);
      },
      onError: (err) => {
        setError(err);
        setIsPolling(false);
      },
      intervalMs,
      maxDurationMs
    });
    cancelRef.current = cancel;
    return () => {
      cancel();
      cancelRef.current = null;
    };
  }, [analysisId, enabled, runKey, maxDurationMs, intervalMs]);

  const restart = useCallback(() => setRunKey((n) => n + 1), []);
  return { analysis, error, timedOut, isPolling, restart };
}
