export const AI_UNAVAILABLE_MESSAGE = 'AI service is not available — check server configuration';

/**
 * Turns an error thrown by the api client into a user-facing message.
 * Never invents data: falls back to the server message or a generic sentence.
 */
export function describeApiError(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  const status = err.status;
  let detail = '';
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    detail = err.errors
      .map((e) => (typeof e === 'string' ? e : e?.field ? `${e.field}: ${e.message}` : e?.message))
      .filter(Boolean)
      .join('; ');
  }
  if (status === 503) return AI_UNAVAILABLE_MESSAGE;
  if (status === 504) return 'The AI service timed out. Please try again.';
  if (status === 429) return 'The AI service is rate limited. Please wait a moment and try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return "You don't have access to that resource.";
  if (status === 410) return err.message || 'This action is no longer supported.';
  if (!status && err.isNetworkError) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  const base = err.message || fallback;
  return detail && !base.includes(detail) ? `${base} (${detail})` : base;
}

export function isAiUnavailable(err) {
  return err?.status === 503;
}
