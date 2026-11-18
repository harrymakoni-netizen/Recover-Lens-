// Daily habit planner (SPEC §17.10): small, user-chosen habits that support recovery (sleep, water,
// fruit and vegetables, a walk). Pure TypeScript: no React, no DOM, no storage.
//
// No punishment: a missed day never wipes progress. "Kept days" only ever grows, and a run pauses on
// one rest day instead of breaking. Short sleep and little water feed the early warning (drift.ts).
import type { DriftReason } from './drift';

export type HabitId = 'sleep' | 'water' | 'veg' | 'walk';
export const HABIT_IDS: readonly HabitId[] = ['sleep', 'water', 'veg', 'walk'];

export interface HabitDef {
  id: HabitId;
  /** Unit key for i18n: habit.unit.<unit>. */
  unit: 'hours' | 'glasses' | 'portions' | 'minutes';
  defaultTarget: number;
  min: number;
  max: number;
  step: number;
  /** Target choices offered in settings. */
  targets: number[];
}

// TUNE: defaults are general guidance, not a prescription; the person chooses their own target.
export const HABITS: Record<HabitId, HabitDef> = {
  sleep: { id: 'sleep', unit: 'hours', defaultTarget: 7, min: 0, max: 14, step: 0.5, targets: [6, 7, 8, 9] },
  water: { id: 'water', unit: 'glasses', defaultTarget: 6, min: 0, max: 16, step: 1, targets: [4, 6, 8] },
  veg: { id: 'veg', unit: 'portions', defaultTarget: 3, min: 0, max: 10, step: 1, targets: [2, 3, 5] },
  walk: { id: 'walk', unit: 'minutes', defaultTarget: 15, min: 0, max: 120, step: 5, targets: [10, 15, 30] },
};

export interface HabitPrefs {
  /** Habits the person chose to follow. Empty until they choose. */
  enabled: HabitId[];
  targets: Record<HabitId, number>;
  /** Per habit: may the daily summary be shared with the physiotherapist? Off by default. */
  share: Record<HabitId, boolean>;
}

export const DEFAULT_PREFS: HabitPrefs = {
  enabled: [],
  targets: { sleep: 7, water: 6, veg: 3, walk: 15 },
  share: { sleep: false, water: false, veg: false, walk: false },
};

/** One local day's values. `day` is YYYY-MM-DD in the person's own time zone. */
export interface HabitDay {
  day: string;
  values: Partial<Record<HabitId, number>>;
}

export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export const clampValue = (id: HabitId, v: number) => {
  const h = HABITS[id];
  return Math.min(h.max, Math.max(h.min, Math.round(v / h.step) * h.step));
};

export function met(prefs: HabitPrefs, id: HabitId, value: number | undefined): boolean {
  return value !== undefined && value >= prefs.targets[id];
}

export interface HabitSummary {
  id: HabitId;
  today: number | undefined;
  target: number;
  /** Last 7 days, oldest first: true met, false logged but short, null not logged. */
  week: Array<boolean | null>;
  thisWeek: number;
  /** Days the target was met, ever. Never goes down. */
  keptDays: number;
  /** Current run of met days; one missed day in a row only pauses it. */
  run: number;
  /** True when today's run is paused on a rest day (yesterday missed, run still alive). */
  paused: boolean;
  bestRun: number;
}

// TUNE: how many missed days in a row a run survives.
export const RUN_REST_DAYS = 1;

export function summarise(logs: readonly HabitDay[], prefs: HabitPrefs, today: string): HabitSummary[] {
  const byDay = new Map(logs.map((l) => [l.day, l.values]));
  return prefs.enabled.map((id) => {
    const week = Array.from({ length: 7 }, (_, i) => {
      const v = byDay.get(addDays(today, i - 6))?.[id];
      return v === undefined ? null : met(prefs, id, v);
    });
    const metDays = [...byDay.entries()].filter(([d, v]) => d <= today && met(prefs, id, v[id])).map(([d]) => d).sort();
    // Runs: walk the days in order; a gap of up to RUN_REST_DAYS missed days pauses, more ends the run.
    let run = 0;
    let best = 0;
    let prev: string | null = null;
    for (const d of metDays) {
      if (prev === null) run = 1;
      else {
        let missed = 0;
        let cursor = addDays(prev, 1);
        while (cursor < d) {
          missed++;
          cursor = addDays(cursor, 1);
        }
        run = missed <= RUN_REST_DAYS ? run + 1 : 1;
      }
      best = Math.max(best, run);
      prev = d;
    }
    // Today counts as a rest day until the evening, so the run is "alive" if the gap since the
    // last met day (excluding today) is within the rest allowance.
    let missedSince = 0;
    if (prev !== null) {
      let cursor = addDays(prev, 1);
      while (cursor < today) {
        missedSince++;
        cursor = addDays(cursor, 1);
      }
    }
    const alive = prev !== null && (prev === today || missedSince <= RUN_REST_DAYS);
    return {
      id,
      today: byDay.get(today)?.[id],
      target: prefs.targets[id],
      week,
      thisWeek: week.filter((x) => x === true).length,
      keptDays: metDays.length,
      run: alive ? run : 0,
      paused: alive && prev !== today && missedSince > 0,
      bestRun: best,
    };
  });
}

// TUNE: when sleep and water count as a sign for a lighter day.
export const HABIT_SIGNALS = { sleepShortBy: 1, sleepNights: 3, waterShare: 0.5, waterDays: 2 } as const;

/** Short sleep and little water, judged against the person's own targets, for the early warning. */
export function habitSignals(logs: readonly HabitDay[], prefs: HabitPrefs, today: string): DriftReason[] {
  const out: DriftReason[] = [];
  const lastLogged = (id: HabitId, days: number) => {
    const vals: number[] = [];
    for (let i = 0; i < days + 1; i++) {
      const v = logs.find((l) => l.day === addDays(today, -i))?.values[id];
      if (v !== undefined) vals.push(v);
    }
    return vals.slice(0, days);
  };
  if (prefs.enabled.includes('sleep')) {
    const nights = lastLogged('sleep', HABIT_SIGNALS.sleepNights);
    const avg = nights.length ? nights.reduce((a, b) => a + b, 0) / nights.length : null;
    if (nights.length >= 2 && avg !== null && avg <= prefs.targets.sleep - HABIT_SIGNALS.sleepShortBy) {
      out.push({ signal: 'short_sleep', recent: Math.round(avg * 10) / 10, usual: prefs.targets.sleep, n: nights.length });
    }
  }
  if (prefs.enabled.includes('water')) {
    const days = lastLogged('water', HABIT_SIGNALS.waterDays);
    const avg = days.length ? days.reduce((a, b) => a + b, 0) / days.length : null;
    if (days.length >= HABIT_SIGNALS.waterDays && avg !== null && avg < prefs.targets.water * HABIT_SIGNALS.waterShare) {
      out.push({ signal: 'low_water', recent: Math.round(avg * 10) / 10, usual: prefs.targets.water, n: days.length });
    }
  }
  return out;
}

/** What may leave the phone: only the habits the person chose to share, last 28 days. */
export function sharedDays(logs: readonly HabitDay[], prefs: HabitPrefs, today: string): HabitDay[] {
  const ids = prefs.enabled.filter((id) => prefs.share[id]);
  const from = addDays(today, -27);
  return logs
    .filter((l) => l.day >= from && l.day <= today)
    .map((l) => ({ day: l.day, values: Object.fromEntries(ids.filter((id) => l.values[id] !== undefined).map((id) => [id, l.values[id]])) }))
    .filter((l) => Object.keys(l.values).length > 0);
}

export function parsePrefs(raw: unknown): HabitPrefs {
  const r = (raw ?? {}) as Partial<HabitPrefs>;
  const enabled = Array.isArray(r.enabled) ? r.enabled.filter((x): x is HabitId => HABIT_IDS.includes(x as HabitId)) : [];
  const targets = { ...DEFAULT_PREFS.targets };
  const share = { ...DEFAULT_PREFS.share };
  for (const id of HABIT_IDS) {
    const t = r.targets?.[id];
    if (typeof t === 'number' && Number.isFinite(t)) targets[id] = clampValue(id, t);
    share[id] = r.share?.[id] === true;
  }
  return { enabled, targets, share };
}

export function setValue(logs: readonly HabitDay[], day: string, id: HabitId, value: number | undefined): HabitDay[] {
  const rest = logs.filter((l) => l.day !== day);
  const cur = logs.find((l) => l.day === day)?.values ?? {};
  const values = { ...cur };
  if (value === undefined) delete values[id];
  else values[id] = clampValue(id, value);
  const next = Object.keys(values).length ? [...rest, { day, values }] : rest;
  // Keep 90 days on the device.
  const from = addDays(day, -89);
  return next.filter((l) => l.day >= from).sort((a, b) => a.day.localeCompare(b.day));
}
