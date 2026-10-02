// Movement score 0–100 (SPEC §5.6).
import { clamp } from './geometry';
import { alphaFor } from './smoothing';

export const FAULT_PENALTY = 15;

export interface ScoreInput {
  progress: number;
  torsoAlignment: number;
  /** Symmetry %; pass 100 for single-side exercises. */
  symmetry: number;
  activeFaults: number;
}

export function frameScore({ progress, torsoAlignment, symmetry, activeFaults }: ScoreInput): number {
  const rangeScore = Math.min(progress, 1) * 100;
  return clamp(
    0.4 * rangeScore + 0.3 * torsoAlignment + 0.3 * symmetry - FAULT_PENALTY * activeFaults,
    0,
    100,
  );
}

/** Displayed score: EMA of frame scores (alpha 0.2) so it does not flicker. */
export class DisplayScore {
  private value: number | null = null;

  constructor(private readonly alpha = 0.2) {}

  update(score: number, dtMs?: number): number {
    const a = alphaFor(this.alpha, dtMs);
    this.value = this.value === null ? score : a * score + (1 - a) * this.value;
    return this.value;
  }

  get current(): number | null {
    return this.value;
  }
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
