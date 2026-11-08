// Which nudge brings this person back? A per-person Thompson-sampling bandit (SPEC §17.5).
// Pure TypeScript; the state is kept on the device. A nudge "worked" when a session follows
// within RESOLVE_DAYS of showing it.

export type Nudge = 'gentle' | 'small_step' | 'progress' | 'social';
export const NUDGES: readonly Nudge[] = ['gentle', 'small_step', 'progress', 'social'];
export const RESOLVE_DAYS = 3; // TUNE: how long a nudge has to bring the person back
const DAY = 86_400_000;

export interface BanditState {
  /** Beta(1 + wins, 1 + losses) per nudge. */
  arms: Record<Nudge, { wins: number; losses: number }>;
  /** The nudge shown and not yet resolved. */
  pending: { nudge: Nudge; shownAt: number } | null;
}

export const newBandit = (): BanditState => ({
  arms: Object.fromEntries(NUDGES.map((n) => [n, { wins: 0, losses: 0 }])) as BanditState['arms'],
  pending: null,
});

/** Marsaglia–Tsang gamma sampler (shape ≥ 1, which Beta(1 + n, 1 + m) always has). */
function gamma(shape: number, rand: () => number): number {
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      // Box–Muller normal
      x = Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

const beta = (a: number, b: number, rand: () => number) => {
  const x = gamma(a, rand);
  return x / (x + gamma(b, rand));
};

export function chooseNudge(state: BanditState, rand: () => number = Math.random): Nudge {
  let best: Nudge = NUDGES[0];
  let bestDraw = -1;
  for (const n of NUDGES) {
    const { wins, losses } = state.arms[n];
    const draw = beta(1 + wins, 1 + losses, rand);
    if (draw > bestDraw) {
      bestDraw = draw;
      best = n;
    }
  }
  return best;
}

/** Settle the pending nudge against the session history: a session after it within the window is a win. */
export function resolvePending(state: BanditState, sessionTimes: readonly string[], now = Date.now()): BanditState {
  const p = state.pending;
  if (!p) return state;
  const came = sessionTimes.some((s) => {
    const t = Date.parse(s);
    return t > p.shownAt && t <= p.shownAt + RESOLVE_DAYS * DAY;
  });
  if (!came && now < p.shownAt + RESOLVE_DAYS * DAY) return state;
  const arm = state.arms[p.nudge];
  return { arms: { ...state.arms, [p.nudge]: came ? { ...arm, wins: arm.wins + 1 } : { ...arm, losses: arm.losses + 1 } }, pending: null };
}

export function showNudge(state: BanditState, nudge: Nudge, now = Date.now()): BanditState {
  return { ...state, pending: { nudge, shownAt: now } };
}

export function parseBandit(raw: unknown): BanditState {
  const fresh = newBandit();
  if (typeof raw !== 'object' || raw === null) return fresh;
  const r = raw as Partial<BanditState>;
  for (const n of NUDGES) {
    const a = r.arms?.[n];
    if (a && Number.isFinite(a.wins) && Number.isFinite(a.losses)) fresh.arms[n] = { wins: Math.max(0, a.wins), losses: Math.max(0, a.losses) };
  }
  const p = r.pending;
  fresh.pending = p && NUDGES.includes(p.nudge) && Number.isFinite(p.shownAt) ? { nudge: p.nudge, shownAt: p.shownAt } : null;
  return fresh;
}
