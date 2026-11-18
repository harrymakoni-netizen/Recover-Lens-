// Exercise configuration (SPEC §4). The pose engine reads these; components never hard-code
// exercise logic.
import type { AngleSpec } from '../pose/geometry';
import type { EffortJoint } from '../pose/effort';
import type { FaultRuleId } from '../pose/formRules';

export type ExerciseKind = 'reps' | 'hold';
export type Region = 'shoulder' | 'elbow' | 'knee' | 'full_body';

/**
 * What drives the rep counter. Usually a joint angle; jump landings use how far the hips rise and
 * heel raises how far the heels and ankles rise (both in percent of body height) instead.
 */
export type PrimarySpec = AngleSpec | { metric: 'hipRise' | 'heelRise' | 'reach' | 'freeLegLower' | 'shinTilt' };

/** Phrase keys (see voice/phrases.ts) spoken for each event (SPEC §6.2). */
export interface CueSet {
  intro: string;
  onRaising: string;
  onTop: string;
  onLowering: string;
  /** Template with {n} and {total}. */
  onRep: string;
  faults: Partial<Record<FaultRuleId, string>>;
  onSetComplete: string;
  onSessionComplete: string;
  /** Spoken when a descent was faster than `minDescentSeconds`. */
  onTooFast?: string;
}

export interface ExerciseConfig {
  tracking: 'live';
  id: string;
  name: string;
  region: Region;
  kind: ExerciseKind;
  cameraView: 'front' | 'side';
  description: string;
  /** Short setup steps shown before starting. */
  steps: string[];
  /** Must be visible to start. For side 'auto' the best-visible side's joints are added. */
  requiredLandmarks: number[];
  primaryAngle?: PrimarySpec;
  /**
   * "both" = track both sides and use the lower progress for reps.
   * "auto" = side view; use whichever side faces the camera.
   * For hold exercises "left"/"right" is the standing leg ("auto" = either).
   */
  side: 'left' | 'right' | 'both' | 'auto';
  startAngle: number;
  targetAngle: number;
  /**
   * Measure the rep from the person's own resting angle, captured at the end of the countdown:
   * start = measured angle, target = start + (targetAngle - startAngle). Needed where the measured
   * angle has a per-person offset (e.g. 3D knee angles read ~160° on a straight leg).
   */
  relativeRange?: boolean;
  /** Pause at top (reps) or total hold (hold). */
  holdSeconds?: number;
  defaultSets: number;
  defaultReps: number;
  minRepSeconds: number;
  faultRules: FaultRuleId[];
  cues: CueSet;
  /** Calibration distance overrides (e.g. a seated start looks shorter). */
  calibration?: { minBodyHeight?: number; maxBodyHeight?: number };
  /** Label for the primary angle in the HUD. */
  angleLabel: string;
  /** Hidden from the patient library (used by sports screening only). */
  screeningOnly?: boolean;
  /** Estimate the load on this joint (pose/effort.ts) and offer a weight choice before starting. */
  effort?: EffortJoint;
  /**
   * The body line the `body_line` rule checks: shoulder–hip–ankle ('ankle', wall and floor
   * push-ups) or shoulder–hip–knee ('knee', knee push-ups).
   */
  bodyLine?: 'ankle' | 'knee';
  /**
   * False when the torso is meant to lean or lie flat (push-ups): the score then leaves out torso
   * alignment, which would otherwise read as a fault on every frame. Default true.
   */
  uprightTorso?: boolean;
  /**
   * Timed test: count as many reps as possible in this many seconds (30-second chair stand). The
   * set ends when the time is up; a rep more than halfway up at that moment counts (CDC STEADI).
   */
  timeLimitSeconds?: number;
  /**
   * Seated reach-to-target (SPEC §17.12). The target sits at a point in torso lengths from the
   * tracked shoulder: `targetPct` forward and `targetDropPct` below shoulder height. It is set from
   * the person's own practice reach, or by the clinician (the programme's target value, in % of
   * torso length). The wrist counts as "in the target" inside a circle of `radiusPct`.
   */
  reach?: {
    targetPct: number;
    targetDropPct: number;
    radiusPct: number;
    /** Practice reach is trusted only between these limits (% of torso length forward). */
    minPct: number;
    maxPct: number;
    /** Practice time before the countdown: "reach as far as is comfortable". */
    practiceSeconds: number;
  };
  /**
   * Which joints of the tracked side must be visible (side view, `side: 'auto'`). Default: shoulder,
   * hip, knee and ankle. A seated reach needs the arm instead of the feet.
   */
  requiredJoints?: Array<'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle' | 'heel' | 'foot'>;
  /**
   * Arms are meant to stay crossed on the chest (30-second chair stand): a wrist that leaves the
   * chest during a stand is recorded as arm use. It is a cue for review, never a block (rule 2).
   */
  armsOnChest?: boolean;
  /**
   * Hold exercises timed while a joint stays inside a band (wall sit: the knee angle). The timer
   * pauses, never resets, when the knee leaves `centerDeg ± halfWidthDeg`; `standingDeg` or more
   * counts as standing up between sets. The clinician's target (`programTarget`) moves the centre.
   */
  holdGate?: { joint: 'knee'; centerDeg: number; halfWidthDeg: number; standingDeg: number };
  /** The descent should take at least this long (step-down); a faster one gets a "slower" cue. */
  minDescentSeconds?: number;
  /** Heel lift is judged on the tracked side only (the back foot of a lunge stance may lift). */
  heelCheck?: 'tracked';
  /**
   * The programme's target value replaces the default (clinician-set): the rep target, or the
   * centre of the hold band. `default` is what a new programme starts with.
   */
  programTarget?: { default: number; min: number; max: number };
  /** Ask which leg is the working (stance) leg on the intro screen. */
  chooseSide?: boolean;
}

/**
 * Exercises that a single 2D camera cannot measure reliably (rotations, pendulum, lying exercises).
 * Shown as guided timer mode: on-screen steps + voice + timer, no scoring (SPEC §4.1).
 */
export interface GuidedExerciseConfig {
  tracking: 'guided';
  id: string;
  name: string;
  region: Region;
  description: string;
  steps: string[];
  defaultSets: number;
  defaultReps: number;
  /** Tempo for the voice count. */
  secondsPerRep: number;
  /** Phrase key for the intro. */
  intro: string;
}

export type AnyExercise = ExerciseConfig | GuidedExerciseConfig;

export function isLive(ex: AnyExercise): ex is ExerciseConfig {
  return ex.tracking === 'live';
}
