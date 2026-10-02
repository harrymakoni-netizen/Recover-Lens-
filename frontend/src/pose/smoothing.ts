// Angle smoothing (SPEC §5.3). Smooth angles, not raw landmarks.

export class Ema {
  private value: number | null = null;

  constructor(private readonly alpha = 0.35) {}

  /** Feed a new sample. A null sample (landmark not visible) keeps the previous value. */
  update(sample: number | null): number | null {
    if (sample === null || Number.isNaN(sample)) return this.value;
    this.value = this.value === null ? sample : this.alpha * sample + (1 - this.alpha) * this.value;
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

  update(key: K, sample: number | null): number | null {
    let f = this.filters.get(key);
    if (!f) {
      f = new Ema(this.alpha);
      this.filters.set(key, f);
    }
    return f.update(sample);
  }

  reset(): void {
    this.filters.clear();
  }
}
