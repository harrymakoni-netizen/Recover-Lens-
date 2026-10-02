import { describe, expect, it } from 'vitest';
import { getLiveExercise } from '../../exercises';
import { BATTERIES, analyzeScreening, type StepResult } from '../screening';
import { SessionEngine } from '../sessionEngine';
import { H, type Pose, W, makePose, seeded } from './simulator';

const FRAME_MS = 1000 / 30;

function runStep(stepIndex: number, sport: keyof typeof BATTERIES, script: (go: (p: Pose, s: number) => void) => void): StepResult {
  const step = BATTERIES[sport][stepIndex];
  const engine = new SessionEngine(getLiveExercise(step.exerciseId), {
    targetReps: step.reps,
    sets: 1,
    side: step.side,
    holdSeconds: step.holdSeconds,
  });
  const rand = seeded(11);
  let t = 0;
  let last: Pose = {};
  const go = (to: Pose, seconds: number) => {
    const n = Math.round(seconds * 30);
    for (let i = 1; i <= n; i++) {
      const pose: Pose = {};
      for (const k of new Set([...Object.keys(last), ...Object.keys(to)]) as Set<keyof Pose>) {
        const a = (last[k] ?? 0) as number;
        const b = (to[k] ?? 0) as number;
        (pose as Record<string, number>)[k] = a + ((b - a) * i) / n;
      }
      const p = makePose(pose, 2, rand);
      engine.update(p.landmarks, t, W, H, p.world);
      t += FRAME_MS;
    }
    last = to;
  };
  go({}, 5); // calibrate + countdown
  script(go);
  return { step, summary: engine.summary() };
}

function squats(caveLeftOn: number[]) {
  return (go: (p: Pose, s: number) => void) => {
    for (let i = 0; i < 5; i++) {
      const v = caveLeftOn.includes(i) ? 0.4 : 0;
      go({ kneeFlexL: 85, kneeFlexR: 85, valgusL: v }, 1);
      go({ kneeFlexL: 85, kneeFlexR: 85, valgusL: v }, 0.3);
      go({}, 1);
      go({}, 0.3);
    }
  };
}

describe('sports screening (SPEC §8.4)', () => {
  it('a caving left knee on 4 of 5 squats is flagged for review', () => {
    const squat = runStep(0, 'football', squats([0, 1, 2, 3]));
    expect(squat.summary.reps).toBe(5);
    const result = analyzeScreening('football', [squat]);
    const left = result.observations.find((o) => o.id === 'squat_valgus_left')!;
    expect(left.status).toBe('review');
    expect(left.detail).toBe('Left knee drifted inward on 4 of 5 reps');
    expect(left.recommendation).toMatch(/FIFA 11\+/);
    expect(result.observations.find((o) => o.id === 'squat_valgus_right')!.status).toBe('good');
    expect(result.overall).toBe('review');
    // Review items come first.
    expect(result.observations[0].status).toBe('review');
  });

  it('clean squats are all good', () => {
    const squat = runStep(0, 'general', squats([]));
    const result = analyzeScreening('general', [squat]);
    expect(result.overall).toBe('good');
    expect(result.observations.every((o) => o.status === 'good')).toBe(true);
    // No FIFA references outside football, and no recommendation for good items.
    expect(result.observations.every((o) => o.recommendation === null)).toBe(true);
  });

  it('balance on the left leg completes and reports level hips', () => {
    const bal = runStep(1, 'football', (go) => {
      go({ liftR: 0.1 }, 0.5);
      go({ liftR: 0.1 }, 21);
    });
    expect(bal.summary.holdRecords).toHaveLength(1);
    const result = analyzeScreening('football', [bal]);
    expect(result.observations.find((o) => o.id === 'balance_pelvis_left')!.status).toBe('good');
  });

  it('never uses diagnostic language', () => {
    const squat = runStep(0, 'football', squats([0, 1, 2, 3, 4]));
    const text = JSON.stringify(analyzeScreening('football', [squat]));
    expect(text).not.toMatch(/injury|ACL|diagnos|risk detected/i);
  });
});
