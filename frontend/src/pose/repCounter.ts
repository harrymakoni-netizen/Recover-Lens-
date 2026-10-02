// Rep state machine (SPEC §5.4).
//
// READY → RAISING → AT_TOP → LOWERING → (rep complete) → READY
//
// Driven by `progress` = (angle - start) / (target - start), clamped to 0..1.2, so "up" means
// progress → 1 whether the angle increases (abduction) or decreases (squat).
// Every completed rep counts in `reps`; `correctReps` is tracked separately.

export type RepState = 'READY' | 'RAISING' | 'AT_TOP' | 'LOWERING';

export interface RepCounterOptions {
  startAngle: number;
  targetAngle: number;
  /** Pause required at the top before the rep can complete. Default 0. */
  holdSeconds?: number;
  /** Reps faster than this are treated as noise. */
  minRepSeconds: number;
  targetReps: number;
  sets?: number;
}

export interface RepFrame {
  /** Smoothed primary angle in degrees; null = not measurable this frame (state unchanged). */
  angle: number | null;
  tMs: number;
  /** Fault ids active on this frame. */
  faults?: readonly string[];
  /** §5.6 frame score, used for rep quality. */
  frameScore?: number;
}

export interface RepResult {
  repNumber: number; // within the set, 1-based
  totalReps: number; // across all sets
  set: number;
  correct: boolean;
  quality: number;
  faults: string[]; // faults seen in this rep, most frequent first
  topAngle: number;
  maxProgress: number;
  durationS: number;
}

export type RepEvent =
  | { type: 'state'; from: RepState; to: RepState }
  | ({ type: 'rep' } & RepResult)
  | { type: 'rejected'; reason: 'too_fast' | 'hold_not_met' }
  | { type: 'turnedBackEarly'; maxProgress: number }
  | { type: 'setComplete'; set: number; sets: number }
  | { type: 'sessionComplete' };

// Thresholds from SPEC §5.4. Hysteresis: enter top at 0.90, leave at 0.80; start at 0.25, finish at 0.20.
export const START_RAISE = 0.25;
export const ABANDON = 0.15;
export const ENTER_TOP = 0.9;
export const HOLD_ZONE = 0.85;
export const LEAVE_TOP = 0.8;
export const FINISH = 0.2;
/** A rep is "correct" when fewer than this fraction of its frames had a fault. */
export const CORRECT_FAULT_FRACTION = 0.25;

interface RepTracking {
  startMs: number;
  frames: number;
  faultFrames: number;
  scoreSum: number;
  scoreFrames: number;
  faultCounts: Map<string, number>;
  maxProgress: number;
  topAngle: number;
  topReached: boolean;
  turnedBack: boolean;
}

export function computeProgress(angle: number, startAngle: number, targetAngle: number): number {
  const span = targetAngle - startAngle;
  if (span === 0) return 0;
  return Math.min(1.2, Math.max(0, (angle - startAngle) / span));
}

export class RepCounter {
  state: RepState = 'READY';
  reps = 0;
  correctReps = 0;
  repsInSet = 0;
  completedSets = 0;
  done = false;
  progress = 0;
  /** Seconds held at the top in the current rep. */
  holdElapsed = 0;
  readonly results: RepResult[] = [];

  private readonly sets: number;
  private readonly holdMs: number;
  private rep: RepTracking | null = null;
  private lastMs: number | null = null;
  private setJustCompleted = false;

  constructor(private readonly opts: RepCounterOptions) {
    this.sets = Math.max(1, opts.sets ?? 1);
    this.holdMs = Math.max(0, (opts.holdSeconds ?? 0) * 1000);
  }

  /** Current set number, 1-based. Stays on the finished set until the next rep starts. */
  get currentSet(): number {
    return this.setJustCompleted ? this.completedSets : Math.min(this.completedSets + 1, this.sets);
  }

  get totalSets(): number {
    return this.sets;
  }

  /** True while at the top with the hold timer running (shown as HOLD). */
  get holding(): boolean {
    return this.state === 'AT_TOP';
  }

  update(frame: RepFrame): RepEvent[] {
    const events: RepEvent[] = [];
    const dt = this.lastMs === null ? 0 : Math.max(0, frame.tMs - this.lastMs);
    this.lastMs = frame.tMs;
    if (this.done || frame.angle === null) return events;

    const p = computeProgress(frame.angle, this.opts.startAngle, this.opts.targetAngle);
    this.progress = p;

    if (this.rep) this.track(frame, p);

    switch (this.state) {
      case 'READY':
        if (p >= START_RAISE) {
          if (this.setJustCompleted) {
            this.setJustCompleted = false;
            this.repsInSet = 0;
          }
          this.rep = this.newRep(frame.tMs);
          this.track(frame, p);
          this.go('RAISING', events);
        }
        break;

      case 'RAISING':
        if (p >= ENTER_TOP) {
          this.holdElapsed = 0;
          this.go('AT_TOP', events);
          this.updateHold(0, p);
        } else if (p < ABANDON) {
          this.rep = null;
          this.go('READY', events);
        } else if (this.rep && !this.rep.turnedBack && this.rep.maxProgress >= 0.35 && p < this.rep.maxProgress - 0.1) {
          // Started coming down before reaching the target.
          this.rep.turnedBack = true;
          events.push({ type: 'turnedBackEarly', maxProgress: this.rep.maxProgress });
        }
        break;

      case 'AT_TOP':
        this.updateHold(dt, p);
        if (p < LEAVE_TOP) this.go('LOWERING', events);
        break;

      case 'LOWERING':
        if (p >= ENTER_TOP) {
          this.go('AT_TOP', events);
          this.updateHold(0, p);
        } else if (p < FINISH) {
          this.complete(frame.tMs, events);
        }
        break;
    }
    return events;
  }

  private updateHold(dt: number, p: number): void {
    if (!this.rep) return;
    if (p >= HOLD_ZONE) this.holdElapsed += dt / 1000;
    if (this.holdElapsed * 1000 >= this.holdMs) this.rep.topReached = true;
  }

  private complete(tMs: number, events: RepEvent[]): void {
    const rep = this.rep;
    this.rep = null;
    this.go('READY', events);
    if (!rep) return;

    if (!rep.topReached) {
      events.push({ type: 'rejected', reason: 'hold_not_met' });
      return;
    }
    const durationS = (tMs - rep.startMs) / 1000;
    if (durationS < this.opts.minRepSeconds) {
      events.push({ type: 'rejected', reason: 'too_fast' });
      return;
    }

    this.reps += 1;
    this.repsInSet += 1;
    const faultFraction = rep.frames > 0 ? rep.faultFrames / rep.frames : 0;
    const correct = faultFraction < CORRECT_FAULT_FRACTION;
    if (correct) this.correctReps += 1;
    const quality = rep.scoreFrames > 0 ? rep.scoreSum / rep.scoreFrames : 100 * (1 - faultFraction);
    const faults = [...rep.faultCounts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

    const result: RepResult = {
      repNumber: this.repsInSet,
      totalReps: this.reps,
      set: this.completedSets + 1,
      correct,
      quality,
      faults,
      topAngle: rep.topAngle,
      maxProgress: rep.maxProgress,
      durationS,
    };
    this.results.push(result);
    events.push({ type: 'rep', ...result });

    if (this.repsInSet >= this.opts.targetReps) {
      this.completedSets += 1;
      this.setJustCompleted = true;
      events.push({ type: 'setComplete', set: this.completedSets, sets: this.sets });
      if (this.completedSets >= this.sets) {
        this.done = true;
        events.push({ type: 'sessionComplete' });
      }
    }
  }

  private newRep(startMs: number): RepTracking {
    return {
      startMs,
      frames: 0,
      faultFrames: 0,
      scoreSum: 0,
      scoreFrames: 0,
      faultCounts: new Map(),
      maxProgress: 0,
      topAngle: 0,
      topReached: false,
      turnedBack: false,
    };
  }

  private track(frame: RepFrame, p: number): void {
    const rep = this.rep;
    if (!rep || frame.angle === null) return;
    rep.frames += 1;
    const faults = frame.faults ?? [];
    if (faults.length > 0) rep.faultFrames += 1;
    for (const f of faults) rep.faultCounts.set(f, (rep.faultCounts.get(f) ?? 0) + 1);
    if (frame.frameScore !== undefined) {
      rep.scoreSum += frame.frameScore;
      rep.scoreFrames += 1;
    }
    if (p > rep.maxProgress) {
      rep.maxProgress = p;
      rep.topAngle = frame.angle;
    }
  }

  private go(to: RepState, events: RepEvent[]): void {
    if (to === this.state) return;
    events.push({ type: 'state', from: this.state, to });
    this.state = to;
  }
}
