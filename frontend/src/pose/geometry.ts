// Angles and body metrics, always computed in pixel space (SPEC §5.2).
import { type Landmark, LM, SIDE_LANDMARKS, type Side, isVisible } from './landmarks';

export interface Point {
  x: number;
  y: number;
}

/** Convert a normalized landmark to pixels so angles are not distorted on non-square video. */
export function toPixels(lm: Landmark, videoWidth: number, videoHeight: number): Point {
  return { x: lm.x * videoWidth, y: lm.y * videoHeight };
}

/** Angle at B formed by A-B-C, in degrees, 0..180. */
export function angle(a: Point, b: Point, c: Point): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  return mag === 0 ? 0 : (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** 3D angle at B formed by A-B-C, in degrees, 0..180. */
export function angle3d(a: Point3, b: Point3, c: Point3): number {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const mag = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z);
  return mag === 0 ? 0 : (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Direction of the segment from `from` to `to`, measured from straight down (image y), 0..180. */
export function angleFromDown(from: Point, to: Point): number {
  const v = { x: to.x - from.x, y: to.y - from.y };
  const mag = Math.hypot(v.x, v.y);
  if (mag === 0) return 0;
  return (Math.acos(clamp(v.y / mag, -1, 1)) * 180) / Math.PI;
}

/** Angle between midHip→midShoulder and straight up (0, -1), in degrees. */
export function torsoLean(midHip: Point, midShoulder: Point): number {
  const v = { x: midShoulder.x - midHip.x, y: midShoulder.y - midHip.y };
  const mag = Math.hypot(v.x, v.y);
  if (mag === 0) return 0;
  const cos = clamp(-v.y / mag, -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

/** 0° lean = 100 %, 20° lean = 0 %. */
export function torsoAlignment(leanDeg: number): number {
  return clamp(100 - leanDeg * 5, 0, 100);
}

/** 100 - (|L - R| / max(L, R, 1)) * 100 */
export function symmetry(left: number, right: number): number {
  return clamp(100 - (Math.abs(left - right) / Math.max(left, right, 1)) * 100, 0, 100);
}

/**
 * Horizontal distance of the knee from the hip–ankle line, divided by hip width.
 * Positive = knee is inside the line (towards the body's midline).
 */
export function kneeValgusRatio(
  hip: Point,
  knee: Point,
  ankle: Point,
  midlineX: number,
  hipWidth: number,
): number {
  if (hipWidth <= 0) return 0;
  const dy = ankle.y - hip.y;
  const lineX = dy === 0 ? hip.x : hip.x + ((ankle.x - hip.x) * (knee.y - hip.y)) / dy;
  const inward = Math.sign(midlineX - lineX) || 1;
  return ((knee.x - lineX) * inward) / hipWidth;
}

/** Vertical difference between the hips divided by hip width. */
export function hipDrop(leftHip: Point, rightHip: Point, hipWidth: number): number {
  if (hipWidth <= 0) return 0;
  return Math.abs(leftHip.y - rightHip.y) / hipWidth;
}

export type Joint = 'shoulder' | 'elbow' | 'knee' | 'hip';

export interface AngleSpec {
  joint: Joint;
  /**
   * Measure in 3D. From a front camera a squat bends the knee towards the lens, so the flat 2D
   * hip–knee–ankle angle barely changes; depth is needed to see it.
   */
  depth?: boolean;
}

/** Landmark triplet (A, B=vertex, C) for a joint angle on one side. */
export function jointTriplet(joint: Joint, side: Side): [number, number, number] {
  const s = SIDE_LANDMARKS[side];
  switch (joint) {
    case 'shoulder':
      return [s.hip, s.shoulder, s.elbow];
    case 'elbow':
      return [s.shoulder, s.elbow, s.wrist];
    case 'knee':
      return [s.hip, s.knee, s.ankle];
    case 'hip':
      return [s.shoulder, s.hip, s.knee];
  }
}

/** Joint angle in degrees, or null if any of the three landmarks is not visible enough. */
export function jointAngle(
  landmarks: Landmark[],
  joint: Joint,
  side: Side,
  w: number,
  h: number,
  minVisibility?: number,
): number | null {
  const [a, b, c] = jointTriplet(joint, side);
  const la = landmarks[a];
  const lb = landmarks[b];
  const lc = landmarks[c];
  if (!isVisible(la, minVisibility) || !isVisible(lb, minVisibility) || !isVisible(lc, minVisibility)) {
    return null;
  }
  return angle(toPixels(la, w, h), toPixels(lb, w, h), toPixels(lc, w, h));
}

/** Raw (unsmoothed) per-frame body measurements. Null = landmarks not visible enough. */
export interface RawMetrics {
  shoulderL: number | null;
  shoulderR: number | null;
  elbowL: number | null;
  elbowR: number | null;
  kneeL: number | null;
  kneeR: number | null;
  /** Shoulder–hip–knee, degrees (180 = straight at the hip). */
  hipL: number | null;
  hipR: number | null;
  /** Shoulder–hip–ankle, degrees: the body line in a plank or push-up (180 = straight). */
  bodyLineL: number | null;
  bodyLineR: number | null;
  /** Forward shin tilt from vertical, degrees (side view; see shinTilt). */
  shinL: number | null;
  shinR: number | null;
  /** Knee-to-ankle distance in pixels, the scale for heel lift when the whole body is not in view. */
  shinLenL: number | null;
  shinLenR: number | null;
  torsoLean: number | null;
  valgusL: number | null;
  valgusR: number | null;
  hipDrop: number | null;
  /** Mid-hip x in pixels. */
  midHipX: number | null;
  /** Mid-hip y in pixels. */
  midHipY: number | null;
  /** Hip width in pixels. */
  hipWidth: number | null;
  /** Nose to mid-ankle, in pixels. */
  bodyHeight: number | null;
  heelLY: number | null;
  heelRY: number | null;
  ankleLY: number | null;
  ankleRY: number | null;
  /**
   * Side view: horizontal offset of mid-shoulder from mid-hip in the direction the person faces,
   * in pixels. Negative = shoulders behind hips (back arch).
   */
  shoulderForward: number | null;
  /** Elbow → wrist, degrees from hanging straight down (joint-load estimate). */
  forearmDownL: number | null;
  forearmDownR: number | null;
  /** Shoulder → wrist, degrees from hanging straight down. */
  armDownL: number | null;
  armDownR: number | null;
}

/**
 * Knee angle in 3D. Uses MediaPipe world landmarks (metres) when given, otherwise the image
 * landmarks with z scaled like x (MediaPipe's z uses roughly the same scale as x).
 */
export function kneeAngle3d(
  landmarks: Landmark[],
  side: Side,
  w: number,
  h: number,
  world?: Landmark[] | null,
): number | null {
  const [a, b, c] = jointTriplet('knee', side);
  if (![a, b, c].every((i) => isVisible(landmarks[i]))) return null;
  if (world && world.length >= 33) {
    const p3 = (i: number) => ({ x: world[i].x, y: world[i].y, z: world[i].z ?? 0 });
    return angle3d(p3(a), p3(b), p3(c));
  }
  const p3 = (i: number) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h, z: (landmarks[i].z ?? 0) * w });
  return angle3d(p3(a), p3(b), p3(c));
}

export interface MetricOptions {
  /** Use 3D knee angles (front-view knee exercises). */
  kneeDepth?: boolean;
  world?: Landmark[] | null;
}

export function computeRawMetrics(
  landmarks: Landmark[],
  w: number,
  h: number,
  opts: MetricOptions = {},
): RawMetrics {
  const p = (i: number) => toPixels(landmarks[i], w, h);
  const vis = (...idx: number[]) => idx.every((i) => isVisible(landmarks[i]));

  const hipsVisible = vis(LM.L_HIP, LM.R_HIP);
  const shouldersVisible = vis(LM.L_SHOULDER, LM.R_SHOULDER);
  const midHip = hipsVisible ? midpoint(p(LM.L_HIP), p(LM.R_HIP)) : null;
  const midShoulder = shouldersVisible ? midpoint(p(LM.L_SHOULDER), p(LM.R_SHOULDER)) : null;
  const hipWidth = hipsVisible ? Math.abs(p(LM.L_HIP).x - p(LM.R_HIP).x) : null;

  const valgus = (side: Side): number | null => {
    const s = SIDE_LANDMARKS[side];
    if (!midHip || !hipWidth || hipWidth < 1 || !vis(s.hip, s.knee, s.ankle)) return null;
    return kneeValgusRatio(p(s.hip), p(s.knee), p(s.ankle), midHip.x, hipWidth);
  };

  let bodyHeight: number | null = null;
  if (vis(LM.NOSE, LM.L_ANKLE, LM.R_ANKLE)) {
    const midAnkle = midpoint(p(LM.L_ANKLE), p(LM.R_ANKLE));
    bodyHeight = Math.abs(midAnkle.y - p(LM.NOSE).y);
  }

  const fromDown = (side: Side, proximal: 'shoulder' | 'elbow'): number | null => {
    const s = SIDE_LANDMARKS[side];
    return vis(s[proximal], s.wrist) ? angleFromDown(p(s[proximal]), p(s.wrist)) : null;
  };

  const bodyLine = (side: Side): number | null => {
    const s = SIDE_LANDMARKS[side];
    return vis(s.shoulder, s.hip, s.ankle) ? angle(p(s.shoulder), p(s.hip), p(s.ankle)) : null;
  };

  let shoulderForward: number | null = null;
  if (midHip && midShoulder && vis(LM.NOSE)) {
    const facing = Math.sign(p(LM.NOSE).x - midShoulder.x) || 1;
    shoulderForward = (midShoulder.x - midHip.x) * facing;
  }

  return {
    shoulderL: jointAngle(landmarks, 'shoulder', 'left', w, h),
    shoulderR: jointAngle(landmarks, 'shoulder', 'right', w, h),
    elbowL: jointAngle(landmarks, 'elbow', 'left', w, h),
    elbowR: jointAngle(landmarks, 'elbow', 'right', w, h),
    kneeL: opts.kneeDepth ? kneeAngle3d(landmarks, 'left', w, h, opts.world) : jointAngle(landmarks, 'knee', 'left', w, h),
    kneeR: opts.kneeDepth ? kneeAngle3d(landmarks, 'right', w, h, opts.world) : jointAngle(landmarks, 'knee', 'right', w, h),
    hipL: jointAngle(landmarks, 'hip', 'left', w, h),
    hipR: jointAngle(landmarks, 'hip', 'right', w, h),
    bodyLineL: bodyLine('left'),
    bodyLineR: bodyLine('right'),
    shinL: shinTilt(landmarks, 'left', w, h),
    shinR: shinTilt(landmarks, 'right', w, h),
    shinLenL: shinLength(landmarks, 'left', w, h),
    shinLenR: shinLength(landmarks, 'right', w, h),
    torsoLean: midHip && midShoulder ? torsoLean(midHip, midShoulder) : null,
    valgusL: valgus('left'),
    valgusR: valgus('right'),
    hipDrop: hipsVisible && hipWidth && hipWidth >= 1 ? hipDrop(p(LM.L_HIP), p(LM.R_HIP), hipWidth) : null,
    midHipX: midHip?.x ?? null,
    midHipY: midHip?.y ?? null,
    hipWidth,
    bodyHeight,
    heelLY: vis(LM.L_HEEL) ? p(LM.L_HEEL).y : null,
    heelRY: vis(LM.R_HEEL) ? p(LM.R_HEEL).y : null,
    ankleLY: vis(LM.L_ANKLE) ? p(LM.L_ANKLE).y : null,
    ankleRY: vis(LM.R_ANKLE) ? p(LM.R_ANKLE).y : null,
    shoulderForward,
    forearmDownL: fromDown('left', 'elbow'),
    forearmDownR: fromDown('right', 'elbow'),
    armDownL: fromDown('left', 'shoulder'),
    armDownR: fromDown('right', 'shoulder'),
  };
}


/** Where the wrist is relative to the shoulder, in torso lengths (shoulder–hip distance) × 100. */
export interface ReachPoint {
  /** Forward (the way the person faces) of the shoulder, %. */
  reach: number;
  /** Below the shoulder, %. Negative = above shoulder height. */
  drop: number;
  /** Shoulder–hip distance in pixels (the unit of the two numbers above). */
  torsoPx: number;
  shoulder: Point;
}

/**
 * Wrist position relative to the shoulder in torso lengths, for a seated reach seen from the side
 * (pixel space, SPEC §5.2). `facing` is +1 when the person faces image-right, −1 image-left.
 */
export function reachPoint(
  landmarks: Landmark[],
  side: Side,
  w: number,
  h: number,
  facing: number,
  minVisibility?: number,
): ReachPoint | null {
  const s = SIDE_LANDMARKS[side];
  const sh = landmarks[s.shoulder];
  const hip = landmarks[s.hip];
  const wr = landmarks[s.wrist];
  if (!isVisible(sh, minVisibility) || !isVisible(hip, minVisibility) || !isVisible(wr, minVisibility)) return null;
  const S = toPixels(sh, w, h);
  const torsoPx = distance(S, toPixels(hip, w, h));
  if (torsoPx < 1) return null;
  const W = toPixels(wr, w, h);
  return {
    reach: (((W.x - S.x) * facing) / torsoPx) * 100,
    drop: ((W.y - S.y) / torsoPx) * 100,
    torsoPx,
    shoulder: S,
  };
}

/** Which way the person faces in a side view: nose ahead of the mid-shoulder. +1 = image-right. */
export function facingOf(landmarks: Landmark[], w: number): number | null {
  const nose = landmarks[LM.NOSE];
  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  if (!isVisible(nose) || !isVisible(ls) || !isVisible(rs)) return null;
  const dx = (nose.x - (ls.x + rs.x) / 2) * w;
  return Math.abs(dx) < 2 ? null : Math.sign(dx);
}


/**
 * Forward tilt of the shin from vertical, in degrees (pixel space, SPEC §5.2), seen from the side.
 * Positive = the knee is ahead of the ankle, in the direction the foot points (heel to toe).
 * Null when the foot direction cannot be told (heel and toe level), so no guess is made.
 */
export function shinTilt(landmarks: Landmark[], side: Side, w: number, h: number, minVisibility?: number): number | null {
  const s = SIDE_LANDMARKS[side];
  const knee = landmarks[s.knee];
  const ankle = landmarks[s.ankle];
  const heel = landmarks[s.heel];
  const foot = landmarks[s.foot];
  if (![knee, ankle, heel, foot].every((l) => isVisible(l, minVisibility))) return null;
  const K = toPixels(knee, w, h);
  const A = toPixels(ankle, w, h);
  const facing = Math.sign((foot.x - heel.x) * w);
  if (facing === 0 || Math.abs((foot.x - heel.x) * w) < 2) return null;
  const rise = A.y - K.y; // the knee is above the ankle: positive
  if (rise <= 1) return null;
  return (Math.atan2((K.x - A.x) * facing, rise) * 180) / Math.PI;
}

/** Knee-to-ankle distance in pixels. */
export function shinLength(landmarks: Landmark[], side: Side, w: number, h: number): number | null {
  const s = SIDE_LANDMARKS[side];
  if (!isVisible(landmarks[s.knee]) || !isVisible(landmarks[s.ankle])) return null;
  return distance(toPixels(landmarks[s.knee], w, h), toPixels(landmarks[s.ankle], w, h));
}
