import { describe, expect, it } from 'vitest';
import { ARCHETYPES, ARMS, DEFAULT_ASSUMPTIONS, pessimistic, simulate } from '../cohort';

describe('simulated cohort', () => {
  const main = simulate();
  it('is repeatable: the same seed gives the same results', () => {
    expect(simulate()).toEqual(main);
    expect(simulate({ seed: 1 })).not.toEqual(main);
  });

  it('reports 300 people, 12 weeks of persistence and every metric in range', () => {
    expect(main.people).toBe(300);
    for (const arm of Object.values(main.arms)) {
      expect(arm.persistence).toHaveLength(12);
      for (const v of [...arm.persistence, arm.returnAfterLapse, arm.retention]) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(1);
      expect(arm.functionalChange).toBeLessThanOrEqual(DEFAULT_ASSUMPTIONS.romCeiling);
      expect(Object.keys(arm.byArchetype)).toEqual([...ARCHETYPES]);
      expect(arm.retention).toBe(arm.persistence[11]);
    }
  });

  it('under the stated assumptions, adaptive support keeps more people going', () => {
    const { static: s, reminders: r, recoverlens: rl } = main.arms;
    expect(rl.persistence[11]).toBeGreaterThan(r.persistence[11]);
    expect(r.persistence[11]).toBeGreaterThanOrEqual(s.persistence[11]);
    expect(rl.returnAfterLapse).toBeGreaterThan(r.returnAfterLapse);
    expect(rl.functionalChange).toBeGreaterThan(s.functionalChange);
  });

  it('the bandit learns each person’s best nudge more often than chance (1 in 4)', () => {
    expect(main.arms.recoverlens.bestNudgeShare!).toBeGreaterThan(0.27);
    expect(main.arms.static.bestNudgeShare).toBeNull();
  });

  it('the pessimistic run narrows the gap but keeps the same people and baseline arms', () => {
    const low = simulate({ assumptions: pessimistic(DEFAULT_ASSUMPTIONS) });
    expect(low.arms.static).toEqual(main.arms.static);
    expect(low.arms.reminders).toEqual(main.arms.reminders);
    expect(low.arms.recoverlens.persistence[11]).toBeLessThan(main.arms.recoverlens.persistence[11]);
  });
});

describe('weekly breakdown', () => {
  const r = simulate();
  it('reports each group and the gap for every week, matching week 12', () => {
    for (const a of ARMS) {
      const arm = r.arms[a];
      expect(arm.equityGapWeekly).toHaveLength(12);
      expect(arm.equityGapWeekly[11]).toBeCloseTo(arm.equityGap, 6);
      for (const k of ARCHETYPES) expect(arm.byArchetypeWeekly[k][11]).toBeCloseTo(arm.byArchetype[k], 6);
    }
  });
});
