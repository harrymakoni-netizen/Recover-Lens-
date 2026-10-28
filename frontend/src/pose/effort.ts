// Joint load: the turning force (torque) that gravity puts on a joint from the limb and anything
// held in the hand. A static estimate for an average adult from published body-segment tables
// (Winter, Biomechanics and Motor Control of Human Movement, 2009). It is not a measurement of
// muscle force: it shows how hard a movement is for the joint, so heavier or more horizontal
// work reads higher. A physics check against OpenSim on a public curl dataset is described in
// the README.
export type EffortJoint = 'elbow' | 'shoulder';

export interface Body {
  massKg: number;
  heightM: number;
}

/** Used until a clinician records the person's own height and weight. */
export const AVERAGE_ADULT: Body = { massKg: 70, heightM: 1.7 };

const G = 9.81;
/** Segment mass (fraction of body mass), length (fraction of height), centre of mass (fraction from the joint). */
const SEGMENTS: Record<EffortJoint, { mass: number; length: number; com: number }> = {
  elbow: { mass: 0.022, length: 0.146, com: 0.682 }, // forearm and hand, measured from the elbow
  shoulder: { mass: 0.05, length: 0.332, com: 0.53 }, // whole arm, measured from the shoulder
};
/** A weight is held at the centre of the hand, this far beyond the wrist. */
const HAND_BEYOND_WRIST_M = 0.06;

/** Load choices offered before an exercise that has a joint-load estimate (kg). 0.5 = a 500 ml bottle. */
export const LOAD_CHOICES = [0, 0.5, 1, 2] as const;

/**
 * Static torque (N·m) at the joint when the segment points `angleFromDownDeg` away from hanging
 * straight down (0 = hanging, 90 = horizontal, 180 = straight up).
 */
export function jointTorque(joint: EffortJoint, angleFromDownDeg: number, loadKg = 0, body: Body = AVERAGE_ADULT): number {
  const s = SEGMENTS[joint];
  const length = s.length * body.heightM;
  const lever = Math.sin((Math.min(180, Math.max(0, angleFromDownDeg)) * Math.PI) / 180);
  return G * lever * (s.mass * body.massKg * s.com * length + Math.max(0, loadKg) * (length + HAND_BEYOND_WRIST_M));
}

export interface EffortSummary {
  joint: EffortJoint;
  loadKg: number;
  /** Average of each rep's peak joint load, N·m. */
  peakNm: number;
  /** Highest joint load in the session, N·m. */
  maxNm: number;
}

export function summariseEffort(repPeaks: Array<number | null>, joint: EffortJoint, loadKg: number): EffortSummary | null {
  const peaks = repPeaks.filter((p): p is number => p !== null);
  if (!peaks.length) return null;
  return {
    joint,
    loadKg,
    peakNm: peaks.reduce((a, b) => a + b, 0) / peaks.length,
    maxNm: Math.max(...peaks),
  };
}
