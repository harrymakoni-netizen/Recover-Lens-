// Synthetic body generator for tests. Produces MediaPipe-shaped landmarks (normalized image
// coordinates + world landmarks) for a person facing a 1280×720 camera. The camera image is not
// mirrored, so the patient's left side appears on the image's right (larger x).
import type { Landmark } from '../landmarks';
import { LM } from '../landmarks';

export const W = 1280;
export const H = 720;

export interface Pose {
  /** Shoulder abduction (arm away from the torso), degrees. */
  armL?: number;
  armR?: number;
  /** Sideways torso lean, degrees (positive = towards patient's left). */
  lean?: number;
  /** Knee flexion, degrees (0 = straight). */
  kneeFlexL?: number;
  kneeFlexR?: number;
  /** Knee moves inward by this fraction of hip width. */
  valgusL?: number;
  valgusR?: number;
  /** Lift a foot off the floor (fraction of body height). */
  liftL?: number;
  liftR?: number;
  /** Hip drop on the patient's right (fraction of hip width). */
  hipDropR?: number;
  /** Whole body raised (jump), fraction of body height. */
  jump?: number;
  /** Scale: 1 = body fills ~78 % of frame height. >1 = closer to the camera. */
  scale?: number;
  /** Horizontal offset of the body centre, fraction of frame width. */
  offsetX?: number;
  /** Elbow bend, degrees (0 = straight). */
  elbowBend?: number;
}

interface P3 {
  x: number;
  y: number;
  z: number;
}

const rad = (d: number) => (d * Math.PI) / 180;

export function makePose(pose: Pose = {}, noise = 0, rand: () => number = Math.random): {
  landmarks: Landmark[];
  world: Landmark[];
} {
  const s = pose.scale ?? 1;
  const cx = W / 2 + (pose.offsetX ?? 0) * W;
  const bodyPx = 560 * s; // nose → ankles
  const floorY = 360 + bodyPx * 0.55;
  const jumpPx = (pose.jump ?? 0) * bodyPx;

  const hipHalf = 45 * s;
  const shoulderHalf = 75 * s;
  const thigh = 165 * s;
  const shank = 160 * s;
  const torso = 175 * s;
  const neck = 75 * s;
  const upperArm = 115 * s;
  const forearm = 105 * s;

  const pts: P3[] = Array.from({ length: 33 }, () => ({ x: cx, y: floorY - bodyPx / 2, z: 0 }));

  // Legs: ankle fixed on the floor; knee flexion splits between shank (forward) and thigh (back).
  const leg = (side: 'L' | 'R') => {
    const dir = side === 'L' ? 1 : -1;
    const flex = (side === 'L' ? pose.kneeFlexL : pose.kneeFlexR) ?? 0;
    const lift = ((side === 'L' ? pose.liftL : pose.liftR) ?? 0) * bodyPx;
    const valgus = ((side === 'L' ? pose.valgusL : pose.valgusR) ?? 0) * hipHalf * 2;
    const ankle: P3 = { x: cx + dir * hipHalf, y: floorY - lift - jumpPx, z: 0 };
    const b = rad(flex / 2);
    const knee: P3 = {
      x: ankle.x - dir * valgus,
      y: ankle.y - shank * Math.cos(b),
      z: -shank * Math.sin(b),
    };
    const hip: P3 = { x: cx + dir * hipHalf, y: knee.y - thigh * Math.cos(b), z: knee.z + thigh * Math.sin(b) };
    return { ankle, knee, hip };
  };
  const l = leg('L');
  const r = leg('R');
  // Hips sit at the higher (standing) leg's height; a lifted, bent leg does not lift the pelvis.
  const hipY = Math.max(l.hip.y, r.hip.y);
  const lHip: P3 = { x: l.hip.x, y: hipY, z: 0 };
  const rHip: P3 = { x: r.hip.x, y: hipY + (pose.hipDropR ?? 0) * hipHalf * 2, z: 0 };
  // Re-derive the lifted leg's knee under its hip.
  for (const [side, legPts, hip] of [['L', l, lHip], ['R', r, rHip]] as const) {
    const lift = side === 'L' ? pose.liftL : pose.liftR;
    if (lift) {
      legPts.knee = { x: hip.x, y: hip.y + thigh * 0.8, z: -thigh * 0.6 };
      legPts.ankle = { x: hip.x, y: legPts.knee.y + shank * 0.7, z: 0 };
    }
  }

  const midHip = { x: (lHip.x + rHip.x) / 2, y: (lHip.y + rHip.y) / 2 };
  const lean = rad(pose.lean ?? 0);
  const up = { x: Math.sin(lean), y: -Math.cos(lean) };
  const midShoulder = { x: midHip.x + up.x * torso, y: midHip.y + up.y * torso };
  const across = { x: Math.cos(lean), y: Math.sin(lean) };
  const lSh: P3 = { x: midShoulder.x + across.x * shoulderHalf, y: midShoulder.y + across.y * shoulderHalf, z: 0 };
  const rSh: P3 = { x: midShoulder.x - across.x * shoulderHalf, y: midShoulder.y - across.y * shoulderHalf, z: 0 };
  const nose: P3 = { x: midShoulder.x + up.x * neck, y: midShoulder.y + up.y * neck, z: -20 * s };

  const arm = (side: 'L' | 'R', sh: P3) => {
    const dir = side === 'L' ? 1 : -1;
    const a = rad((side === 'L' ? pose.armL : pose.armR) ?? 15);
    // Arm angle is measured from the torso's "down" direction, rotating outward.
    const down = { x: -up.x, y: -up.y };
    const out = { x: across.x * dir, y: across.y * dir };
    const v = { x: down.x * Math.cos(a) + out.x * Math.sin(a), y: down.y * Math.cos(a) + out.y * Math.sin(a) };
    const elbow: P3 = { x: sh.x + v.x * upperArm, y: sh.y + v.y * upperArm, z: 0 };
    const bend = rad(pose.elbowBend ?? 0);
    const fv = {
      x: v.x * Math.cos(bend) - v.y * Math.sin(bend) * dir,
      y: v.y * Math.cos(bend) + v.x * Math.sin(bend) * dir,
    };
    const wrist: P3 = { x: elbow.x + fv.x * forearm, y: elbow.y + fv.y * forearm, z: 0 };
    return { elbow, wrist };
  };
  const la = arm('L', lSh);
  const ra = arm('R', rSh);

  pts[LM.NOSE] = nose;
  pts[LM.L_SHOULDER] = lSh;
  pts[LM.R_SHOULDER] = rSh;
  pts[LM.L_ELBOW] = la.elbow;
  pts[LM.R_ELBOW] = ra.elbow;
  pts[LM.L_WRIST] = la.wrist;
  pts[LM.R_WRIST] = ra.wrist;
  pts[LM.L_HIP] = lHip;
  pts[LM.R_HIP] = rHip;
  pts[LM.L_KNEE] = l.knee;
  pts[LM.R_KNEE] = r.knee;
  pts[LM.L_ANKLE] = l.ankle;
  pts[LM.R_ANKLE] = r.ankle;
  pts[LM.L_HEEL] = { x: l.ankle.x, y: l.ankle.y + 12 * s, z: 10 };
  pts[LM.R_HEEL] = { x: r.ankle.x, y: r.ankle.y + 12 * s, z: 10 };
  pts[LM.L_FOOT] = { x: l.ankle.x + 8 * s, y: l.ankle.y + 18 * s, z: -40 };
  pts[LM.R_FOOT] = { x: r.ankle.x - 8 * s, y: r.ankle.y + 18 * s, z: -40 };
  // Face/hand landmarks: put them near their parents.
  for (let i = 1; i <= 10; i++) pts[i] = { ...nose };
  for (const i of [17, 19, 21]) pts[i] = { ...la.wrist };
  for (const i of [18, 20, 22]) pts[i] = { ...ra.wrist };

  const n = () => (rand() - 0.5) * 2 * noise;
  const landmarks: Landmark[] = pts.map((p) => {
    const x = (p.x + n()) / W;
    const y = (p.y + n()) / H;
    const inFrame = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    return { x, y, z: (p.z + n()) / W, visibility: inFrame ? 0.95 : 0.2 };
  });
  const world: Landmark[] = pts.map((p) => ({
    x: (p.x - midHip.x) / 400,
    y: (p.y - midHip.y) / 400,
    z: p.z / 400,
    visibility: 0.95,
  }));
  return { landmarks, world };
}

/** Seeded PRNG so tests are deterministic. */
export function seeded(seed = 42): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
