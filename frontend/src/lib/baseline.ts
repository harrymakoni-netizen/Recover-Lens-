// Personal baseline: how this session compares with the same person's recent sessions of the same
// exercise. Each patient is measured against their own normal, not a population average.
import type { SessionRecord } from '../api/types';
import { getExercise, isLive } from '../exercises';

export const BASELINE_SESSIONS = 3;

export interface Baseline {
  /** How many earlier sessions it is built from (1–3). */
  count: number;
  score: number | null;
  angle: number | null;
  /** Share of reps done with good form, %. */
  correctPct: number | null;
}

export interface BaselineComparison {
  /** Movement score points above (+) or below (−) the usual. */
  scoreDelta: number | null;
  /** Degrees of range above (+) or below (−) the usual; positive is always "more range". */
  rangeDelta: number | null;
  /** Good-form reps, percentage points above (+) or below (−) the usual. */
  correctDelta: number | null;
}

type Current = { score: number | null; angle: number | null; reps: number; correct: number };

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/** For squats a smaller knee angle is a deeper (better) movement. */
export function smallerAngleIsMoreRange(exerciseId: string): boolean {
  const ex = getExercise(exerciseId);
  return !!ex && isLive(ex) && ex.targetAngle < ex.startAngle;
}

/** The mean of the latest earlier camera sessions of this exercise, or null for a first session. */
export function personalBaseline(
  history: readonly SessionRecord[],
  exerciseId: string,
  opts: { excludeId?: string; before?: string } = {},
): Baseline | null {
  const earlier = history
    .filter(
      (s) =>
        s.exercise_id === exerciseId &&
        !s.manual &&
        s.id !== opts.excludeId &&
        (!opts.before || s.started_at < opts.before),
    )
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, BASELINE_SESSIONS);
  if (!earlier.length) return null;
  return {
    count: earlier.length,
    score: mean(earlier.flatMap((s) => (s.movement_score === null ? [] : [s.movement_score]))),
    angle: mean(earlier.flatMap((s) => (s.avg_top_angle === null ? [] : [s.avg_top_angle]))),
    correctPct: mean(earlier.flatMap((s) => (s.reps > 0 ? [(s.correct_reps / s.reps) * 100] : []))),
  };
}

export function compareWithBaseline(current: Current, base: Baseline, exerciseId: string): BaselineComparison {
  const sign = smallerAngleIsMoreRange(exerciseId) ? -1 : 1;
  return {
    scoreDelta: current.score !== null && base.score !== null ? Math.round(current.score - base.score) : null,
    rangeDelta:
      current.angle !== null && base.angle !== null ? Math.round(sign * (current.angle - base.angle)) : null,
    correctDelta:
      current.reps > 0 && base.correctPct !== null
        ? Math.round((current.correct / current.reps) * 100 - base.correctPct)
        : null,
  };
}
