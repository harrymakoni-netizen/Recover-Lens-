import { describe, expect, it } from 'vitest';
import { FaultDetector, THRESHOLDS, evaluateRule, type FaultInput, type FaultRuleId } from '../formRules';

const base: FaultInput = {
  repState: 'RAISING',
  inMovement: true,
  torsoLean: 2,
  symmetry: 98,
  elbowAngle: 175,
  shoulderForward: 0,
  bodyHeight: 500,
  valgus: 0,
  midHipX: 320,
  hipWidth: 80,
  baselineMidHipX: 320,
  heelRise: 0,
  hipDrop: 0,
  turnedBackEarly: false,
};

/** For each rule: an input just below the threshold and one just above. */
const cases: Array<[FaultRuleId, Partial<FaultInput>, Partial<FaultInput>]> = [
  ['torso_lean', { torsoLean: THRESHOLDS.torsoLeanDeg - 1 }, { torsoLean: THRESHOLDS.torsoLeanDeg + 1 }],
  ['asymmetry', { symmetry: THRESHOLDS.symmetryPct + 1 }, { symmetry: THRESHOLDS.symmetryPct - 1 }],
  ['elbow_bend', { elbowAngle: THRESHOLDS.elbowDeg + 1 }, { elbowAngle: THRESHOLDS.elbowDeg - 1 }],
  ['back_arch', { shoulderForward: -0.07 * 500 }, { shoulderForward: -0.09 * 500 }],
  ['knee_valgus', { valgus: THRESHOLDS.valgusRatio - 0.01 }, { valgus: THRESHOLDS.valgusRatio + 0.01 }],
  ['weight_shift', { midHipX: 320 + 0.07 * 80 }, { midHipX: 320 + 0.09 * 80 }],
  ['heel_rise', { heelRise: THRESHOLDS.heelRiseFraction - 0.005 }, { heelRise: THRESHOLDS.heelRiseFraction + 0.005 }],
  ['pelvis_drop', { hipDrop: THRESHOLDS.hipDrop - 0.01 }, { hipDrop: THRESHOLDS.hipDrop + 0.01 }],
  ['not_high_enough', { turnedBackEarly: false }, { turnedBackEarly: true }],
];

describe('form rules (SPEC §5.5 / §12.3)', () => {
  it.each(cases)('%s stays inactive below and activates above its threshold', (id, below, above) => {
    expect(evaluateRule(id, { ...base, ...below }).triggered).toBe(false);
    expect(evaluateRule(id, { ...base, ...above }).triggered).toBe(true);

    const detector = new FaultDetector([id]);
    for (let t = 0; t <= 600; t += 33) detector.update({ ...base, ...below }, t);
    expect(detector.active).toEqual([]);
    for (let t = 633; t <= 1200; t += 33) detector.update({ ...base, ...above }, t);
    expect(detector.active).toEqual([id]);
  });

  it('rules stay off when the measurement is unavailable', () => {
    const nulls: FaultInput = {
      ...base, torsoLean: null, symmetry: null, elbowAngle: null, shoulderForward: null, valgus: null,
      midHipX: null, heelRise: null, hipDrop: null,
    };
    for (const [id] of cases) {
      if (id === 'not_high_enough') continue;
      expect(evaluateRule(id, nulls).triggered).toBe(false);
    }
  });

  it('asymmetry is only checked while raising or at the top', () => {
    expect(evaluateRule('asymmetry', { ...base, symmetry: 50, repState: 'READY' }).triggered).toBe(false);
    expect(evaluateRule('asymmetry', { ...base, symmetry: 50, repState: 'LOWERING' }).triggered).toBe(false);
    expect(evaluateRule('asymmetry', { ...base, symmetry: 50, repState: 'AT_TOP' }).triggered).toBe(true);
  });

  it('debounces: a fault must hold for 300 ms before it is active', () => {
    const d = new FaultDetector(['torso_lean']);
    const leaning = { ...base, torsoLean: 20 };
    expect(d.update(leaning, 0)[0].active).toBe(false);
    expect(d.update(leaning, 200)[0].active).toBe(false);
    expect(d.update(leaning, 299)[0].active).toBe(false);
    expect(d.update(leaning, 300)[0].active).toBe(true);
  });

  it('a brief flicker never activates, and clearing is instant', () => {
    const d = new FaultDetector(['torso_lean']);
    const leaning = { ...base, torsoLean: 20 };
    d.update(leaning, 0);
    d.update(leaning, 200);
    d.update(base, 233); // straightened: timer resets
    d.update(leaning, 266);
    expect(d.update(leaning, 500)[0].active).toBe(false);
    expect(d.update(leaning, 566)[0].active).toBe(true);
    expect(d.update(base, 600)[0].active).toBe(false);
    expect(d.active).toEqual([]);
  });
});
