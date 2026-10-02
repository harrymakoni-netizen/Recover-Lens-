import { kneeGuided, miniSquat, singleLegBalance, sitToStand } from './knee';
import { jumpLanding, singleLegSquat, squatScreen } from './screening';
import { shoulderAbduction, shoulderFlexion, shoulderGuided } from './shoulder';
import { type AnyExercise, type ExerciseConfig, isLive } from './types';

export * from './types';

/** Every exercise, measured and guided. */
export const EXERCISES: AnyExercise[] = [
  shoulderAbduction,
  shoulderFlexion,
  ...shoulderGuided,
  miniSquat,
  sitToStand,
  singleLegBalance,
  ...kneeGuided,
  squatScreen,
  singleLegSquat,
  jumpLanding,
];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string | undefined): AnyExercise | undefined {
  return id ? byId.get(id) : undefined;
}

export function getLiveExercise(id: string): ExerciseConfig {
  const ex = byId.get(id);
  if (!ex || !isLive(ex)) throw new Error(`Unknown live exercise: ${id}`);
  return ex;
}

/** Exercises a clinician can assign / a patient sees in the library. */
export const LIBRARY: AnyExercise[] = EXERCISES.filter((e) => !(isLive(e) && e.screeningOnly));

export function exerciseName(id: string): string {
  return byId.get(id)?.name ?? id.replace(/_/g, ' ');
}

export function defaultTargetAngle(id: string): number | null {
  const ex = byId.get(id);
  return ex && isLive(ex) && ex.kind === 'reps' && ex.primaryAngle && 'joint' in ex.primaryAngle ? ex.targetAngle : null;
}
