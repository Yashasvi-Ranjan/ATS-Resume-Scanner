/**
 * Process-level keyed mutex. Calls with the same key run strictly one after another;
 * different keys run concurrently. Single-process only (documented limitation).
 */
const tails = new Map<string, Promise<unknown>>();

export async function withKeyedLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = tails.get(key) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => undefined);
  tails.set(key, tail);
  try {
    return await run;
  } finally {
    if (tails.get(key) === tail) tails.delete(key);
  }
}
