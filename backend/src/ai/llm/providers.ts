import {
  LlmNotConfiguredError,
  LlmProviderError,
  LlmRateLimitError,
  LlmTimeoutError
} from './errors';
import { LlmCompleteRequest, LlmCompleteResult, LlmProvider } from './types';

type FetchFn = typeof fetch;

function parseRetryAfter(h: string | null): number | undefined {
  if (!h) return undefined;
  const secs = Number(h);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(h);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

/**
 * Shared HTTP POST with per-call timeout and error classification.
 * Error messages deliberately exclude request/response bodies and headers.
 */
async function postJson(
  fetchFn: FetchFn,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  req: LlmCompleteRequest
): Promise<any> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, req.timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (req.signal) {
    if (req.signal.aborted) controller.abort();
    else req.signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  try {
    let res: Response;
    try {
      res = await fetchFn(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (e) {
      if (timedOut) throw new LlmTimeoutError();
      if (controller.signal.aborted) throw new LlmProviderError('LLM request aborted', undefined, false);
      throw new LlmProviderError('Network error contacting LLM provider');
    }
    if (!res.ok) {
      if (res.status === 429) {
        throw new LlmRateLimitError('LLM provider returned 429', parseRetryAfter(res.headers.get('retry-after')));
      }
      const err = new LlmProviderError(`LLM provider returned HTTP ${res.status}`, res.status);
      if (res.status >= 500) err.retryAfterMs = parseRetryAfter(res.headers.get('retry-after'));
      throw err;
    }
    try {
      return await res.json();
    } catch (e) {
      if (timedOut) throw new LlmTimeoutError();
      throw new LlmProviderError('LLM provider returned a non-JSON body', res.status, true);
    }
  } finally {
    clearTimeout(timer);
    req.signal?.removeEventListener('abort', onExternalAbort);
  }
}

export interface OpenAiCompatibleProviderOptions {
  name?: string;
  apiKey?: string;
  baseUrl?: string;
  /** Local servers (Ollama) typically need no key. */
  requireApiKey?: boolean;
  fetchFn?: FetchFn;
}

export class OpenAiCompatibleProvider implements LlmProvider {
  public readonly name: string;
  private readonly apiKey?: string;
  private readonly url: string;
  private readonly requireApiKey: boolean;
  private readonly fetchFn: FetchFn;

  constructor(opts: OpenAiCompatibleProviderOptions) {
    this.name = opts.name ?? 'openai-compatible';
    this.apiKey = opts.apiKey;
    this.requireApiKey = opts.requireApiKey ?? false;
    const base = (opts.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.url = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
    this.fetchFn = opts.fetchFn ?? ((...a) => fetch(...a));
  }

  protected buildBody(req: LlmCompleteRequest): Record<string, unknown> {
    return {
      model: req.model,
      max_tokens: req.maxOutputTokens,
      temperature: req.temperature,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user }
      ]
    };
  }

  async complete(req: LlmCompleteRequest): Promise<LlmCompleteResult> {
    if (this.requireApiKey && !this.apiKey) throw new LlmNotConfiguredError('LLM_API_KEY is not set');
    const headers: Record<string, string> = {};
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    const data = await postJson(
      this.fetchFn,
      this.url,
      headers,
      this.buildBody(req),
      req
    );
    const content = data?.choices?.[0]?.message?.content;
    const text = typeof content === 'string' ? content : '';
    return {
      text,
      usage: data?.usage
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
        : undefined
    };
  }
}

export interface GroqProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: FetchFn;
}

export const GROQ_DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Groq (https://console.groq.com) exposes an OpenAI-compatible chat-completions API.
 * Differences handled here: `max_completion_tokens`, JSON object mode (Groq requires the word
 * "JSON" in the messages, so a short instruction is appended), and low reasoning effort for the
 * gpt-oss reasoning models so output tokens are not spent on hidden reasoning.
 */
export class GroqProvider extends OpenAiCompatibleProvider {
  constructor(opts: GroqProviderOptions) {
    super({
      name: 'groq',
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl || GROQ_DEFAULT_BASE_URL,
      requireApiKey: true,
      fetchFn: opts.fetchFn
    });
  }

  protected buildBody(req: LlmCompleteRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: req.model,
      max_completion_tokens: req.maxOutputTokens,
      temperature: req.temperature,
      messages: [
        {
          role: 'system',
          content: req.jsonMode
            ? `${req.system}\n\nRespond with a single valid JSON object only.`
            : req.system
        },
        { role: 'user', content: req.user }
      ]
    };
    if (req.jsonMode) body.response_format = { type: 'json_object' };
    if (typeof req.model === 'string' && req.model.startsWith('openai/gpt-oss')) {
      body.reasoning_effort = 'low';
    }
    return body;
  }
}

/** Provider used when nothing is configured: fails explicitly at call time. */
export class NotConfiguredProvider implements LlmProvider {
  public readonly name = 'none';
  async complete(): Promise<LlmCompleteResult> {
    throw new LlmNotConfiguredError();
  }
}
