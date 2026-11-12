import { LlmProviderError, LlmRateLimitError, LlmTimeoutError } from './errors';
import { LlmService, LlmServiceConfig } from './llmService';
import { LlmCompleteRequest, LlmCompleteResult, LlmProvider } from './types';

export type MockFailure = 'timeout' | '429' | '500' | '503' | '401' | 'network';
export type MockStep =
  | string
  | { text: string; usage?: LlmCompleteResult['usage'] }
  | { fail: MockFailure; retryAfterMs?: number }
  | { error: Error };
export type MockHandler = (req: LlmCompleteRequest) => string | LlmCompleteResult | Promise<string | LlmCompleteResult>;

export function failureToError(f: MockFailure, retryAfterMs?: number): Error {
  switch (f) {
    case 'timeout': return new LlmTimeoutError();
    case '429': return new LlmRateLimitError('mock 429', retryAfterMs);
    case '500': return new LlmProviderError('mock 500', 500);
    case '503': return new LlmProviderError('mock 503', 503);
    case '401': return new LlmProviderError('mock 401', 401, false);
    default: return new LlmProviderError('mock network error');
  }
}

/** Scripted provider for tests: queued steps, per-task handlers, recorded calls. Never touches the network. */
export class MockLlmProvider implements LlmProvider {
  public readonly name: string;
  public readonly calls: LlmCompleteRequest[] = [];
  private queue: MockStep[] = [];
  private handlers = new Map<string, MockHandler>();
  private fallback?: MockHandler;
  /** Optional artificial latency, e.g. to test concurrency. */
  public delayMs = 0;
  public inFlight = 0;
  public maxInFlight = 0;

  constructor(name = 'mock') {
    this.name = name;
  }

  /** Queue responses (strings, {text}, {fail}, {error}) consumed in order. */
  enqueue(...steps: MockStep[]): this {
    this.queue.push(...steps);
    return this;
  }

  /** Handler used for requests whose task matches. */
  onTask(task: string, handler: MockHandler): this {
    this.handlers.set(task, handler);
    return this;
  }

  /** Handler used when queue is empty and no task handler matches. */
  setDefault(handler: MockHandler): this {
    this.fallback = handler;
    return this;
  }

  reset(): void {
    this.calls.length = 0;
    this.queue = [];
    this.handlers.clear();
    this.fallback = undefined;
  }

  callsForTask(task: string): LlmCompleteRequest[] {
    return this.calls.filter((c) => c.task === task);
  }

  async complete(req: LlmCompleteRequest): Promise<LlmCompleteResult> {
    this.calls.push(req);
    this.inFlight++;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    try {
      if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
      const step = this.queue.shift();
      if (step !== undefined) return this.resolveStep(step);
      const h = (req.task && this.handlers.get(req.task)) || this.fallback;
      if (h) return this.normalize(await h(req));
      throw new LlmProviderError('MockLlmProvider: no response queued', undefined, false);
    } finally {
      this.inFlight--;
    }
  }

  private resolveStep(step: MockStep): LlmCompleteResult {
    if (typeof step === 'string') return { text: step };
    if ('fail' in step) throw failureToError(step.fail, step.retryAfterMs);
    if ('error' in step) throw step.error;
    return { text: step.text, usage: step.usage };
  }

  private normalize(r: string | LlmCompleteResult): LlmCompleteResult {
    return typeof r === 'string' ? { text: r } : r;
  }
}

/** LlmService around a mock provider: zero backoff, instant sleeps. */
export function createTestLlmService(
  provider: LlmProvider = new MockLlmProvider(),
  overrides: Partial<LlmServiceConfig> = {}
): LlmService {
  return new LlmService({
    provider,
    model: 'mock-model',
    timeoutMs: 5000,
    maxRetries: 2,
    retryBaseDelayMs: 0,
    maxOutputTokens: 1024,
    maxInputChars: 30000,
    temperature: 0,
    maxConcurrent: 3,
    sleep: async () => undefined,
    random: () => 0.5,
    ...overrides
  });
}
