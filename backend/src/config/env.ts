import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Treat empty strings (e.g. `LLM_MODEL=`) as unset so defaults apply.
const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optStr = () => z.preprocess(blankToUndefined, z.string().optional());
const num = (def: number, min = 0) =>
  z.preprocess(blankToUndefined, z.coerce.number().min(min).default(def));
const weight = (def: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().min(0, 'weight must be non-negative').default(def));

const envSchema = z.object({
  PORT: z.coerce.number().default(5001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  // Per-user limit for expensive AI endpoints
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  AI_RATE_LIMIT_MAX: z.coerce.number().default(60),

  // --- AI / LLM (all optional: the app boots without a key; AI calls then fail explicitly) ---
  LLM_PROVIDER: z.preprocess(
    blankToUndefined,
    z.enum(['groq', 'openai', 'openai-compatible', 'none']).default('none')
  ),
  LLM_MODEL: optStr(),
  LLM_API_KEY: optStr(),
  LLM_BASE_URL: optStr(),
  LLM_TIMEOUT_MS: num(60000, 1),
  LLM_MAX_RETRIES: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(3).default(2)),
  LLM_RETRY_BASE_DELAY_MS: num(500, 0),
  LLM_MAX_OUTPUT_TOKENS: num(4096, 1),
  LLM_MAX_INPUT_CHARS: num(30000, 100),
  LLM_TEMPERATURE: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(2).default(0)),
  LLM_MAX_CONCURRENT: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(3)),
  LLM_MAX_QUEUE: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).default(50)),

  // --- Match score weights (normalised by the matching engine; need not sum to 1) ---
  MATCH_WEIGHT_SKILLS: weight(0.35),
  MATCH_WEIGHT_EXPERIENCE: weight(0.25),
  MATCH_WEIGHT_KEYWORDS: weight(0.15),
  MATCH_WEIGHT_EDUCATION: weight(0.1),
  MATCH_WEIGHT_PROJECTS: weight(0.15)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  throw new Error('Environment configuration error');
}

export const env = parsed.data;
