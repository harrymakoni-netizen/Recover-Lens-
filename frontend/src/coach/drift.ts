// Early warning (SPEC §17.9): spot signs of strain or drop-off before a lapse happens, and suggest a
// lighter day with every reason shown. Pure TypeScript: no React, no DOM. Observations, never a
// diagnosis (CLAUDE.md rule 9). It never blocks anything: the person can always keep their usual plan.
import type { LibraryEntry } from './library';
import type { Energy, Plan, Technique } from './types';
import { EMPTY_EXTRACTION } from './types';
import { validatePlan, type Validated } from './validator';

/** The fields of a session record the engine reads (a subset of api/types SessionRecord). */
export interface DriftSession {
  exercise_id: string;
  started_at: string;
  reps: number;
  movement_score: number | null;
  pain_after: number | null;
  fatigue_level?: 'none' | 'slight' | 'clear' | null;
}

export interface DriftCheckIn {
  /** ISO date or timestamp of the check-in. */
  at: string;
  energy: Energy | null;
}

export type DriftSignal =
  | 'tiring_sooner'
  | 'form_dropping'
  | 'pain_rising'
  | 'gaps_growing'
  | 'sessions_shorter'
  | 'low_energy'
  | 'short_sleep'
  | 'low_water';

/** One reason, with the numbers the explanation shows ("lately" against "usually"). */
export interface DriftReason {
  signal: DriftSignal;
  recent: number;
  usual: number;
  /** How many sessions, check-ins or nights the "usually" figure comes from. */
  n: number;
  exerciseId?: string;
}

export type DriftLevel = 'steady' | 'watch' | 'act';

export interface DriftStatus {
  level: DriftLevel;
  reasons: DriftReason[];
  /** Too little history to compare with: no warning, by design. */
  enoughHistory: boolean;
}

// TUNE: every threshold below needs real-world tuning with a physiotherapist.
export const DRIFT = {
  recent: 3, // sessions that count as "lately"
  baseline: 6, // sessions before those that count as "usually"
  minSessions: 5, // fewer than this: no comparison at all
  formDrop: 5, // movement-score points
  painRise: 1.5, // points on the 0–10 scale
  gapFactor: 1.6, // lately's gaps at least this many times the usual gap…
  gapMinDays: 1, // …and at least this many days longer
  repsDrop: 0.2, // share of the usual reps
  lowEnergyOf3: 2, // low-energy check-ins out of the last 3 (within a week)
  actFrom: 2, // signals that turn a heads-up into a lighter plan
  watchRepsFactor: 0.85,
  actRepsFactor: 0.8,
} as const;

const DAY = 86_400_000;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round1 = (x: number) => Math.round(x * 10) / 10;
const tired = (s: DriftSession) => s.fatigue_level === 'slight' || s.fatigue_level === 'clear';

/** Lately against usually, per exercise; returns the exercise with the largest relative change. */
function perExercise(
  sessions: DriftSession[],
  value: (s: DriftSession) => number | null,
  isWorse: (recent: number, usual: number) => boolean,
  size: (recent: number, usual: number) => number,
) {
  const by = new Map<string, DriftSession[]>();
  for (const s of sessions) by.set(s.exercise_id, [...(by.get(s.exercise_id) ?? []), s]);
  let best: { exerciseId: string; recent: number; usual: number; n: number; size: number } | null = null;
  for (const [exerciseId, list] of by) {
    const vals = list.map(value).filter((v): v is number => v !== null);
    if (vals.length < DRIFT.recent + 2) continue;
    const recent = mean(vals.slice(-DRIFT.recent));
    const base = vals.slice(-(DRIFT.recent + DRIFT.baseline), -DRIFT.recent);
    const usual = mean(base);
    if (!isWorse(recent, usual)) continue;
    const sz = size(recent, usual);
    if (!best || sz > best.size) best = { exerciseId, recent, usual, n: base.length, size: sz };
  }
  return best;
}

/**
 * Compare the last few sessions with the person's own usual pattern. `extra` carries signals from
 * elsewhere (sleep and water from the habit planner), already judged by their own module.
 */
export function driftStatus(
  sessionsIn: readonly DriftSession[],
  opts: { now?: number; checkIns?: readonly DriftCheckIn[]; extra?: readonly DriftReason[] } = {},
): DriftStatus {
  const now = opts.now ?? Date.now();
  const sessions = [...sessionsIn].filter((s) => Date.parse(s.started_at) <= now).sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
  const reasons: DriftReason[] = [];
  const enoughHistory = sessions.length >= DRIFT.minSessions;

  if (enoughHistory) {
    const recent = sessions.slice(-DRIFT.recent);
    const base = sessions.slice(-(DRIFT.recent + DRIFT.baseline), -DRIFT.recent);

    // Tiring sooner: fatigue signs in most recent sessions, rare before.
    const rTired = recent.filter(tired).length;
    const bTired = base.filter(tired).length;
    if (rTired >= 2 && rTired / recent.length > bTired / Math.max(1, base.length) + 0.3) {
      reasons.push({ signal: 'tiring_sooner', recent: rTired, usual: bTired, n: base.length });
    }

    // Form slipping on one exercise.
    const form = perExercise(sessions, (s) => s.movement_score, (r, u) => u - r >= DRIFT.formDrop, (r, u) => u - r);
    if (form) reasons.push({ signal: 'form_dropping', recent: Math.round(form.recent), usual: Math.round(form.usual), n: form.n, exerciseId: form.exerciseId });

    // Pain after exercise creeping up.
    const rPain = recent.map((s) => s.pain_after).filter((p): p is number => p !== null);
    const bPain = base.map((s) => s.pain_after).filter((p): p is number => p !== null);
    if (rPain.length >= 2 && bPain.length >= 2 && mean(rPain) - mean(bPain) >= DRIFT.painRise) {
      reasons.push({ signal: 'pain_rising', recent: round1(mean(rPain)), usual: round1(mean(bPain)), n: bPain.length });
    }

    // Sessions cut short on one exercise.
    const reps = perExercise(sessions, (s) => s.reps, (r, u) => u > 0 && (u - r) / u >= DRIFT.repsDrop, (r, u) => (u - r) / u);
    if (reps) reasons.push({ signal: 'sessions_shorter', recent: Math.round(reps.recent), usual: Math.round(reps.usual), n: reps.n, exerciseId: reps.exerciseId });

    // Gaps between exercise days growing (the drop-off that comes before a lapse).
    const days = [...new Set(sessions.map((s) => Math.floor(Date.parse(s.started_at) / DAY)))];
    const gaps = days.slice(1).map((d, i) => d - days[i]);
    const today = Math.floor(now / DAY);
    const sinceLast = today - days[days.length - 1];
    if (gaps.length >= 4) {
      const usualGap = median(gaps.slice(0, -2));
      const recentGap = mean([...gaps.slice(-2), sinceLast].filter((g) => g > 0));
      if (recentGap >= usualGap * DRIFT.gapFactor && recentGap - usualGap >= DRIFT.gapMinDays) {
        reasons.push({ signal: 'gaps_growing', recent: round1(recentGap), usual: round1(usualGap), n: gaps.length - 2 });
      }
    }
  }

  // Low energy in recent check-ins (within the last week).
  const week = (opts.checkIns ?? []).filter((c) => now - Date.parse(c.at) <= 7 * DAY && Date.parse(c.at) <= now);
  const last3 = [...week].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(-3);
  const low = last3.filter((c) => c.energy === 'low').length;
  if (low >= DRIFT.lowEnergyOf3) reasons.push({ signal: 'low_energy', recent: low, usual: last3.length, n: last3.length });

  for (const r of opts.extra ?? []) reasons.push(r);

  const level: DriftLevel = reasons.length >= DRIFT.actFrom ? 'act' : reasons.length === 1 ? 'watch' : 'steady';
  return { level, reasons, enoughHistory };
}

/**
 * A lighter version of the prescribed session for today, checked by the same validator as every
 * other plan. 'watch' trims reps a little; 'act' also drops a set. The validator never adds anything.
 */
export function lighterPlan(library: readonly LibraryEntry[], status: DriftStatus, minutesAvailable?: number | null): Validated {
  const act = status.level === 'act';
  const factor = act ? DRIFT.actRepsFactor : DRIFT.watchRepsFactor;
  const technique: Technique = 'graded_tasks';
  const plan: Plan = {
    items: library.map((e) => ({
      exerciseId: e.id,
      sets: act ? Math.max(1, e.sets - 1) : e.sets,
      reps: e.kind === 'hold' ? e.reps : Math.max(Math.min(3, e.reps), Math.round(e.reps * factor)),
      ...(e.holdSeconds !== undefined ? { holdSeconds: e.holdSeconds } : {}),
    })),
    technique,
    why: '',
    whyKey: act ? 'drift.why_act' : 'drift.why_watch',
    source: 'rules',
  };
  const painRecent = status.reasons.find((r) => r.signal === 'pain_rising')?.recent ?? null;
  return validatePlan(plan, {
    library,
    extraction: { ...EMPTY_EXTRACTION, painLevel: painRecent === null ? null : Math.round(painRecent) },
    redFlags: [],
    minutesAvailable,
  });
}
