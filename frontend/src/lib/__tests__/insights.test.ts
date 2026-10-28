import { describe, expect, it } from 'vitest';
import type { Program, SessionRecord } from '../../api/types';
import { compareWithBaseline, personalBaseline } from '../baseline';
import { buildInsights } from '../insights';

const NOW = Date.parse('2026-10-20T12:00:00Z');
let seq = 0;
function s(daysAgo: number, o: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: `s${seq++}`, patient_id: 'p', exercise_id: 'shoulder_abduction', mode: 'self',
    started_at: new Date(NOW - daysAgo * 86_400_000).toISOString(), duration_s: 120, reps: 10, correct_reps: 8,
    avg_top_angle: 90, movement_score: 80, torso_alignment_avg: 90, symmetry_avg: 90, top_fault: null,
    pain_before: 2, pain_after: 2, pain_confirmed_by_patient: true, fatigue_level: 'none',
    ...o,
  };
}
const find = (list: ReturnType<typeof buildInsights>, id: string) => list.find((i) => i.id === id);

describe('personal baseline', () => {
  it('is null for a first session and ignores other exercises and manual logs', () => {
    expect(personalBaseline([s(1, { exercise_id: 'mini_squat' }), s(2, { manual: true })], 'shoulder_abduction')).toBeNull();
  });

  it('averages the three latest earlier sessions of the same exercise', () => {
    const history = [s(1, { movement_score: 90, avg_top_angle: 95 }), s(2, { movement_score: 80 }), s(3, { movement_score: 70 }), s(4, { movement_score: 10 })];
    const base = personalBaseline(history, 'shoulder_abduction')!;
    expect(base.count).toBe(3);
    expect(base.score).toBe(80);
    expect(base.correctPct).toBe(80);
  });

  it('leaves out the session being compared, and anything after it', () => {
    const current = s(0, { movement_score: 99 });
    const later = s(-1, { movement_score: 10 });
    const base = personalBaseline([current, later, s(1, { movement_score: 70 })], 'shoulder_abduction', { excludeId: current.id, before: current.started_at })!;
    expect(base.score).toBe(70);
  });

  it('counts a deeper squat as more range', () => {
    const base = personalBaseline([s(1, { exercise_id: 'mini_squat', avg_top_angle: 140 })], 'mini_squat')!;
    expect(compareWithBaseline({ score: 85, angle: 134, reps: 10, correct: 9 }, base, 'mini_squat')).toEqual({ scoreDelta: 5, rangeDelta: 6, correctDelta: 10 });
    const shoulder = personalBaseline([s(1, { avg_top_angle: 90 })], 'shoulder_abduction')!;
    expect(compareWithBaseline({ score: null, angle: 84, reps: 0, correct: 0 }, shoulder, 'shoulder_abduction').rangeDelta).toBe(-6);
  });
});

describe('coach insights', () => {
  it('says nothing without sessions', () => {
    expect(buildInsights([], NOW)).toEqual([]);
  });

  it('reports a rising movement score and more range', () => {
    const list = buildInsights([6, 5, 4, 3, 2, 1].map((d, i) => s(d, { movement_score: 70 + i * 4, avg_top_angle: 80 + i * 2 })), NOW);
    expect(find(list, 'score')).toMatchObject({ tone: 'good', key: 'ins.score_up', vars: { n: 12, count: 6 } });
    expect(find(list, 'range')).toMatchObject({ tone: 'good', key: 'ins.range_up', vars: { exerciseId: 'shoulder_abduction', n: 6 } });
  });

  it('treats a shallower squat as less range', () => {
    const list = buildInsights([4, 3, 2, 1].map((d, i) => s(d, { exercise_id: 'mini_squat', avg_top_angle: 130 + i * 4 })), NOW);
    expect(find(list, 'range')).toMatchObject({ tone: 'review', key: 'ins.range_down', vars: { n: 8 } });
  });

  it('counts exercise days in the last week', () => {
    expect(find(buildInsights([1, 1.2, 2, 3, 4, 5].map((d) => s(d)), NOW), 'days')).toMatchObject({ tone: 'good', vars: { n: 5 } });
    expect(find(buildInsights([10, 12].map((d) => s(d)), NOW), 'days')).toMatchObject({ tone: 'review', key: 'ins.days_none' });
  });

  it('notices repeated signs of tiring, and steady reps', () => {
    const tired = buildInsights([s(1, { fatigue_level: 'clear' }), s(2, { fatigue_level: 'slight' }), s(3, { fatigue_level: 'clear' })], NOW);
    expect(find(tired, 'fatigue')).toMatchObject({ tone: 'review', key: 'ins.fatigue_often', vars: { n: 3, count: 3 } });
    expect(find(buildInsights([1, 2, 3].map((d) => s(d)), NOW), 'fatigue')).toMatchObject({ tone: 'good', key: 'ins.fatigue_steady' });
  });

  it('notices a fault fading, or one that keeps coming back', () => {
    const fading = [1, 2, 3, 4].map((d) => s(d)).concat([5, 6, 7, 8].map((d) => s(d, { top_fault: 'torso_lean' })));
    expect(find(buildInsights(fading, NOW), 'form')).toMatchObject({ tone: 'good', key: 'ins.fault_less', vars: { faultId: 'torso_lean' } });
    const back = [1, 2, 3, 4].map((d) => s(d, { top_fault: 'knee_valgus' }));
    expect(find(buildInsights(back, NOW), 'form')).toMatchObject({ tone: 'review', key: 'ins.fault_often', vars: { faultId: 'knee_valgus', n: 2, count: 2 } });
  });

  it('projects how many sessions to the target angle, or says it is reached', () => {
    const program = (target: number, exercise_id = 'shoulder_abduction'): Program => ({
      id: 'p', patient_id: 'p', exercise_id, sets: 3, reps: 10, target_angle: target, active: true,
    });
    const rising = [6, 5, 4, 3, 2, 1].map((d, i) => s(d, { avg_top_angle: 70 + i * 2 }));
    // Latest two average 79°, rising 2° a session: 90° is about 6 sessions away.
    expect(find(buildInsights(rising, NOW, [program(90)]), 'target')).toMatchObject({
      tone: 'neutral', key: 'ins.target_eta', vars: { exerciseId: 'shoulder_abduction', target: 90, n: 6 },
    });
    expect(find(buildInsights(rising, NOW, [program(75)]), 'target')).toMatchObject({ tone: 'good', key: 'ins.target_reached' });
    // A flat trend is not projected.
    expect(find(buildInsights([4, 3, 2, 1].map((d) => s(d, { avg_top_angle: 80 })), NOW, [program(90)]), 'target')).toBeUndefined();
    // Squats: a smaller knee angle is deeper, so 134° has reached a 135° target.
    const squats = [4, 3, 2, 1].map((d, i) => s(d, { exercise_id: 'mini_squat', avg_top_angle: 142 - i * 3 }));
    expect(find(buildInsights(squats, NOW, [program(135, 'mini_squat')]), 'target')).toMatchObject({ key: 'ins.target_reached' });
  });

  it('flags rising pain, and lists findings that need a look first', () => {
    const list = buildInsights([s(1, { pain_after: 6 }), s(2, { pain_after: 3 }), s(3, { pain_after: 3 })], NOW);
    expect(find(list, 'pain')).toMatchObject({ tone: 'review', key: 'ins.pain_up', vars: { n: 6 } });
    expect(list[0].tone).toBe('review');
    expect(find(buildInsights([s(1), s(2)], NOW), 'pain')).toMatchObject({ tone: 'good', key: 'ins.pain_low' });
  });
});
