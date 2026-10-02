// Exercise configuration (SPEC §4). The pose engine reads these; components never hard-code
// exercise logic.
import type { AngleSpec } from '../pose/geometry';
import type { FaultRuleId } from '../pose/formRules';

export type ExerciseKind = 'reps' | 'hold';
export type Region = 'shoulder' | 'knee' | 'full_body';

/**
 * What drives the rep counter. Usually a joint angle; jump landings use how far the hips rise
 * (percent of body height) instead.
 */
export type PrimarySpec = AngleSpec | { metric: 'hipRise' };

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
