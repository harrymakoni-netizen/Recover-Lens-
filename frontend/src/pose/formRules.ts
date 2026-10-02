// Form fault rules (SPEC §5.5). Each rule is evaluated per frame and becomes "active" only after
// it has been true for DEBOUNCE_MS, so the skeleton does not flicker. Leaving is instant.
import type { RepState } from './repCounter';

export type FaultRuleId =
  | 'torso_lean'
  | 'asymmetry'
  | 'elbow_bend'
  | 'back_arch'
  | 'knee_valgus'
  | 'weight_shift'
  | 'heel_rise'
  | 'pelvis_drop'
  | 'not_high_enough';

export const ALL_FAULTS: FaultRuleId[] = [
  'torso_lean', 'asymmetry', 'elbow_bend', 'back_arch', 'knee_valgus',
  'weight_shift', 'heel_rise', 'pelvis_drop', 'not_high_enough',
];

export const THRESHOLDS = {
  torsoLeanDeg: 10, // TUNE:
  symmetryPct: 85, // TUNE:
  elbowDeg: 150, // TUNE:
  backArchFraction: 0.08, // TUNE: of body height
  valgusRatio: 0.15, // TUNE:
  weightShiftFraction: 0.08, // TUNE: of hip width
  heelRiseFraction: 0.02, // TUNE: of body height
  hipDrop: 0.12, // TUNE:
} as const;

export const DEBOUNCE_MS = 300;

/** Everything the rules need for one frame. Null = not measurable this frame (rule stays off). */
export interface FaultInput {
  repState: RepState;
  /** True while a rep is in progress (not READY) or a hold is running. */
  inMovement: boolean;
  torsoLean: number | null;
  /** Primary-angle symmetry %, null for single-side exercises. */
  symmetry: number | null;
  /** Smallest elbow angle of the tracked arms. */
  elbowAngle: number | null;
  /** Side view: mid-shoulder ahead of mid-hip in the facing direction (px). Negative = behind. */
  shoulderForward: number | null;
  bodyHeight: number | null;
  /** Largest valgus ratio of the checked knees. */
  valgus: number | null;
  midHipX: number | null;
  hipWidth: number | null;
  baselineMidHipX: number | null;
  /** Heel lift above calibration baseline as a fraction of body height (largest of both heels). */
  heelRise: number | null;
  hipDrop: number | null;
  turnedBackEarly: boolean;
}

export interface FaultResult {
  id: FaultRuleId;
  active: boolean;
  severity: number; // 0..1
}

const sev = (value: number, threshold: number) =>
  Math.min(1, Math.max(0, (value - threshold) / Math.max(Math.abs(threshold), 1e-6)));

/** Raw (undebounced) evaluation of a single rule. */
export function evaluateRule(id: FaultRuleId, f: FaultInput): { triggered: boolean; severity: number } {
  const off = { triggered: false, severity: 0 };
  switch (id) {
    case 'torso_lean':
      if (f.torsoLean === null) return off;
      return { triggered: f.torsoLean > THRESHOLDS.torsoLeanDeg, severity: sev(f.torsoLean, THRESHOLDS.torsoLeanDeg) };

    case 'asymmetry': {
      if (f.symmetry === null || (f.repState !== 'RAISING' && f.repState !== 'AT_TOP')) return off;
      const triggered = f.symmetry < THRESHOLDS.symmetryPct;
      return { triggered, severity: triggered ? Math.min(1, (THRESHOLDS.symmetryPct - f.symmetry) / 30) : 0 };
    }

    case 'elbow_bend': {
      // Arms hang slightly bent at rest, so only check during the movement.
      if (f.elbowAngle === null || !f.inMovement) return off;
      const triggered = f.elbowAngle < THRESHOLDS.elbowDeg;
      return { triggered, severity: triggered ? Math.min(1, (THRESHOLDS.elbowDeg - f.elbowAngle) / 60) : 0 };
    }

    case 'back_arch': {
      if (f.shoulderForward === null || !f.bodyHeight) return off;
      const behind = -f.shoulderForward / f.bodyHeight;
      return { triggered: behind > THRESHOLDS.backArchFraction, severity: sev(behind, THRESHOLDS.backArchFraction) };
    }

    case 'knee_valgus':
      if (f.valgus === null) return off;
      return { triggered: f.valgus > THRESHOLDS.valgusRatio, severity: sev(f.valgus, THRESHOLDS.valgusRatio) };

    case 'weight_shift': {
      if (f.midHipX === null || f.baselineMidHipX === null || !f.hipWidth) return off;
      const shift = Math.abs(f.midHipX - f.baselineMidHipX) / f.hipWidth;
      return { triggered: shift > THRESHOLDS.weightShiftFraction, severity: sev(shift, THRESHOLDS.weightShiftFraction) };
    }

    case 'heel_rise':
      if (f.heelRise === null) return off;
      return { triggered: f.heelRise > THRESHOLDS.heelRiseFraction, severity: sev(f.heelRise, THRESHOLDS.heelRiseFraction) };

    case 'pelvis_drop':
      if (f.hipDrop === null) return off;
      return { triggered: f.hipDrop > THRESHOLDS.hipDrop, severity: sev(f.hipDrop, THRESHOLDS.hipDrop) };

    case 'not_high_enough':
      return { triggered: f.turnedBackEarly, severity: f.turnedBackEarly ? 0.5 : 0 };
  }
}

export class FaultDetector {
  private readonly trueSince = new Map<FaultRuleId, number>();
  private readonly activeSet = new Set<FaultRuleId>();

  constructor(
    private readonly ids: readonly FaultRuleId[],
    private readonly debounceMs = DEBOUNCE_MS,
  ) {}

  /** Evaluate all rules for this frame. Returns every configured rule with its debounced state. */
  update(input: FaultInput, tMs: number): FaultResult[] {
    return this.ids.map((id) => {
      const { triggered, severity } = evaluateRule(id, input);
      if (!triggered) {
        this.trueSince.delete(id);
        this.activeSet.delete(id);
        return { id, active: false, severity: 0 };
      }
      // not_high_enough is an event flag set once per rep, so it needs no debounce.
      if (id === 'not_high_enough') {
        this.activeSet.add(id);
        return { id, active: true, severity };
      }
      const since = this.trueSince.get(id) ?? tMs;
      this.trueSince.set(id, since);
      const active = tMs - since >= this.debounceMs;
      if (active) this.activeSet.add(id);
      return { id, active, severity: active ? severity : 0 };
    });
  }

  /** Currently active faults, in rule order. */
  get active(): FaultRuleId[] {
    return this.ids.filter((id) => this.activeSet.has(id));
  }

  reset(): void {
    this.trueSince.clear();
    this.activeSet.clear();
  }
}
