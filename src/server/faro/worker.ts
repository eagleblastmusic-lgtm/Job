/** Single-process scheduler. Durable obligations and delivery dedupe remain in SQLite. */
export class FaroWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private lastRunAt: string | null = null;
  private lastSuccessAt: string | null = null;
  private lastErrorCode: string | null = null;
  private runs = 0;
  constructor(private readonly tick: () => void, readonly enabled: boolean, readonly intervalMs: number) {
    if (!Number.isSafeInteger(intervalMs) || intervalMs < 1000) throw new Error('Nieprawidłowy interwał workera.');
  }
  start() {
    if (!this.enabled || this.stopped || this.timer) return;
    this.timer = setInterval(() => { this.run(); }, this.intervalMs);
    this.timer.unref();
  }
  run() {
    if (this.stopped) return false;
    this.lastRunAt = new Date().toISOString();
    this.runs++;
    try {
      this.tick();
      this.lastSuccessAt = this.lastRunAt;
      this.lastErrorCode = null;
      return true;
    } catch {
      // Diagnostics must never expose SQL, statements, recipient details or payloads.
      this.lastErrorCode = 'WORKER_TICK_FAILED';
      return false;
    }
  }
  stop() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  status() {
    return { enabled: this.enabled, running: this.timer !== null, stopped: this.stopped,
      intervalMs: this.intervalMs, runs: this.runs, lastRunAt: this.lastRunAt,
      lastSuccessAt: this.lastSuccessAt, lastErrorCode: this.lastErrorCode };
  }
}
