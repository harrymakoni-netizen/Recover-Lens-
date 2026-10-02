import { describe, expect, it } from 'vitest';
import { getLiveExercise } from '../../exercises';
import { cuesForEvents, type CueContext } from '../cues';

const ctx = (id: string, extra: Partial<CueContext> = {}): CueContext => ({
  config: getLiveExercise(id),
  mode: 'self',
  lang: 'en',
  targetReps: 10,
  sets: 3,
  ...extra,
});

const rep = (n: number) => ({
  type: 'rep' as const, repNumber: n, totalReps: n, set: 1, correct: true, quality: 90, faults: [],
  topAngle: 92, maxProgress: 1, durationS: 2,
});

describe('cue mapping (SPEC §6.2)', () => {
  it('announces every rep', () => {
    expect(cuesForEvents([rep(3)], ctx('shoulder_abduction'))[0]).toMatchObject({ text: 'Rep 3 of 10.', priority: 1 });
  });

  it('says "Set complete" on the last rep and merges it with the rest cue', () => {
    const cues = cuesForEvents([rep(10), { type: 'setComplete', set: 1, sets: 3 }], ctx('shoulder_abduction'));
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('Rep 10. Set complete. Set 1 of 3 complete. Take a short rest, then continue.');
  });

  it('ends with session complete after the last set', () => {
    const cues = cuesForEvents(
      [rep(10), { type: 'setComplete', set: 3, sets: 3 }, { type: 'sessionComplete' }],
      ctx('shoulder_abduction'),
    );
    expect(cues[0].text).toBe('Rep 10. Set complete. Session complete. Well done.');
  });

  it('speaks the exercise-specific fault cue at priority 2', () => {
    expect(cuesForEvents([{ type: 'fault', id: 'torso_lean' }], ctx('shoulder_abduction'))[0]).toMatchObject({
      text: 'Keep your torso upright.',
      priority: 2,
    });
    expect(cuesForEvents([{ type: 'fault', id: 'torso_lean' }], ctx('mini_squat'))[0].text).toBe('Keep your chest up.');
    expect(cuesForEvents([{ type: 'turnedBackEarly' }], ctx('shoulder_abduction'))[0].text).toBe('Try to reach shoulder height.');
  });

  it('addresses the helper in caregiver mode', () => {
    const c = ctx('shoulder_abduction', { mode: 'caregiver' });
    expect(cuesForEvents([rep(3)], c)[0].text).toBe("That's a rep. 3 of 10.");
    expect(cuesForEvents([{ type: 'fault', id: 'torso_lean' }], c)[0].text).toBe('Ask them to keep their back straight.');
  });

  it('gives a short pill text for long intros', () => {
    const [cue] = cuesForEvents([{ type: 'start' }], ctx('shoulder_abduction'));
    expect(cue.text.length).toBeGreaterThan(40);
    expect(cue.pill.length).toBeLessThanOrEqual(40);
  });

  it('calibration asks to step back', () => {
    expect(cuesForEvents([{ type: 'calibration', issue: 'step_back' }], ctx('shoulder_abduction'))[0].text).toBe(
      'Step back until your whole body is visible.',
    );
  });
});
