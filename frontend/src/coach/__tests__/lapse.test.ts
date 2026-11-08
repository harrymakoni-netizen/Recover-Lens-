import { describe, expect, it } from 'vitest';
import {
  ADAPTATIONS,
  LAPSE_DAYS,
  RESOLVE_DAYS,
  chooseNudge,
  comebackCheckIn,
  lapseStatus,
  newBandit,
  parseBandit,
  resolvePending,
  runCheckIn,
  showNudge,
  libraryFor,
  type BanditState,
  cleanMessage,
  comebackMessage,
} from '..';

const NOW = new Date('2026-11-08T12:00:00').getTime();
const DAY = 86_400_000;
const daysAgo = (n: number, hour = 9) => {
  const d = new Date(NOW - n * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

/** Deterministic random numbers (mulberry32). */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('lapse status', () => {
  it('is new before the first session', () => {
    expect(lapseStatus([], true, NOW)).toMatchObject({ state: 'new', daysSince: null });
  });

  it('is active while sessions are recent and lapsed after the threshold', () => {
    expect(lapseStatus([daysAgo(0)], true, NOW)).toMatchObject({ state: 'active', daysSince: 0 });
    expect(lapseStatus([daysAgo(LAPSE_DAYS - 1)], true, NOW).state).toBe('active');
    expect(lapseStatus([daysAgo(LAPSE_DAYS)], true, NOW)).toMatchObject({ state: 'lapsed', daysSince: LAPSE_DAYS });
  });

  it('is never lapsed without an active programme', () => {
    expect(lapseStatus([daysAgo(10)], false, NOW).state).toBe('active');
  });

  it('keeps progress: consistency counts days and never resets', () => {
    const s = lapseStatus([daysAgo(30), daysAgo(20), daysAgo(20, 15), daysAgo(9), daysAgo(8), daysAgo(3)], true, NOW);
    expect(s.consistency).toEqual({ activeDays28: 4, weeks: [0, 1, 2, 1], totalActiveDays: 5 });
    expect(s.state).toBe('lapsed');
    expect(s.consistency.totalActiveDays).toBeGreaterThan(0);
  });

  it('ignores sessions dated in the future and bad dates', () => {
    expect(lapseStatus([new Date(NOW + DAY).toISOString(), 'nope'], true, NOW).state).toBe('new');
  });
});

describe('barrier adaptations', () => {
  it('turns every barrier into a small session', () => {
    for (const a of Object.values(ADAPTATIONS)) expect(a.minutes).toBeLessThanOrEqual(10);
    expect(ADAPTATIONS.time.minutes).toBe(5);
    expect(ADAPTATIONS.forgot.reminder).toBe(true);
  });

  it('builds a check-in that feeds the normal flow, with the barrier recorded', async () => {
    const c = comebackCheckIn('motivation', 3);
    expect(c).toMatchObject({ minutes: 10, energy: 'low', barriers: ['motivation'], redFlags: [] });
    const lib = libraryFor([{ exercise_id: 'mini_squat', sets: 3, reps: 10 }]);
    const out = await runCheckIn(c, { library: lib, language: 'en', useAi: false, deps: {} as never, technique: 'goal_setting' });
    if (out.kind !== 'plan') throw new Error();
    expect(out.extraction.barriers).toEqual(['motivation']);
    expect(out.result.plan.technique).toBe('goal_setting');
    expect(out.result.minutes).toBeLessThanOrEqual(10);
    expect(out.result.plan.items[0].sets).toBeLessThan(3);
  });
});

describe('nudge bandit', () => {
  it('starts even and records a pending nudge', () => {
    const s = showNudge(newBandit(), 'gentle', NOW);
    expect(s.pending).toEqual({ nudge: 'gentle', shownAt: NOW });
  });

  it('counts a win when a session follows within the window, a loss when none does', () => {
    const s = showNudge(newBandit(), 'small_step', NOW);
    const win = resolvePending(s, [new Date(NOW + DAY).toISOString()], NOW + 2 * DAY);
    expect(win.arms.small_step).toEqual({ wins: 1, losses: 0 });
    expect(win.pending).toBeNull();
    expect(resolvePending(s, [], NOW + DAY)).toBe(s); // still waiting
    const loss = resolvePending(s, [], NOW + RESOLVE_DAYS * DAY + 1);
    expect(loss.arms.small_step).toEqual({ wins: 0, losses: 1 });
  });

  it('learns to prefer the nudge that works for this person', () => {
    let s: BanditState = newBandit();
    s.arms.progress = { wins: 9, losses: 1 };
    s.arms.gentle = { wins: 1, losses: 9 };
    s.arms.small_step = { wins: 1, losses: 9 };
    s.arms.social = { wins: 1, losses: 9 };
    const rand = seeded(7);
    const picks = Array.from({ length: 200 }, () => chooseNudge(s, rand));
    expect(picks.filter((p) => p === 'progress').length).toBeGreaterThan(170);
  });

  it('still explores when it knows nothing', () => {
    const rand = seeded(1);
    const picks = new Set(Array.from({ length: 100 }, () => chooseNudge(newBandit(), rand)));
    expect(picks.size).toBe(4);
  });

  it('reads stored state safely', () => {
    expect(parseBandit('x')).toEqual(newBandit());
    const p = parseBandit({ arms: { gentle: { wins: 2, losses: -1 } }, pending: { nudge: 'nope', shownAt: 1 } });
    expect(p.arms.gentle).toEqual({ wins: 2, losses: 0 });
    expect(p.pending).toBeNull();
  });
});

describe('welcome-back message', () => {
  const status = lapseStatus([daysAgo(4), daysAgo(9)], true, NOW);
  it('uses the model text when it is short and kind', async () => {
    const m = await comebackMessage({ language: 'en', nudge: 'progress', barrier: 'time', status }, async (body) => {
      expect(body).toMatchObject({ days_since: 4, active_days_28: 2, total_active_days: 2, barrier: 'time' });
      return { message: '  Welcome back.  Your progress is kept. ', model: 'm' };
    });
    expect(m).toEqual({ text: 'Welcome back. Your progress is kept.', key: 'comeback.msg.progress', params: { days: 4, active: 2, total: 2 }, model: 'm' });
  });

  it('falls back to the template without the AI, on errors, or when the text breaks the rules', async () => {
    expect((await comebackMessage({ language: 'en', nudge: 'gentle', barrier: null, status }, null)).text).toBeNull();
    expect((await comebackMessage({ language: 'en', nudge: 'gentle', barrier: null, status }, async () => Promise.reject(new Error('503')))).text).toBeNull();
    expect((await comebackMessage({ language: 'en', nudge: 'gentle', barrier: null, status }, async () => ({ message: "Don't break your streak!", model: 'm' }))).text).toBeNull();
    expect(cleanMessage('x'.repeat(301))).toBeNull();
  });
});
