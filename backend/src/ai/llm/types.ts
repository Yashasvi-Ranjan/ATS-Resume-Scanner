export interface LlmUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface LlmCompleteRequest {
  system: string;
  user: string;
  model: string;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
  signal?: AbortSignal;
  /** Hint for providers/mocks that support native JSON mode. */
  jsonMode?: boolean;
  /** Task label (non-sensitive); used by mocks/logging only. */
  task?: string;
}

export interface LlmCompleteResult {
  text: string;
  usage?: LlmUsage;
}

export interface LlmProvider {
  readonly name: string;
  complete(req: LlmCompleteRequest): Promise<LlmCompleteResult>;
}
