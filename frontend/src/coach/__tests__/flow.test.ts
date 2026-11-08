import { describe, expect, it, vi } from 'vitest';
import { libraryFor, mergeExtraction, runCheckIn, EMPTY_EXTRACTION, type CheckIn, type CoachDeps } from '..';

const library = libraryFor([
  { exercise_id: 'mini_squat', sets: 3, reps: 10 },
  { exercise_id: 'shoulder_abduction', sets: 3, reps: 10 },
]);
const checkIn = (over: Partial<CheckIn> = {}): CheckIn => ({ text: '', pain: 2, redFlags: [], minutes: null, energy: null, ...over });
const extraction = (over: object = {}) => ({ painLevel: null, bodyAreas: [], symptoms: [], energy: null, minutesAvailable: null, barriers: [], redFlags: [], ...over });

function deps(over: Partial<CoachDeps> = {}): CoachDeps & { extract: ReturnType<typeof vi.fn>; plan: ReturnType<typeof vi.fn> } {
  return {
    extract: vi.fn(async () => ({ extraction: extraction(), model: 'm1' })),
    plan: vi.fn(async () => ({ plan: { items: [{ exerciseId: 'shoulder_abduction', sets: 2, reps: 8 }], technique: 'graded_tasks', why: 'Gentle today.' }, model: 'm2' })),
    ...over,
  } as never;
}
const run = (c: CheckIn, d: CoachDeps, useAi = true) => runCheckIn(c, { library, language: 'en', useAi, deps: d });

describe('check-in flow', () => {
  it('stops at a red flag before any model call', async () => {
    const d = deps();
    expect(await run(checkIn({ text: 'I fell over' }), d)).toEqual({ kind: 'red_flag', flags: ['fall'] });
    expect(await run(checkIn({ pain: 9 }), d)).toEqual({ kind: 'red_flag', flags: ['severe_pain'] });
    expect(d.extract).not.toHaveBeenCalled();
    expect(d.plan).not.toHaveBeenCalled();
  });

  it('stops when the model reads a red flag the patterns missed', async () => {
    const d = deps({ extract: vi.fn(async () => ({ extraction: extraction({ redFlags: ['chest_pain'] }), model: 'm1' })) });
    expect(await run(checkIn({ text: 'Chipfuva chinorwadza' }), d)).toEqual({ kind: 'red_flag', flags: ['chest_pain'] });
    expect(d.plan).not.toHaveBeenCalled();
  });

  it('sends only redacted text and validates the model plan', async () => {
    const d = deps();
    const out = await run(checkIn({ text: 'tired, call 0771234567', minutes: 10 }), d);
    expect(d.extract).toHaveBeenCalledWith('tired, call [number]', 'en');
    expect(out).toMatchObject({ kind: 'plan', source: 'model', model: 'm2', fallback: false });
    if (out.kind !== 'plan') throw new Error();
    expect(out.result.plan.items).toEqual([{ exerciseId: 'shoulder_abduction', sets: 2, reps: 8 }]);
    expect(out.result.plan.why).toBe('Gentle today.');
    expect(d.plan.mock.calls[0][0].minutes_available).toBe(10);
  });

  it('plans without extraction when nothing is typed', async () => {
    const d = deps();
    const out = await run(checkIn({ energy: 'low' }), d);
    expect(d.extract).not.toHaveBeenCalled();
    expect(d.plan.mock.calls[0][0].extraction.energy).toBe('low');
    expect(out).toMatchObject({ kind: 'plan', source: 'model' });
  });

  it('uses the rules when the AI coach is off, without calling the model', async () => {
    const d = deps();
    const out = await run(checkIn({ text: 'tired' }), d, false);
    expect(out).toMatchObject({ kind: 'plan', source: 'rules', fallback: false });
    expect(d.extract).not.toHaveBeenCalled();
  });

  it('falls back to the rules when the model fails or answers nonsense', async () => {
    const failing = deps({ extract: vi.fn(async () => Promise.reject(new Error('503'))) });
    expect(await run(checkIn({ text: 'tired' }), failing)).toMatchObject({ kind: 'plan', source: 'rules', fallback: true });
    const nonsense = deps({ plan: vi.fn(async () => ({ plan: 'hello', model: 'm2' })) });
    expect(await run(checkIn(), nonsense)).toMatchObject({ kind: 'plan', source: 'rules', fallback: true });
    const outside = deps({ plan: vi.fn(async () => ({ plan: { items: [{ exerciseId: 'jump_landing', sets: 1, reps: 5 }], technique: 'goal_setting', why: '' }, model: 'm2' })) });
    const out = await run(checkIn(), outside);
    expect(out).toMatchObject({ kind: 'plan', source: 'rules', fallback: true });
  });

  it('keeps the safer values when merging the model reading with the taps', () => {
    const merged = mergeExtraction(
      { ...EMPTY_EXTRACTION, painLevel: 3, minutesAvailable: 10, energy: 'ok' },
      { ...EMPTY_EXTRACTION, painLevel: 6, minutesAvailable: 30, energy: 'low', bodyAreas: ['knee'], barriers: ['time'] },
    );
    expect(merged).toMatchObject({ painLevel: 6, minutesAvailable: 10, energy: 'ok', bodyAreas: ['knee'], barriers: ['time'] });
  });
});
