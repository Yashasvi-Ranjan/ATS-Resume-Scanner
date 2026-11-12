import { ApiError } from '../../utils/apiError';

export type AiErrorCode =
  | 'LLM_NOT_CONFIGURED'
  | 'LLM_TIMEOUT'
  | 'LLM_RATE_LIMITED'
  | 'LLM_PROVIDER_ERROR'
  | 'LLM_INVALID_RESPONSE'
  | 'AI_ERROR';

export class AiError extends Error {
  public readonly code: AiErrorCode;
  public readonly httpStatus: number;
  public readonly retryable: boolean;
  public readonly publicMessage: string;
  /** Seconds-derived hint from a provider Retry-After header, in ms. */
  public retryAfterMs?: number;

  constructor(
    message: string,
    opts: { code?: AiErrorCode; httpStatus?: number; retryable?: boolean; publicMessage?: string } = {}
  ) {
    super(message);
    this.name = new.target.name;
    this.code = opts.code ?? 'AI_ERROR';
    this.httpStatus = opts.httpStatus ?? 500;
    this.retryable = opts.retryable ?? false;
    this.publicMessage = opts.publicMessage ?? 'AI processing failed';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class LlmNotConfiguredError extends AiError {
  constructor(message = 'LLM provider is not configured') {
    super(message, {
      code: 'LLM_NOT_CONFIGURED',
      httpStatus: 503,
      retryable: false,
      publicMessage: 'AI features are not configured on this server'
    });
  }
}

export class LlmTimeoutError extends AiError {
  constructor(message = 'LLM request timed out') {
    super(message, {
      code: 'LLM_TIMEOUT',
      httpStatus: 504,
      retryable: true,
      publicMessage: 'The AI provider took too long to respond. Please try again'
    });
  }
}

export class LlmRateLimitError extends AiError {
  constructor(message = 'LLM provider rate limit reached', retryAfterMs?: number) {
    super(message, {
      code: 'LLM_RATE_LIMITED',
      httpStatus: 429,
      retryable: true,
      publicMessage: 'The AI provider is rate limiting requests. Please try again shortly'
    });
    this.retryAfterMs = retryAfterMs;
  }
}

export class LlmProviderError extends AiError {
  public readonly providerStatus?: number;
  constructor(message = 'LLM provider error', providerStatus?: number, retryable?: boolean) {
    const retry = retryable ?? (providerStatus === undefined || providerStatus >= 500);
    super(message, {
      code: 'LLM_PROVIDER_ERROR',
      httpStatus: 503,
      retryable: retry,
      publicMessage: 'The AI provider is currently unavailable'
    });
    this.providerStatus = providerStatus;
  }
}

export class LlmInvalidResponseError extends AiError {
  public readonly issues: string[];
  constructor(message = 'LLM returned an invalid response', issues: string[] = []) {
    super(message, {
      code: 'LLM_INVALID_RESPONSE',
      httpStatus: 502,
      retryable: false,
      publicMessage: 'The AI returned an unusable response. Please try again'
    });
    this.issues = issues;
  }
}

/** Map any error to an ApiError with a safe public message (never leaks provider internals). */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof AiError) return new ApiError(err.httpStatus, err.publicMessage);
  return ApiError.internal();
}

export const AiErrorMapper = { toApiError };

/** Short, safe text suitable for persisting as errorMessage on a FAILED record. */
export function safeErrorMessage(err: unknown): string {
  if (err instanceof AiError) return err.publicMessage;
  return 'AI processing failed unexpectedly';
}
