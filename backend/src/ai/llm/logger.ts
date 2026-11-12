export interface AiLogFields {
  task?: string;
  promptVersion?: string;
  provider?: string;
  model?: string;
  attempts?: number;
  latencyMs?: number;
  errorCode?: string;
  event?: string;
}

const ALLOWED: (keyof AiLogFields)[] = [
  'event', 'task', 'promptVersion', 'provider', 'model', 'attempts', 'latencyMs', 'errorCode'
];

/** Redacting-by-design logger: only whitelisted metadata is ever emitted, never content or keys. */
function emit(level: 'info' | 'warn' | 'error', fields: AiLogFields): void {
  if (process.env.NODE_ENV === 'test' && !process.env.AI_LOG_IN_TESTS) return;
  const safe: Record<string, string | number> = {};
  for (const k of ALLOWED) {
    const v = fields[k];
    if (typeof v === 'number' || (typeof v === 'string' && v.length <= 100)) safe[k] = v;
  }
  console[level](`[ai] ${JSON.stringify(safe)}`);
}

export const aiLog = {
  info: (f: AiLogFields) => emit('info', f),
  warn: (f: AiLogFields) => emit('warn', f),
  error: (f: AiLogFields) => emit('error', f)
};
