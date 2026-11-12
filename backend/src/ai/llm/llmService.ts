import { ZodSchema } from 'zod';
import { env } from '../../config/env';
import {
  AiError,
  LlmInvalidResponseError,
  LlmNotConfiguredError,
  LlmTimeoutError
} from './errors';
import { extractJson } from './json';
import { aiLog } from './logger';
import { GroqProvider, NotConfiguredProvider, OpenAiCompatibleProvider } from './providers';
import { Semaphore, LlmQueueFullError } from './semaphore';
import { truncateForPrompt } from './safety';
import { LlmProvider, LlmUsage } from './types';

export const HARD_MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 30_000;
const MAX_RETRY_AFTER_MS = 30_000;

export interface LlmServiceConfig {
  provider: LlmProvider;
  model?: string;
  timeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  maxOutputTokens: number;
  maxInputChars: number;
  temperature: number;
  maxConcurrent: number;
  /** Max callers waiting for a slot; beyond this requests are rejected with a 429. Default unbounded. */
  maxQueue?: number;
  /** Injectable for tests (default: real setTimeout). */
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export interface GenerateJsonRequest<T> {
  task: string;
  promptVersion: string;
  system: string;
  user: string;
  schema: ZodSchema<T>;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface LlmCallMeta {
  provider: string;
  model: string;
  promptVersion: string;
  attempts: number;
  latencyMs: number;
  usage?: LlmUsage;
}

export interface GenerateJsonResult<T> {
  data: T;
  meta: LlmCallMeta;
}

const DEFAULT_MODELS: Record<string, string> = {
  groq: 'openai/gpt-oss-120b',
  openai: 'gpt-4o-mini'
};

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class LlmService {
  private readonly cfg: LlmServiceConfig;
  private readonly semaphore: Semaphore;
  private readonly maxRetries: number;

  constructor(cfg: LlmServiceConfig) {
    this.cfg = cfg;
    this.maxRetries = Math.max(0, Math.min(HARD_MAX_RETRIES, Math.floor(cfg.maxRetries)));
    this.semaphore = new Semaphore(Math.max(1, cfg.maxConcurrent), cfg.maxQueue ?? Infinity);
  }

  get providerName(): string {
    return this.cfg.provider.name;
  }

  get isConfigured(): boolean {
    return this.cfg.provider.name !== 'none' && !!this.cfg.model;
  }

  get modelName(): string | undefined {
    return this.cfg.model;
  }

  get maxInputChars(): number {
    return this.cfg.maxInputChars;
  }

  /** Throws LlmNotConfiguredError when AI cannot be used. Handy for early checks. */
  assertConfigured(): void {
    if (!this.isConfigured) throw new LlmNotConfiguredError();
  }

  async generateJson<T>(req: GenerateJsonRequest<T>): Promise<GenerateJsonResult<T>> {
    this.assertConfigured();
    const started = Date.now();
    const model = this.cfg.model as string;
    const maxOutputTokens = req.maxOutputTokens ?? this.cfg.maxOutputTokens;
    const temperature = req.temperature ?? this.cfg.temperature;
    const user = this.capInput(req.user);
    const usage: LlmUsage = {};
    let attempts = 0;

    const call = async (u: string): Promise<string> => {
      const r = await this.callWithRetry(
        { system: req.system, user: u, model, maxOutputTokens, temperature, task: req.task },
        () => attempts++
      );
      if (r.usage) {
        usage.inputTokens = (usage.inputTokens ?? 0) + (r.usage.inputTokens ?? 0);
        usage.outputTokens = (usage.outputTokens ?? 0) + (r.usage.outputTokens ?? 0);
      }
      return r.text;
    };

    const finish = (data: T): GenerateJsonResult<T> => {
      const latencyMs = Date.now() - started;
      aiLog.info({ event: 'llm.ok', task: req.task, promptVersion: req.promptVersion, provider: this.providerName, model, attempts, latencyMs });
      return {
        data,
        meta: {
          provider: this.providerName,
          model,
          promptVersion: req.promptVersion,
          attempts,
          latencyMs,
          usage: usage.inputTokens !== undefined || usage.outputTokens !== undefined ? usage : undefined
        }
      };
    };

    try {
      const first = await call(user);
      const v1 = this.validate(first, req.schema);
      if (v1.ok) return finish(v1.data);

      // ONE bounded repair attempt feeding back validation errors.
      const repairUser =
        `${user}\n\nYour previous response was rejected because it did not match the required JSON schema.\n` +
        `Validation problems:\n${v1.issues.map((i) => `- ${i}`).join('\n')}\n` +
        `Respond again with ONLY a corrected JSON value that satisfies the schema. No prose, no code fences.`;
      const second = await call(repairUser);
      const v2 = this.validate(second, req.schema);
      if (v2.ok) return finish(v2.data);
      throw new LlmInvalidResponseError('LLM output failed schema validation after repair', v2.issues);
    } catch (err) {
      aiLog.error({
        event: 'llm.fail',
        task: req.task,
        promptVersion: req.promptVersion,
        provider: this.providerName,
        model,
        attempts,
        latencyMs: Date.now() - started,
        errorCode: err instanceof AiError ? err.code : 'UNKNOWN'
      });
      throw err;
    }
  }

  private capInput(user: string): string {
    const max = this.cfg.maxInputChars;
    if (user.length <= max) return user;
    let cut = truncateForPrompt(user, max);
    const opens = (cut.match(/<untrusted_data\b/g) || []).length;
    const closes = (cut.match(/<\/untrusted_data>/g) || []).length;
    cut += '\n[INPUT TRUNCATED]';
    if (opens > closes) cut += '\n</untrusted_data>';
    return cut;
  }

  private validate<T>(raw: string, schema: ZodSchema<T>): { ok: true; data: T } | { ok: false; issues: string[] } {
    let parsed: unknown;
    try {
      parsed = extractJson(raw);
    } catch {
      return { ok: false, issues: ['Response was not valid JSON'] };
    }
    const r = schema.safeParse(parsed);
    if (r.success) return { ok: true, data: r.data };
    return {
      ok: false,
      issues: r.error.issues.slice(0, 15).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    };
  }

  private backoffMs(retryIndex: number, err: AiError): number {
    const rnd = (this.cfg.random ?? Math.random)();
    const exp = Math.min(MAX_BACKOFF_MS, this.cfg.retryBaseDelayMs * 2 ** retryIndex);
    const jittered = exp === 0 ? 0 : Math.round(exp / 2 + (exp / 2) * rnd);
    if (err.retryAfterMs !== undefined && this.cfg.retryBaseDelayMs > 0) {
      return Math.max(jittered, Math.min(err.retryAfterMs, MAX_RETRY_AFTER_MS));
    }
    return jittered;
  }

  private async callWithRetry(
    base: { system: string; user: string; model: string; maxOutputTokens: number; temperature: number; task: string },
    onAttempt: () => void
  ) {
    const sleep = this.cfg.sleep ?? realSleep;
    for (let retry = 0; ; retry++) {
      onAttempt();
      try {
        return await this.semaphore.run(() => this.callOnce(base));
      } catch (err) {
        const e = err instanceof AiError ? err : null;
        if (err instanceof LlmQueueFullError) throw err;
        if (!e || !e.retryable || retry >= this.maxRetries) throw err;
        await sleep(this.backoffMs(retry, e));
      }
    }
  }

  private async callOnce(base: { system: string; user: string; model: string; maxOutputTokens: number; temperature: number; task: string }) {
    const controller = new AbortController();
    const timeoutMs = this.cfg.timeoutMs;
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new LlmTimeoutError());
      }, timeoutMs);
    });
    try {
      return await Promise.race([
        this.cfg.provider.complete({ ...base, timeoutMs, signal: controller.signal, jsonMode: true }),
        timeout
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

export function buildProviderFromEnv(): { provider: LlmProvider; model?: string } {
  const p = env.LLM_PROVIDER;
  if (p === 'none') return { provider: new NotConfiguredProvider() };
  if (p === 'groq') {
    if (!env.LLM_API_KEY) return { provider: new NotConfiguredProvider() };
    return {
      provider: new GroqProvider({ apiKey: env.LLM_API_KEY, baseUrl: env.LLM_BASE_URL }),
      model: env.LLM_MODEL ?? DEFAULT_MODELS.groq
    };
  }
  if (p === 'openai') {
    if (!env.LLM_API_KEY) return { provider: new NotConfiguredProvider() };
    return {
      provider: new OpenAiCompatibleProvider({
        name: 'openai',
        apiKey: env.LLM_API_KEY,
        baseUrl: env.LLM_BASE_URL || 'https://api.openai.com/v1',
        requireApiKey: true
      }),
      model: env.LLM_MODEL ?? DEFAULT_MODELS.openai
    };
  }
  // openai-compatible: needs a base URL and a model; key optional (Ollama)
  if (!env.LLM_BASE_URL || !env.LLM_MODEL) return { provider: new NotConfiguredProvider() };
  return {
    provider: new OpenAiCompatibleProvider({ apiKey: env.LLM_API_KEY, baseUrl: env.LLM_BASE_URL }),
    model: env.LLM_MODEL
  };
}

export function createLlmServiceFromEnv(): LlmService {
  const { provider, model } = buildProviderFromEnv();
  return new LlmService({
    provider,
    model,
    timeoutMs: env.LLM_TIMEOUT_MS,
    maxRetries: env.LLM_MAX_RETRIES,
    retryBaseDelayMs: env.LLM_RETRY_BASE_DELAY_MS,
    maxOutputTokens: env.LLM_MAX_OUTPUT_TOKENS,
    maxInputChars: env.LLM_MAX_INPUT_CHARS,
    temperature: env.LLM_TEMPERATURE,
    maxConcurrent: env.LLM_MAX_CONCURRENT,
    maxQueue: env.LLM_MAX_QUEUE
  });
}

let singleton: LlmService | null = null;

export function getLlmService(): LlmService {
  if (!singleton) singleton = createLlmServiceFromEnv();
  return singleton;
}

export function setLlmServiceForTests(svc: LlmService | null): void {
  singleton = svc;
}
