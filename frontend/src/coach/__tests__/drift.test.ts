import { describe, expect, it } from 'vitest';
import { driftStatus, lighterPlan, type DriftSession } from '../drift';
import { libraryFor } from '../library';

const NOW = Date.parse('2026-11-18T12:00:00Z');
const DAY = 86_400_000;
const at = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const s = (daysAgo: number, over: Partial<DriftSession> = {}): DriftSession => ({
  exercise_id: 'mini_squat', started_at: at(daysAgo), reps: 30, movement_score: 82, pain_after: 2, fatigue_level: 'none', ...over,
});
// Every 2 days for 16 days: a steady, healthy pattern.
const steady = () => [16, 14, 12, 10, 8, 6, 4, 2].map((d) => s(d));

describe('early warning', () => {
  it('stays quiet on a steady pattern and with too little history', () => {
    expect(driftStatus(steady(), { now: NOW })).toMatchObject({ level: 'steady', reasons: [], enoughHistory: true });
    const few = driftStatus([s(4, { fatigue_level: 'clear' }), s(2, { fatigue_level: 'clear' })], { now: NOW });
    expect(few).toMatchObject({ level: 'steady', enoughHistory: false });
  });

  it('notices tiring sooner and form slipping, and explains with lately-versus-usually numbers', () => {
    const list = steady();
    list[5] = s(6, { fatigue_level: 'slight', movement_score: 77 });
    list[6] = s(4, { fatigue_level: 'slight', movement_score: 75 });
    list[7] = s(2, { fatigue_level: 'clear', movement_score: 72 });
    const st = driftStatus(list, { now: NOW });
    expect(st.level).toBe('act');
    expect(st.reasons.map((r) => r.signal).sort()).toEqual(['form_dropping', 'tiring_sooner']);
    expect(st.reasons.find((r) => r.signal === 'form_dropping')).toMatchObject({ recent: 75, usual: 82, exerciseId: 'mini_squat' });
    expect(st.reasons.find((r) => r.signal === 'tiring_sooner')).toMatchObject({ recent: 3, usual: 0 });
  });

  it('notices pain creeping up, sessions cut short and longer gaps', () => {
    const pain = steady().map((x, i) => (i >= 5 ? { ...x, pain_after: 5 } : x));
    expect(driftStatus(pain, { now: NOW }).reasons.map((r) => r.signal)).toEqual(['pain_rising']);
    const shorter = steady().map((x, i) => (i >= 5 ? { ...x, reps: 20 } : x));
    expect(driftStatus(shorter, { now: NOW }).reasons).toEqual([expect.objectContaining({ signal: 'sessions_shorter', recent: 20, usual: 30 })]);
    // Every day, then gaps of 3 days: drifting away before any 2-day lapse rule fires today.
    const gaps = [12, 11, 10, 9, 8, 7, 4, 1].map((d) => s(d));
    expect(driftStatus(gaps, { now: NOW }).reasons).toEqual([expect.objectContaining({ signal: 'gaps_growing', usual: 1 })]);
  });

  it('counts low energy only from the last week of check-ins', () => {
    const ci = (d: number, energy: 'low' | 'ok') => ({ at: at(d), energy });
    expect(driftStatus(steady(), { now: NOW, checkIns: [ci(3, 'low'), ci(2, 'ok'), ci(1, 'low')] }).reasons[0].signal).toBe('low_energy');
    expect(driftStatus(steady(), { now: NOW, checkIns: [ci(12, 'low'), ci(10, 'low'), ci(1, 'ok')] }).level).toBe('steady');
  });

  it('adds signals from other modules (habits) and one signal is only a heads-up', () => {
    const st = driftStatus(steady(), { now: NOW, extra: [{ signal: 'short_sleep', recent: 5.2, usual: 7, n: 3 }] });
    expect(st).toMatchObject({ level: 'watch', reasons: [{ signal: 'short_sleep' }] });
  });

  it('suggests a lighter plan through the validator: fewer reps, a set less when acting, never more', () => {
    const library = libraryFor([{ exercise_id: 'mini_squat', sets: 3, reps: 10 }, { exercise_id: 'sit_to_stand', sets: 2, reps: 8 }]);
    const watch = lighterPlan(library, { level: 'watch', reasons: [{ signal: 'tiring_sooner', recent: 2, usual: 0, n: 6 }], enoughHistory: true });
    expect(watch.plan.items).toEqual([expect.objectContaining({ exerciseId: 'mini_squat', sets: 3, reps: 9 }), expect.objectContaining({ exerciseId: 'sit_to_stand', sets: 2, reps: 7 })]);
    const act = lighterPlan(library, { level: 'act', reasons: [{ signal: 'pain_rising', recent: 5, usual: 2, n: 6 }, { signal: 'tiring_sooner', recent: 3, usual: 0, n: 6 }], enoughHistory: true });
    for (const item of act.plan.items) {
      const e = library.find((x) => x.id === item.exerciseId)!;
      expect(item.sets).toBe(e.sets - 1);
      expect(item.reps).toBeLessThan(e.reps);
    }
    expect(act.plan.whyKey).toBe('drift.why_act');
    expect(act.plan.technique).toBe('graded_tasks');
  });
});
