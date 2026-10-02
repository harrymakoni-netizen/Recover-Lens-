// Calibration gate: is the whole body visible, in frame, and at a good distance? (SPEC §5.1)
import { type Landmark, LM, MIN_CALIBRATION_VISIBILITY, visibilityOf } from './landmarks';

export type CalibrationIssue =
  | 'no_person'
  | 'step_back'
  | 'move_closer'
  | 'move_center'
  | 'low_light';

export interface CalibrationCheck {
  ok: boolean;
  issue: CalibrationIssue | null;
  /** Nose to mid-ankle as a fraction of frame height, when measurable. */
  bodyHeight: number | null;
}

const EDGE_MIN = 0.03;
const EDGE_MAX = 0.97;
const BODY_MIN = 0.55; // TUNE:
const BODY_MAX = 0.92; // TUNE:
const CENTER_MIN = 0.2; // TUNE: mid-hip x must sit inside the middle 60 % of the frame
const CENTER_MAX = 0.8; // TUNE:

const LOWER_BODY: number[] = [LM.L_KNEE, LM.R_KNEE, LM.L_ANKLE, LM.R_ANKLE];

const inFrame = (v: number) => v >= EDGE_MIN && v <= EDGE_MAX;

export interface CalibrationOptions {
  minBodyHeight?: number;
  maxBodyHeight?: number;
}

export function checkCalibration(
  landmarks: Landmark[] | null | undefined,
  required: number[],
  opts: CalibrationOptions = {},
): CalibrationCheck {
  const bodyMin = opts.minBodyHeight ?? BODY_MIN;
  const bodyMax = opts.maxBodyHeight ?? BODY_MAX;
  if (!landmarks || landmarks.length < 33) {
    return { ok: false, issue: 'no_person', bodyHeight: null };
  }

  const missing = required.filter((i) => visibilityOf(landmarks[i]) < MIN_CALIBRATION_VISIBILITY);
  const bodyHeight =
    visibilityOf(landmarks[LM.NOSE]) >= MIN_CALIBRATION_VISIBILITY
      ? Math.abs((landmarks[LM.L_ANKLE].y + landmarks[LM.R_ANKLE].y) / 2 - landmarks[LM.NOSE].y)
      : null;

  if (missing.length > 0) {
    // MediaPipe still guesses coordinates for unseen joints. If the guess is outside the frame,
    // the person is too close; if it is inside the frame, the joint is hidden by poor light or clothing.
    const offSide = missing.some((i) => !inFrame(landmarks[i].x));
    const offVertical = missing.some((i) => !inFrame(landmarks[i].y));
    const lowerBodyMissing = missing.some((i) => LOWER_BODY.includes(i));
    if (offSide && !offVertical) return { ok: false, issue: 'move_center', bodyHeight };
    if (offVertical || lowerBodyMissing) return { ok: false, issue: 'step_back', bodyHeight };
    return { ok: false, issue: 'low_light', bodyHeight };
  }

  if (bodyHeight !== null && bodyHeight > bodyMax) {
    return { ok: false, issue: 'step_back', bodyHeight };
  }

  const offX = required.some((i) => !inFrame(landmarks[i].x));
  const offY = required.some((i) => !inFrame(landmarks[i].y));
  if (offY) return { ok: false, issue: 'step_back', bodyHeight };
  if (offX) return { ok: false, issue: 'move_center', bodyHeight };

  if (bodyHeight !== null && bodyHeight < bodyMin) {
    return { ok: false, issue: 'move_closer', bodyHeight };
  }

  const midHipX = (landmarks[LM.L_HIP].x + landmarks[LM.R_HIP].x) / 2;
  if (midHipX < CENTER_MIN || midHipX > CENTER_MAX) {
    return { ok: false, issue: 'move_center', bodyHeight };
  }

  return { ok: true, issue: null, bodyHeight };
}

/** True when the required landmarks are visible (used mid-set to pause/resume). */
export function requiredVisible(landmarks: Landmark[] | null | undefined, required: number[]): boolean {
  if (!landmarks || landmarks.length < 33) return false;
  return required.every((i) => visibilityOf(landmarks[i]) >= MIN_CALIBRATION_VISIBILITY);
}

/** Requires the calibration check to pass continuously for `holdMs` before reporting ready. */
export class CalibrationGate {
  private okSince: number | null = null;

  constructor(private readonly holdMs = 1000) {}

  update(check: CalibrationCheck, tMs: number): boolean {
    if (!check.ok) {
      this.okSince = null;
      return false;
    }
    if (this.okSince === null) this.okSince = tMs;
    return tMs - this.okSince >= this.holdMs;
  }

  reset(): void {
    this.okSince = null;
  }
}
