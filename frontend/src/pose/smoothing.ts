// Angle smoothing (SPEC §5.3). Smooth angles, not raw landmarks.
//
// The EMA is time-aware: `alpha` applies at the 30 fps reference frame interval and is rescaled for
// the real interval, so a slow phone detecting at 8 fps smooths over the same ~0.1 s window instead
// of lagging seconds behind the body.

export const REFERENCE_FRAME_MS = 1000 / 30;

/** Alpha for an interval of `dtMs`, equivalent to `alpha` per 30 fps frame. */
export function alphaFor(alpha: number, dtMs?: number): number {
  if (dtMs === undefined || dtMs <= 0) return alpha;
  return 1 - Math.pow(1 - alpha, dtMs / REFERENCE_FRAME_MS);
}

export class Ema {
  private value: number | null = null;

  constructor(private readonly alpha = 0.35) {}

  /**
   * Feed a new sample. A null sample (landmark not visible) keeps the previous value.
   * `dtMs` is the time since the previous frame (omit for the 30 fps default).
   */
  update(sample: number | null, dtMs?: number): number | null {
    if (sample === null || Number.isNaN(sample)) return this.value;
    const a = alphaFor(this.alpha, dtMs);
    this.value = this.value === null ? sample : a * sample + (1 - a) * this.value;
    return this.value;
  }

  get current(): number | null {
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

/** A bag of named EMAs so a whole metrics object can be smoothed at once. */
export class EmaBank<K extends string> {
  private readonly filters = new Map<K, Ema>();

  constructor(private readonly alpha = 0.35) {}

  update(key: K, sample: number | null, dtMs?: number): number | null {
    let f = this.filters.get(key);
    if (!f) {
      f = new Ema(this.alpha);
      this.filters.set(key, f);
    }
    return f.update(sample, dtMs);
  }

  reset(): void {
    this.filters.clear();
  }
}
