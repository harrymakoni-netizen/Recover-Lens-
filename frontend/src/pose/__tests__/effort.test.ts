import { describe, expect, it } from 'vitest';
import { AVERAGE_ADULT, jointTorque, summariseEffort } from '../effort';
import { angleFromDown } from '../geometry';

describe('segment direction', () => {
  it('is 0 hanging down, 90 level and 180 straight up', () => {
    expect(angleFromDown({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(0);
    expect(angleFromDown({ x: 0, y: 0 }, { x: -10, y: 0 })).toBeCloseTo(90);
    expect(angleFromDown({ x: 0, y: 0 }, { x: 0, y: -10 })).toBeCloseTo(180);
  });
});

describe('joint load (static, average adult)', () => {
  it('is zero with the limb hanging and highest with it level', () => {
    expect(jointTorque('elbow', 0)).toBeCloseTo(0);
    expect(jointTorque('elbow', 90)).toBeGreaterThan(jointTorque('elbow', 45));
    expect(jointTorque('elbow', 180)).toBeCloseTo(0, 5);
  });

  it('matches the body-segment tables for a 70 kg, 1.70 m adult', () => {
    // Forearm and hand: 2.2 % of body mass, centre of mass 68.2 % along a forearm of 14.6 % of height.
    expect(jointTorque('elbow', 90)).toBeCloseTo(2.56, 2);
    // Whole arm: 5 % of body mass, centre 53 % along an arm of 33.2 % of height.
    expect(jointTorque('shoulder', 90)).toBeCloseTo(10.27, 2);
  });

  it('adds the weight held in the hand', () => {
    const bottle = jointTorque('elbow', 90, 0.5) - jointTorque('elbow', 90);
    expect(bottle).toBeCloseTo(0.5 * 9.81 * (0.146 * AVERAGE_ADULT.heightM + 0.06), 3);
    expect(jointTorque('elbow', 90, -3)).toBeCloseTo(jointTorque('elbow', 90));
  });

  it('summarises each rep peak, ignoring reps it could not measure', () => {
    expect(summariseEffort([null, null], 'elbow', 0)).toBeNull();
    expect(summariseEffort([4, null, 6], 'elbow', 1)).toEqual({ joint: 'elbow', loadKg: 1, peakNm: 5, maxNm: 6 });
  });
});
