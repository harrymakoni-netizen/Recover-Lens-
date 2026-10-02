// MediaPipe Pose landmark indices and visibility helpers (SPEC §4.2).
// "Left" always means the patient's left.

export interface Landmark {
  x: number; // normalized 0..1 across the video width
  y: number; // normalized 0..1 down the video height
  z?: number;
  visibility?: number;
}

export const LM = {
  NOSE: 0,
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_ELBOW: 13,
  R_ELBOW: 14,
  L_WRIST: 15,
  R_WRIST: 16,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
  L_HEEL: 29,
  R_HEEL: 30,
  L_FOOT: 31,
  R_FOOT: 32,
} as const;

/** The 12 body joints drawn on the skeleton (plus nose for the head). */
export const BODY_JOINTS: number[] = [
  LM.NOSE,
  LM.L_SHOULDER, LM.R_SHOULDER, LM.L_ELBOW, LM.R_ELBOW, LM.L_WRIST, LM.R_WRIST,
  LM.L_HIP, LM.R_HIP, LM.L_KNEE, LM.R_KNEE, LM.L_ANKLE, LM.R_ANKLE,
];

/** Shoulders, hips, knees, ankles and nose: the whole body, head to feet. */
export const FULL_BODY: number[] = [
  LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP,
  LM.L_KNEE, LM.R_KNEE, LM.L_ANKLE, LM.R_ANKLE,
];

export const SKELETON_CONNECTIONS: Array<[number, number]> = [
  [LM.L_SHOULDER, LM.R_SHOULDER],
  [LM.L_SHOULDER, LM.L_ELBOW],
  [LM.L_ELBOW, LM.L_WRIST],
  [LM.R_SHOULDER, LM.R_ELBOW],
  [LM.R_ELBOW, LM.R_WRIST],
  [LM.L_SHOULDER, LM.L_HIP],
  [LM.R_SHOULDER, LM.R_HIP],
  [LM.L_HIP, LM.R_HIP],
  [LM.L_HIP, LM.L_KNEE],
  [LM.L_KNEE, LM.L_ANKLE],
  [LM.R_HIP, LM.R_KNEE],
  [LM.R_KNEE, LM.R_ANKLE],
  [LM.L_ANKLE, LM.L_HEEL],
  [LM.R_ANKLE, LM.R_HEEL],
  [LM.L_HEEL, LM.L_FOOT],
  [LM.R_HEEL, LM.R_FOOT],
];

/** Visibility used to accept a landmark for angle maths (SPEC §5.3). */
export const MIN_ANGLE_VISIBILITY = 0.5;
/** Visibility required during calibration (SPEC §5.1). */
export const MIN_CALIBRATION_VISIBILITY = 0.6;

export function visibilityOf(lm: Landmark | undefined): number {
  if (!lm) return 0;
  return lm.visibility ?? 1;
}

export function isVisible(lm: Landmark | undefined, min = MIN_ANGLE_VISIBILITY): boolean {
  return visibilityOf(lm) >= min;
}

export function allVisible(
  landmarks: Landmark[] | null | undefined,
  indices: number[],
  min = MIN_ANGLE_VISIBILITY,
): boolean {
  if (!landmarks) return false;
  return indices.every((i) => isVisible(landmarks[i], min));
}

export type Side = 'left' | 'right';

export const SIDE_LANDMARKS: Record<Side, {
  shoulder: number; elbow: number; wrist: number; hip: number; knee: number; ankle: number; heel: number;
}> = {
  left: {
    shoulder: LM.L_SHOULDER, elbow: LM.L_ELBOW, wrist: LM.L_WRIST,
    hip: LM.L_HIP, knee: LM.L_KNEE, ankle: LM.L_ANKLE, heel: LM.L_HEEL,
  },
  right: {
    shoulder: LM.R_SHOULDER, elbow: LM.R_ELBOW, wrist: LM.R_WRIST,
    hip: LM.R_HIP, knee: LM.R_KNEE, ankle: LM.R_ANKLE, heel: LM.R_HEEL,
  },
};
