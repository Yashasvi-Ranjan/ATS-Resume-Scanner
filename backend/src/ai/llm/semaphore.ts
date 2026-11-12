import { LlmRateLimitError } from './errors';

/** Thrown when the LLM wait queue is full. Not retried internally; the client may retry later (429). */
export class LlmQueueFullError extends LlmRateLimitError {
  constructor() {
    super('LLM request queue is full');
  }
}

export class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];
  constructor(
    private readonly max: number,
    private readonly maxQueue: number = Infinity
  ) {}

  get inFlight(): number {
    return this.active;
  }

  get queued(): number {
    return this.queue.length;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      if (this.queue.length >= this.maxQueue) throw new LlmQueueFullError();
      await new Promise<void>((resolve) => this.queue.push(resolve));
    } else {
      this.active++;
    }
    try {
      return await fn();
    } finally {
      const next = this.queue.shift();
      if (next) next(); // hand the slot straight to the next waiter
      else this.active--;
    }
  }
}
