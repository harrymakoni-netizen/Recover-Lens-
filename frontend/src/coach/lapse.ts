// Lapse engine (SPEC §17.5). Notices missed days, keeps progress (nothing resets to zero) and turns
// the barrier the person names into a smaller, doable session. Pure TypeScript.
import type { Barrier, CheckIn, Energy, Technique } from './types';

export const LAPSE_DAYS = 2; // TUNE: whole days without a session, while a programme is active, before the comeback card shows
const DAY = 86_400_000;
const WINDOW_DAYS = 28;

export type LapseState = 'new' | 'active' | 'lapsed';

export interface Consistency {
  /** Days with at least one session in the last 28 days. */
  activeDays28: number;
  /** Active days per week, oldest first, for the last 4 weeks. */
  weeks: number[];
  /** Every day with a session, ever: it only grows. */
  totalActiveDays: number;
}

export interface LapseStatus {
  state: LapseState;
  /** Whole days since the last session (0 = today). Null before the first session. */
  daysSince: number | null;
  consistency: Consistency;
}

const dayStart = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function lapseStatus(sessionTimes: readonly string[], hasProgramme: boolean, now = Date.now()): LapseStatus {
  const days = [...new Set(sessionTimes.map((s) => dayStart(Date.parse(s))).filter((d) => Number.isFinite(d) && d <= now))].sort((a, b) => a - b);
  const today = dayStart(now);
  const weeks = [0, 0, 0, 0];
  let activeDays28 = 0;
  for (const d of days) {
    const ago = Math.round((today - d) / DAY);
    if (ago < WINDOW_DAYS) {
      activeDays28++;
      weeks[3 - Math.floor(ago / 7)]++;
    }
  }
  const consistency = { activeDays28, weeks, totalActiveDays: days.length };
  if (days.length === 0) return { state: 'new', daysSince: null, consistency };
  const daysSince = Math.round((today - days[days.length - 1]) / DAY);
  return { state: hasProgramme && daysSince >= LAPSE_DAYS ? 'lapsed' : 'active', daysSince, consistency };
}

export interface Adaptation {
  minutes: number;
  energy: Energy | null;
  /** Offer to set a reminder time (and a WhatsApp reminder) after this barrier. */
  reminder: boolean;
  /** The technique the comeback leans on, shown in the "why" panel. */
  technique: Technique;
}

// TUNE: the comeback session for each barrier. Always small: the goal is to restart, not catch up.
export const ADAPTATIONS: Record<Barrier, Adaptation> = {
  pain: { minutes: 10, energy: 'low', reminder: false, technique: 'graded_tasks' },
  time: { minutes: 5, energy: null, reminder: true, technique: 'action_planning' },
  motivation: { minutes: 10, energy: 'low', reminder: true, technique: 'goal_setting' },
  forgot: { minutes: 10, energy: null, reminder: true, technique: 'action_planning' },
  space: { minutes: 10, energy: null, reminder: false, technique: 'graded_tasks' },
  other: { minutes: 10, energy: null, reminder: true, technique: 'graded_tasks' },
};

/** The check-in the comeback runs: the barrier's dose plus anything the person tapped. */
export function comebackCheckIn(barrier: Barrier, pain: number, text = ''): CheckIn {
  const a = ADAPTATIONS[barrier];
  return { text, pain, redFlags: [], minutes: a.minutes, energy: a.energy, barriers: [barrier] };
}
