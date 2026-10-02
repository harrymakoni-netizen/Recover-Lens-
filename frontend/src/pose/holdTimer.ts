// Hold/balance timer (SPEC §5.4): runs while the stance is valid, pauses (never resets) when it
// breaks, completes at holdSeconds.

export interface HoldUpdate {
  elapsedS: number;
  holding: boolean;
  justCompleted: boolean;
  /** True on the frame the stance was lost after holding. */
  justBroken: boolean;
}

export class HoldTimer {
  elapsedMs = 0;
  complete = false;
  private lastMs: number | null = null;
  private wasHolding = false;

  constructor(readonly holdSeconds: number) {}

  update(valid: boolean, tMs: number): HoldUpdate {
    const dt = this.lastMs === null ? 0 : Math.max(0, tMs - this.lastMs);
    this.lastMs = tMs;
    let justCompleted = false;
    const justBroken = this.wasHolding && !valid && !this.complete;

    if (!this.complete && valid) {
      // Only accumulate time across frames that were both valid.
      if (this.wasHolding) this.elapsedMs += dt;
      if (this.elapsedMs >= this.holdSeconds * 1000) {
        this.elapsedMs = this.holdSeconds * 1000;
        this.complete = true;
        justCompleted = true;
      }
    }
    this.wasHolding = valid;
    return { elapsedS: this.elapsedMs / 1000, holding: valid && !this.complete, justCompleted, justBroken };
  }

  get remainingS(): number {
    return Math.max(0, this.holdSeconds - this.elapsedMs / 1000);
  }
}
