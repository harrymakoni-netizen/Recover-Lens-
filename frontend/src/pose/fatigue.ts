// Fatigue signs measured from a person's own reps: no muscle model and no guessing. Slower reps,
// less range and a lower form score late in a session are the ordinary signs of tiring. Wording
// stays observational (CLAUDE.md rule 9).
import type { RepResult } from './repCounter';

export type FatigueLevel = 'none' | 'slight' | 'clear';
export type FatigueSign = 'slower' | 'shorter' | 'form';

export interface FatigueSigns {
  level: FatigueLevel;
  /** How much slower the last third of reps was than the first third, % (0 if not slower). */
  slowerPct: number;
  /** How much less of the target range the last third reached, % (0 if not less). */
  shorterPct: number;
  /** How many points the form score fell (0 if it did not fall). */
  formPoints: number;
  /** The signs that passed their threshold, in this order: slower, shorter, form. */
  signs: FatigueSign[];
}

type Rep = Pick<RepResult, 'durationS' | 'maxProgress' | 'quality'>;

export const MIN_REPS_FOR_FATIGUE = 6;
/** A sign counts when it reaches these values (shared with the screens that describe it). */
export const FATIGUE_THRESHOLDS = {
  slowerPct: 15, // TUNE: last third of reps this much slower than the first third
  shorterPct: 8, // TUNE: last third reaches this much less of the target range
  formPoints: 8, // TUNE: last third scores this many points lower
} as const;

/** Live check within one set: compare the set's first 3 reps with its latest 3. */
export const LIVE_WINDOW = 3;
const LIVE_SLOWER_FRACTION = 0.25; // TUNE: a clear slow-down mid-set before the coach mentions it
const LIVE_SHORTER_FRACTION = 0.1; // TUNE:

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const reach = (r: Rep) => Math.min(r.maxProgress, 1);

/** Compares the first and last third of the session's reps. Null with fewer than 6 reps. */
export function analyseFatigue(reps: readonly Rep[]): FatigueSigns | null {
  if (reps.length < MIN_REPS_FOR_FATIGUE) return null;
  const n = Math.floor(reps.length / 3);
  const first = reps.slice(0, n);
  const last = reps.slice(reps.length - n);

  const d1 = mean(first.map((r) => r.durationS));
  const p1 = mean(first.map(reach));
  const slower = d1 > 0 ? (mean(last.map((r) => r.durationS)) - d1) / d1 : 0;
  const shorter = p1 > 0 ? (p1 - mean(last.map(reach))) / p1 : 0;
  const form = mean(first.map((r) => r.quality)) - mean(last.map((r) => r.quality));

  const signs: FatigueSign[] = [];
  if (slower * 100 >= FATIGUE_THRESHOLDS.slowerPct) signs.push('slower');
  if (shorter * 100 >= FATIGUE_THRESHOLDS.shorterPct) signs.push('shorter');
  if (form >= FATIGUE_THRESHOLDS.formPoints) signs.push('form');

  return {
    level: signs.length === 0 ? 'none' : signs.length === 1 ? 'slight' : 'clear',
    slowerPct: Math.max(0, Math.round(slower * 100)),
    shorterPct: Math.max(0, Math.round(shorter * 100)),
    formPoints: Math.max(0, Math.round(form)),
    signs,
  };
}

/** True when the reps of the current set have clearly slowed or shortened since its start. */
export function tiringInSet(setReps: readonly Rep[]): boolean {
  if (setReps.length < LIVE_WINDOW * 2) return false;
  const first = setReps.slice(0, LIVE_WINDOW);
  const last = setReps.slice(-LIVE_WINDOW);
  const d1 = mean(first.map((r) => r.durationS));
  const p1 = mean(first.map(reach));
  const slower = d1 > 0 && mean(last.map((r) => r.durationS)) >= d1 * (1 + LIVE_SLOWER_FRACTION);
  const shorter = p1 > 0 && mean(last.map(reach)) <= p1 * (1 - LIVE_SHORTER_FRACTION);
  return slower || shorter;
}
