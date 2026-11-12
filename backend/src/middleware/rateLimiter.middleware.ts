import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'test' ? 10000 : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    errors: []
  },
  skip: () => env.NODE_ENV === 'test'
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    errors: []
  },
  skip: () => env.NODE_ENV === 'test'
});

/**
 * Per-user limiter for expensive (LLM-backed) endpoints. Keyed by authenticated user id (falls back to IP),
 * so it must be mounted AFTER `authenticate`. Responds with the standard ApiError envelope (429).
 * `force` lets tests exercise a small-limit instance even under NODE_ENV=test.
 */
export const createAiRateLimiter = (opts: { windowMs?: number; max?: number; force?: boolean } = {}) =>
  rateLimit({
    windowMs: opts.windowMs ?? env.AI_RATE_LIMIT_WINDOW_MS,
    max: opts.max ?? (env.NODE_ENV === 'test' && !opts.force ? 100000 : env.AI_RATE_LIMIT_MAX),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip ?? 'unknown'}`),
    skip: () => env.NODE_ENV === 'test' && !opts.force,
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(new ApiError(429, 'Too many AI requests. Please wait before trying again.'));
    }
  });

export const aiRateLimiter = createAiRateLimiter();
