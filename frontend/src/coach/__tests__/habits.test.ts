import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, habitSignals, parsePrefs, setValue, sharedDays, summarise, type HabitDay, type HabitPrefs } from '../habits';

const prefs = (over: Partial<HabitPrefs> = {}): HabitPrefs => ({ ...DEFAULT_PREFS, enabled: ['sleep', 'water'], ...over });
const days = (vals: Array<[string, number | undefined, number | undefined]>): HabitDay[] =>
  vals.map(([day, sleep, water]) => ({ day, values: { ...(sleep !== undefined ? { sleep } : {}), ...(water !== undefined ? { water } : {}) } }));

describe('habit planner', () => {
  it('summarises the week and keeps every met day, so progress never goes down', () => {
    const logs = days([['2026-11-12', 7, 6], ['2026-11-13', 8, 3], ['2026-11-14', 7.5, 7], ['2026-11-16', 7, 6], ['2026-11-18', 7, undefined]]);
    const [sleep, water] = summarise(logs, prefs(), '2026-11-18');
    expect(sleep.week).toEqual([true, true, true, null, true, null, true]);
    expect(sleep).toMatchObject({ thisWeek: 5, keptDays: 5, today: 7 });
    expect(water).toMatchObject({ thisWeek: 3, keptDays: 3, today: undefined });
    expect(water.week).toEqual([true, false, true, null, true, null, null]);
  });

  it('pauses a run on one missed day and only ends it after two in a row, keeping the best run', () => {
    // 12, 13, 14 met; 15 missed (pause); 16 met → run 4. 17 missed, today 18 not yet logged → paused, still 4.
    const logs = days([['2026-11-12', 7, undefined], ['2026-11-13', 7, undefined], ['2026-11-14', 7, undefined], ['2026-11-16', 7, undefined]]);
    const [s] = summarise(logs, prefs({ enabled: ['sleep'] }), '2026-11-18');
    expect(s).toMatchObject({ run: 4, paused: true, bestRun: 4, keptDays: 4 });
    // Two more missed days: the run ends, but kept days and the best run stay.
    const [later] = summarise(logs, prefs({ enabled: ['sleep'] }), '2026-11-20');
    expect(later).toMatchObject({ run: 0, bestRun: 4, keptDays: 4 });
  });

  it('turns short sleep and little water into early-warning signals against the person\'s own targets', () => {
    const logs = days([['2026-11-16', 5.5, 2], ['2026-11-17', 5, 3], ['2026-11-18', 6, undefined]]);
    const sig = habitSignals(logs, prefs(), '2026-11-18');
    expect(sig).toEqual([
      expect.objectContaining({ signal: 'short_sleep', recent: 5.5, usual: 7, n: 3 }),
      expect.objectContaining({ signal: 'low_water', recent: 2.5, usual: 6, n: 2 }),
    ]);
    // A lower personal sleep target means 6 hours is fine.
    expect(habitSignals(logs, prefs({ targets: { ...DEFAULT_PREFS.targets, sleep: 6 }, enabled: ['sleep'] }), '2026-11-18')).toEqual([]);
    // Habits the person did not choose are never judged.
    expect(habitSignals(logs, prefs({ enabled: [] }), '2026-11-18')).toEqual([]);
  });

  it('shares only the habits the person chose to share, and nothing by default', () => {
    const logs = days([['2026-11-17', 7, 6], ['2026-11-18', 6, 2]]);
    expect(sharedDays(logs, prefs(), '2026-11-18')).toEqual([]);
    expect(sharedDays(logs, prefs({ share: { ...DEFAULT_PREFS.share, sleep: true } }), '2026-11-18')).toEqual([
      { day: '2026-11-17', values: { sleep: 7 } },
      { day: '2026-11-18', values: { sleep: 6 } },
    ]);
  });

  it('stores values in steps within limits and parses saved settings safely', () => {
    let logs = setValue([], '2026-11-18', 'sleep', 7.3);
    logs = setValue(logs, '2026-11-18', 'water', 40);
    expect(logs).toEqual([{ day: '2026-11-18', values: { sleep: 7.5, water: 16 } }]);
    expect(setValue(logs, '2026-11-18', 'water', undefined)).toEqual([{ day: '2026-11-18', values: { sleep: 7.5 } }]);
    expect(parsePrefs({ enabled: ['sleep', 'beer'], targets: { sleep: 99 }, share: { sleep: 'yes' } })).toMatchObject({ enabled: ['sleep'], targets: { sleep: 14 }, share: { sleep: false } });
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
  });
});
