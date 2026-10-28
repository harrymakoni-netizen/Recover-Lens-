// Coach insights: short, plain findings worked out on the device from a person's session history.
// Observational wording only (CLAUDE.md rule 9). Rendered by components/dashboard/Insights.tsx.
import type { Program, SessionRecord } from '../api/types';
import { smallerAngleIsMoreRange } from './baseline';

export type InsightTone = 'review' | 'good' | 'neutral';

export interface Insight {
  id: 'score' | 'range' | 'target' | 'days' | 'fatigue' | 'form' | 'pain';
  tone: InsightTone;
  /** Translation key, e.g. "ins.score_up". */
  key: string;
  /** Numbers, plus `exerciseId` / `faultId` that the screen turns into translated names. */
  vars: Record<string, string | number>;
}

const DAY_MS = 86_400_000;
const ORDER: Record<InsightTone, number> = { review: 0, good: 1, neutral: 2 };
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** Least-squares slope of y against 0, 1, 2… (change per session). */
function slope(y: number[]): number {
  const n = y.length;
  const mx = (n - 1) / 2;
  const my = mean(y);
  let num = 0;
  let den = 0;
  y.forEach((v, i) => {
    num += (i - mx) * (v - my);
    den += (i - mx) ** 2;
  });
  return den ? num / den : 0;
}

/**
 * Projection towards the clinician's target angle: reached, or roughly how many more sessions at
 * the current rate of progress. Only when the trend is clearly improving; labelled as a projection.
 */
function projection(camera: SessionRecord[], programs: readonly Program[]): Insight | null {
  for (const p of programs) {
    if (!p.active || p.target_angle === null) continue;
    const list = camera.filter((s) => s.exercise_id === p.exercise_id && s.avg_top_angle !== null).slice(0, 8).reverse();
    if (list.length < 4) continue;
    const sign = smallerAngleIsMoreRange(p.exercise_id) ? -1 : 1;
    const y = list.map((s) => sign * s.avg_top_angle!); // larger = more range
    const current = mean(y.slice(-2));
    const target = sign * p.target_angle;
    const vars = { exerciseId: p.exercise_id, target: p.target_angle };
    if (current >= target) return { id: 'target', tone: 'good', key: 'ins.target_reached', vars };
    const rate = slope(y);
    if (rate >= MIN_PROGRESS_PER_SESSION) {
      const n = Math.ceil((target - current) / rate);
      if (n <= MAX_PROJECTED_SESSIONS) return { id: 'target', tone: 'neutral', key: 'ins.target_eta', vars: { ...vars, n } };
    }
  }
  return null;
}

const MIN_PROGRESS_PER_SESSION = 0.3; // degrees; slower than this is too flat to project
const MAX_PROJECTED_SESSIONS = 40;

/** Newest first; at most one insight per topic, findings that need a look first. */
export function buildInsights(
  sessions: readonly SessionRecord[],
  now = Date.now(),
  programs: readonly Program[] = [],
): Insight[] {
  const all = [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at));
  const camera = all.filter((s) => !s.manual);
  const out: Insight[] = [];

  // Movement score: latest sessions against earlier ones (up to the last 8 scored sessions).
  const scored = camera.filter((s) => s.movement_score !== null).slice(0, 8);
  if (scored.length >= 4) {
    const k = Math.min(3, Math.floor(scored.length / 2));
    const recent = mean(scored.slice(0, k).map((s) => s.movement_score!));
    const d = Math.round(recent - mean(scored.slice(-k).map((s) => s.movement_score!)));
    const count = scored.length;
    if (d >= 3) out.push({ id: 'score', tone: 'good', key: 'ins.score_up', vars: { n: d, count } });
    else if (d <= -5) out.push({ id: 'score', tone: 'review', key: 'ins.score_down', vars: { n: -d, count } });
    else out.push({ id: 'score', tone: 'neutral', key: 'ins.score_steady', vars: { n: Math.round(recent) } });
  }

  // Range of motion for the exercise done most often lately (a deeper squat counts as more range).
  const angled = camera.filter((s) => s.avg_top_angle !== null).slice(0, 10);
  if (angled.length) {
    const tally = new Map<string, number>();
    for (const s of angled) tally.set(s.exercise_id, (tally.get(s.exercise_id) ?? 0) + 1);
    const exerciseId = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const list = angled.filter((s) => s.exercise_id === exerciseId).slice(0, 8);
    if (list.length >= 4) {
      const k = Math.min(3, Math.floor(list.length / 2));
      const sign = smallerAngleIsMoreRange(exerciseId) ? -1 : 1;
      const d = Math.round(
        sign * (mean(list.slice(0, k).map((s) => s.avg_top_angle!)) - mean(list.slice(-k).map((s) => s.avg_top_angle!))),
      );
      const vars = { exerciseId, count: list.length };
      if (d >= 3) out.push({ id: 'range', tone: 'good', key: 'ins.range_up', vars: { ...vars, n: d } });
      else if (d <= -5) out.push({ id: 'range', tone: 'review', key: 'ins.range_down', vars: { ...vars, n: -d } });
    }
  }

  const target = projection(camera, programs);
  if (target) out.push(target);

  // Consistency: days with at least one session in the last 7 days.
  if (all.length) {
    const days = new Set(
      all
        .filter((s) => {
          const t = Date.parse(s.started_at);
          return t <= now && now - t < 7 * DAY_MS;
        })
        .map((s) => new Date(s.started_at).toDateString()),
    ).size;
    if (days === 0) out.push({ id: 'days', tone: 'review', key: 'ins.days_none', vars: {} });
    else out.push({ id: 'days', tone: days >= 5 ? 'good' : 'neutral', key: 'ins.days', vars: { n: days } });
  }

  // Fatigue signs over the last 5 sessions that measured them.
  const measured = camera.filter((s) => s.fatigue_level).slice(0, 5);
  if (measured.length >= 3) {
    const tiring = measured.filter((s) => s.fatigue_level !== 'none').length;
    const clear = measured.filter((s) => s.fatigue_level === 'clear').length;
    if (clear >= 2 || tiring >= 3) {
      out.push({ id: 'fatigue', tone: 'review', key: 'ins.fatigue_often', vars: { n: tiring, count: measured.length } });
    } else if (tiring === 0) {
      out.push({ id: 'fatigue', tone: 'good', key: 'ins.fatigue_steady', vars: { count: measured.length } });
    }
  }

  // Form: a fault that used to be common and has faded, or one that keeps coming back.
  const recentForm = camera.slice(0, 8);
  if (recentForm.length >= 4) {
    const half = Math.floor(recentForm.length / 2);
    const newer = recentForm.slice(0, half);
    const older = recentForm.slice(half);
    const count = (list: SessionRecord[], f: string) => list.filter((s) => s.top_fault === f).length;
    const faults = [...new Set(recentForm.flatMap((s) => (s.top_fault ? [s.top_fault] : [])))];
    const faded = faults.find(
      (f) => count(older, f) >= Math.ceil(older.length / 2) && count(newer, f) <= Math.floor(newer.length / 4),
    );
    const persistent = faults
      .filter((f) => count(newer, f) >= Math.ceil(newer.length * 0.6))
      .sort((a, b) => count(newer, b) - count(newer, a))[0];
    if (persistent) {
      out.push({
        id: 'form', tone: 'review', key: 'ins.fault_often',
        vars: { faultId: persistent, n: count(newer, persistent), count: newer.length },
      });
    } else if (faded) {
      out.push({ id: 'form', tone: 'good', key: 'ins.fault_less', vars: { faultId: faded } });
    }
  }

  // Pain after exercise: the latest against the sessions just before it.
  const pained = all.filter((s) => s.pain_after !== null).slice(0, 4);
  if (pained.length >= 2) {
    const latest = pained[0].pain_after!;
    const before = pained.slice(1).map((s) => s.pain_after!);
    if (latest - mean(before) >= 2) out.push({ id: 'pain', tone: 'review', key: 'ins.pain_up', vars: { n: latest } });
    else if (latest <= 2 && Math.max(...before) <= 3) {
      out.push({ id: 'pain', tone: 'good', key: 'ins.pain_low', vars: { n: latest } });
    }
  }

  return out.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);
}
