// Simulated cohort (SPEC §17.6). Shows how the adaptive loop behaves under stated assumptions; it is
// NOT evidence that it works on people. Every number below is an assumption, shown on the page.
// Pure TypeScript and seeded, so the same inputs always give the same results. The RecoverLens arm
// runs the real nudge bandit (coach/bandit.ts).
import { NUDGES, type Nudge, chooseNudge, newBandit, resolvePending, showNudge, type BanditState } from '../coach/bandit';

export type Arm = 'static' | 'reminders' | 'recoverlens';
export type Archetype = 'busy_worker' | 'low_motivation' | 'caregiver_dependent' | 'low_literacy' | 'disability';
export const ARMS: readonly Arm[] = ['static', 'reminders', 'recoverlens'];
export const ARCHETYPES: readonly Archetype[] = ['busy_worker', 'low_motivation', 'caregiver_dependent', 'low_literacy', 'disability'];

const DAYS = 84; // 12 weeks
const DAY = 86_400_000;
const START = Date.UTC(2027, 0, 4);

export interface Assumptions {
  /** Chance of exercising on a given day at the start, per archetype. */
  startDaily: Record<Archetype, number>;
  /** Engagement lost per day without adaptation (habit decay). */
  decayPerDay: number;
  /** Daily chance a lapsed person returns with no support. */
  baseReturn: number;
  /** Extra daily return chance from a generic reminder. */
  reminderBoost: number;
  /** Generic reminders lose this share of their effect per week (people tune them out). */
  reminderFatiguePerWeek: number;
  /** RecoverLens: smaller, adapted sessions slow the decay by this share. */
  adaptiveDecayCut: number;
  /** RecoverLens: share of lapses where the person answers the barrier question. */
  barrierAnswered: number;
  /** RecoverLens: extra daily return chance when the comeback session fits the barrier. */
  barrierBoost: number;
  /** True extra daily return chance of each nudge, per archetype (hidden from the bandit). */
  nudgeEffect: Record<Archetype, Record<Nudge, number>>;
  /** Degrees of range gained per completed session, before diminishing returns. */
  romPerSession: number;
  /** Most range a person can regain in 12 weeks, degrees. */
  romCeiling: number;
  /** Whole days without a session that count as a lapse. */
  lapseDays: number;
}

// TUNE: illustrative values, chosen to be plausible, not measured. The pilot replaces them.
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  startDaily: { busy_worker: 0.6, low_motivation: 0.45, caregiver_dependent: 0.5, low_literacy: 0.55, disability: 0.5 },
  decayPerDay: 0.012,
  baseReturn: 0.06,
  reminderBoost: 0.06,
  reminderFatiguePerWeek: 0.12,
  adaptiveDecayCut: 0.4,
  barrierAnswered: 0.7,
  barrierBoost: 0.06,
  nudgeEffect: {
    busy_worker: { gentle: 0.02, small_step: 0.09, progress: 0.04, social: 0.02 },
    low_motivation: { gentle: 0.05, small_step: 0.04, progress: 0.08, social: 0.05 },
    caregiver_dependent: { gentle: 0.03, small_step: 0.03, progress: 0.03, social: 0.1 },
    low_literacy: { gentle: 0.06, small_step: 0.05, progress: 0.02, social: 0.06 },
    disability: { gentle: 0.07, small_step: 0.06, progress: 0.03, social: 0.04 },
  },
  romPerSession: 0.6,
  romCeiling: 25,
  lapseDays: 2,
};

/** The same world with every RecoverLens-specific effect halved: the cautious end of the range. */
export function pessimistic(a: Assumptions): Assumptions {
  const half = (r: Record<Nudge, number>) => Object.fromEntries(NUDGES.map((n) => [n, r[n] / 2])) as Record<Nudge, number>;
  return {
    ...a,
    adaptiveDecayCut: a.adaptiveDecayCut / 2,
    barrierBoost: a.barrierBoost / 2,
    nudgeEffect: Object.fromEntries(ARCHETYPES.map((k) => [k, half(a.nudgeEffect[k])])) as Assumptions['nudgeEffect'],
  };
}

/** mulberry32: small, fast, seeded. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ArmResult {
  /** Share of people with an active week (at least one session), weeks 1–12. */
  persistence: number[];
  /** Share of lapses followed by a session within 7 days. */
  returnAfterLapse: number;
  /** Share of people active in week 12. */
  retention: number;
  /** Mean range regained, degrees. */
  functionalChange: number;
  /** Week-12 persistence per archetype. */
  byArchetype: Record<Archetype, number>;
  /** Weekly persistence per archetype, weeks 1–12. */
  byArchetypeWeekly: Record<Archetype, number[]>;
  /** Best minus worst archetype at week 12, percentage points. */
  equityGap: number;
  /** Best minus worst archetype each week, percentage points, weeks 1–12. */
  equityGapWeekly: number[];
  /** For the bandit: how often it picked each person's best nudge in their last lapses. */
  bestNudgeShare: number | null;
}

export interface SimResult {
  people: number;
  perArchetype: number;
  arms: Record<Arm, ArmResult>;
}

function simulatePerson(arch: Archetype, arm: Arm, a: Assumptions, rand: () => number) {
  let engagement = 1;
  let lastSession = -1;
  const active = new Array<boolean>(DAYS).fill(false);
  let lapses = 0;
  let returned = 0;
  let lapseStart: number | null = null;
  let bandit: BanditState = newBandit();
  let barrierHelps = false;
  const effects = a.nudgeEffect[arch];
  const best = NUDGES.reduce((x, n) => (effects[n] > effects[x] ? n : x), NUDGES[0]);
  const picks: Nudge[] = [];
  const sessionTimes: string[] = [];

  for (let day = 0; day < DAYS; day++) {
    const now = START + day * DAY;
    const lapsed = lastSession >= 0 ? day - lastSession >= a.lapseDays : day >= a.lapseDays;
    if (lapsed && lapseStart === null) {
      lapseStart = day;
      lapses++;
      barrierHelps = arm === 'recoverlens' && rand() < a.barrierAnswered;
    }
    let p: number;
    if (!lapsed) {
      p = a.startDaily[arch] * engagement;
    } else {
      p = a.baseReturn;
      if (arm === 'reminders') p += a.reminderBoost * Math.max(0, 1 - a.reminderFatiguePerWeek * Math.floor(day / 7));
      if (arm === 'recoverlens') {
        bandit = resolvePending(bandit, sessionTimes, now);
        const nudge = bandit.pending?.nudge ?? chooseNudge(bandit, rand);
        if (!bandit.pending) {
          bandit = showNudge(bandit, nudge, now);
          picks.push(nudge);
        }
        p += effects[nudge] + (barrierHelps ? a.barrierBoost : 0);
      }
    }
    if (rand() < Math.min(0.95, p)) {
      active[day] = true;
      lastSession = day;
      sessionTimes.push(new Date(now + 3_600_000).toISOString());
      if (lapseStart !== null) {
        if (day - lapseStart <= 7) returned++;
        lapseStart = null;
      }
    }
    const decay = arm === 'recoverlens' ? a.decayPerDay * (1 - a.adaptiveDecayCut) : a.decayPerDay;
    engagement = Math.max(0.05, engagement * (1 - decay));
  }

  const sessions = active.filter(Boolean).length;
  const weeks = Array.from({ length: 12 }, (_, w) => active.slice(w * 7, w * 7 + 7).some(Boolean));
  const lastPicks = picks.slice(-5);
  return {
    weeks,
    lapses,
    returned,
    rom: a.romCeiling * (1 - Math.exp((-a.romPerSession * sessions) / a.romCeiling)),
    bestShare: lastPicks.length ? lastPicks.filter((n) => n === best).length / lastPicks.length : null,
  };
}

export function simulate(opts: { assumptions?: Assumptions; perArchetype?: number; seed?: number } = {}): SimResult {
  const a = opts.assumptions ?? DEFAULT_ASSUMPTIONS;
  const n = opts.perArchetype ?? 60;
  const seed = opts.seed ?? 2027;
  const arms = {} as Record<Arm, ArmResult>;
  ARMS.forEach((arm, armIndex) => {
    // Each arm sees the same people: the same seed per person, so only the arm differs.
    const weeks = new Array<number>(12).fill(0);
    let lapses = 0;
    let returned = 0;
    let rom = 0;
    const best: number[] = [];
    const byArchetype = {} as Record<Archetype, number>;
    const byArchetypeWeekly = {} as Record<Archetype, number[]>;
    ARCHETYPES.forEach((arch, k) => {
      let w12 = 0;
      const archWeeks = new Array<number>(12).fill(0);
      for (let i = 0; i < n; i++) {
        const r = simulatePerson(arch, arm, a, rng(seed * 1000 + k * 100 + i + armIndex * 0));
        r.weeks.forEach((on, w) => {
          weeks[w] += on ? 1 : 0;
          archWeeks[w] += on ? 1 : 0;
        });
        if (r.weeks[11]) w12++;
        lapses += r.lapses;
        returned += r.returned;
        rom += r.rom;
        if (r.bestShare !== null) best.push(r.bestShare);
      }
      byArchetype[arch] = w12 / n;
      byArchetypeWeekly[arch] = archWeeks.map((c) => c / n);
    });
    const total = n * ARCHETYPES.length;
    const vals = Object.values(byArchetype);
    arms[arm] = {
      persistence: weeks.map((c) => c / total),
      returnAfterLapse: lapses ? returned / lapses : 0,
      retention: weeks[11] / total,
      functionalChange: rom / total,
      byArchetype,
      byArchetypeWeekly,
      equityGap: (Math.max(...vals) - Math.min(...vals)) * 100,
      equityGapWeekly: weeks.map((_, w) => {
        const v = ARCHETYPES.map((k) => byArchetypeWeekly[k][w]);
        return (Math.max(...v) - Math.min(...v)) * 100;
      }),
      bestNudgeShare: best.length ? best.reduce((s, x) => s + x, 0) / best.length : null,
    };
  });
  return { people: n * ARCHETYPES.length, perArchetype: n, arms };
}
