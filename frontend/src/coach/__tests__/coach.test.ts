import { describe, expect, it } from 'vitest';
import {
  EMPTY_EXTRACTION,
  LIMITS,
  collectRedFlags,
  estimateSeconds,
  libraryFor,
  parseExtraction,
  parsePlan,
  redFlagsFromText,
  redact,
  rulesPlan,
  validatePlan,
  type CheckIn,
  type Extraction,
  type Plan,
} from '..';

const PROGRAM = [
  { exercise_id: 'shoulder_abduction', sets: 3, reps: 10 },
  { exercise_id: 'mini_squat', sets: 3, reps: 10 },
  { exercise_id: 'single_leg_balance', sets: 2, reps: 1 },
];
const lib = libraryFor(PROGRAM);
const ex = (over: Partial<Extraction> = {}): Extraction => ({ ...EMPTY_EXTRACTION, ...over });
const checkIn = (over: Partial<CheckIn> = {}): CheckIn => ({ text: '', pain: null, redFlags: [], minutes: null, energy: null, ...over });
const plan = (items: Plan['items']): Plan => ({ items, technique: 'graded_tasks', why: 'x', source: 'model' });
const ctx = (over: Partial<Parameters<typeof validatePlan>[1]> = {}) => ({ library: lib, extraction: ex(), redFlags: [], ...over });

describe('red flags', () => {
  it('finds red flags in English text', () => {
    expect(redFlagsFromText('My knee is swollen and I have pins and needles')).toEqual(['numbness', 'swelling']);
    expect(redFlagsFromText('I fell over yesterday')).toEqual(['fall']);
    expect(redFlagsFromText('chest feels tight when I breathe')).toEqual(['chest_pain']);
    expect(redFlagsFromText('a pain in my chest')).toEqual(['chest_pain']);
    expect(redFlagsFromText('chest tightness and dizzy')).toEqual(['chest_pain', 'dizziness']);
    expect(redFlagsFromText('severe pain in my shoulder')).toEqual(['severe_pain']);
  });

  it('does not flag ordinary words', () => {
    expect(redFlagsFromText('knee a bit sore, tired, I might fall asleep')).toEqual([]);
  });

  it('combines ticked boxes, the slider, the text and the model', () => {
    const flags = collectRedFlags(checkIn({ text: 'swelling again', pain: 8, redFlags: ['fall'] }), ex({ redFlags: ['dizziness'] }));
    expect(flags).toEqual(['severe_pain', 'swelling', 'fall', 'dizziness']);
  });

  it('lets the model add a red flag but never clear one', () => {
    expect(collectRedFlags(checkIn({ redFlags: ['chest_pain'] }), ex())).toEqual(['chest_pain']);
    expect(collectRedFlags(checkIn(), ex({ painLevel: 9 }))).toEqual(['severe_pain']);
    expect(collectRedFlags(checkIn({ pain: 7 }), ex())).toEqual([]);
  });
});

describe('redact', () => {
  it('removes contact details and caps the length', () => {
    const r = redact('Call me on +263 77 123 4567 or mail tariro@example.com, see www.x.com, thanks');
    expect(r.text).toBe('Call me on [number] or mail [email], see [link], thanks');
    expect(r.removed).toBe(3);
    expect(redact('a'.repeat(900)).text).toHaveLength(500);
  });

  it('keeps short numbers such as minutes and pain scores', () => {
    expect(redact('pain 6, only 10 minutes').text).toBe('pain 6, only 10 minutes');
  });
});

describe('library', () => {
  it('uses the prescribed dose when there is a programme', () => {
    expect(lib.map((e) => [e.id, e.sets, e.reps, e.kind])).toEqual([
      ['shoulder_abduction', 3, 10, 'reps'],
      ['mini_squat', 3, 10, 'reps'],
      ['single_leg_balance', 2, 1, 'hold'],
    ]);
    expect(lib[1].affects).toContain('knee');
  });

  it('leaves out sports screens, unknown and inactive exercises, and duplicates', () => {
    const l = libraryFor([
      { exercise_id: 'squat_screen', sets: 1, reps: 5 },
      { exercise_id: 'nope', sets: 1, reps: 5 },
      { exercise_id: 'elbow_curl', sets: 2, reps: 8, active: false },
      { exercise_id: 'mini_squat', sets: 2, reps: 8 },
      { exercise_id: 'mini_squat', sets: 3, reps: 12 },
    ]);
    expect(l.map((e) => [e.id, e.reps])).toEqual([['mini_squat', 8]]);
  });

  it('falls back to the patient library without a programme', () => {
    const l = libraryFor(null);
    expect(l.length).toBeGreaterThan(5);
    expect(l.some((e) => e.id === 'squat_screen')).toBe(false);
    expect(l.some((e) => e.kind === 'guided')).toBe(true);
  });
});

describe('schema', () => {
  it('coerces and clamps model output', () => {
    expect(
      parseExtraction({ painLevel: '12', bodyAreas: ['knee', 'spleen', 'knee'], energy: 'tired', minutesAvailable: 10.4, barriers: ['time'], redFlags: ['fall', 'x'], symptoms: ['sore', 3, ''] }),
    ).toEqual({ painLevel: 10, bodyAreas: ['knee'], symptoms: ['sore'], energy: null, minutesAvailable: 10, barriers: ['time'], redFlags: ['fall'] });
  });

  it('returns null for something that is not an object', () => {
    expect(parseExtraction('hello')).toBeNull();
    expect(parsePlan({ items: 'none' })).toBeNull();
  });

  it('drops malformed plan items and defaults the technique', () => {
    const p = parsePlan({ items: [{ exerciseId: 'mini_squat', sets: 2, reps: 8 }, { exerciseId: 5 }, { exerciseId: 'x', sets: 'a', reps: 3 }], technique: 'magic', why: ' Short and gentle today. ' })!;
    expect(p.items).toEqual([{ exerciseId: 'mini_squat', sets: 2, reps: 8 }]);
    expect(p.technique).toBe('graded_tasks');
    expect(p.why).toBe('Short and gentle today.');
  });
});

describe('validator', () => {
  it('gives no plan at all when there is a red flag', () => {
    const v = validatePlan(plan([{ exerciseId: 'mini_squat', sets: 1, reps: 5 }]), ctx({ redFlags: ['chest_pain'] }));
    expect(v.plan.items).toEqual([]);
    expect(v.changes).toEqual([{ exerciseId: null, reason: 'red_flag' }]);
  });

  it('removes exercises outside the library and duplicates, and never adds any', () => {
    const v = validatePlan(
      plan([
        { exerciseId: 'jump_landing', sets: 1, reps: 5 },
        { exerciseId: 'mini_squat', sets: 2, reps: 8 },
        { exerciseId: 'mini_squat', sets: 2, reps: 8 },
      ]),
      ctx(),
    );
    expect(v.plan.items.map((i) => i.exerciseId)).toEqual(['mini_squat']);
    expect(v.changes.map((c) => c.reason)).toEqual(['not_allowed', 'duplicate']);
  });

  it('caps sets at the prescription and reps at +10%', () => {
    const v = validatePlan(plan([{ exerciseId: 'shoulder_abduction', sets: 5, reps: 20 }]), ctx());
    expect(v.plan.items[0]).toMatchObject({ sets: 3, reps: 11 });
    expect(v.changes.map((c) => c.reason)).toEqual(['sets_capped', 'reps_capped']);
  });

  it('lowers reps when the loaded area hurts and leaves out exercises for an area that hurts a lot', () => {
    const sore = validatePlan(plan([{ exerciseId: 'mini_squat', sets: 2, reps: 10 }, { exerciseId: 'shoulder_abduction', sets: 2, reps: 10 }]), ctx({ extraction: ex({ painLevel: 5, bodyAreas: ['knee'] }) }));
    expect(sore.plan.items).toEqual([
      { exerciseId: 'mini_squat', sets: 2, reps: 7 },
      { exerciseId: 'shoulder_abduction', sets: 2, reps: 10 },
    ]);
    const bad = validatePlan(plan([{ exerciseId: 'mini_squat', sets: 2, reps: 10 }, { exerciseId: 'shoulder_abduction', sets: 2, reps: 10 }]), ctx({ extraction: ex({ painLevel: 7, bodyAreas: ['knee'] }) }));
    expect(bad.plan.items.map((i) => i.exerciseId)).toEqual(['shoulder_abduction']);
    expect(bad.changes).toContainEqual({ exerciseId: 'mini_squat', reason: 'area_pain' });
  });

  it('applies pain with no named area to every exercise, but only lowers it', () => {
    const v = validatePlan(plan([{ exerciseId: 'mini_squat', sets: 1, reps: 10 }]), ctx({ extraction: ex({ painLevel: 7 }) }));
    expect(v.plan.items).toEqual([{ exerciseId: 'mini_squat', sets: 1, reps: 7 }]);
  });

  it('raises a set too small to be worth doing and caps holds', () => {
    const v = validatePlan(plan([{ exerciseId: 'mini_squat', sets: 1, reps: 1 }, { exerciseId: 'single_leg_balance', sets: 1, reps: 1, holdSeconds: 90 }]), ctx());
    expect(v.plan.items).toEqual([
      { exerciseId: 'mini_squat', sets: 1, reps: LIMITS.minReps },
      { exerciseId: 'single_leg_balance', sets: 1, reps: 1, holdSeconds: 30 },
    ]);
  });

  it('fits the minutes available: fewer sets first, then fewer reps, then fewer exercises', () => {
    const full = plan(lib.map((e) => ({ exerciseId: e.id, sets: e.sets, reps: e.reps })));
    const ten = validatePlan(full, ctx({ minutesAvailable: 10 }));
    expect(ten.minutes).toBeLessThanOrEqual(10);
    expect(ten.plan.items.length).toBe(3);
    const three = validatePlan(full, ctx({ minutesAvailable: 3 }));
    expect(three.minutes).toBeLessThanOrEqual(3);
    expect(three.changes.some((c) => c.reason === 'time_trimmed')).toBe(true);
    const total = three.plan.items.reduce((s, it) => s + estimateSeconds(it, lib.find((e) => e.id === it.exerciseId)!), 0);
    expect(total).toBeLessThanOrEqual(180);
  });

  it('uses the one-tap minutes over the extracted minutes, and never plans past the maximum', () => {
    const full = plan(lib.map((e) => ({ exerciseId: e.id, sets: e.sets, reps: e.reps })));
    expect(validatePlan(full, ctx({ minutesAvailable: 5, extraction: ex({ minutesAvailable: 60 }) })).minutes).toBeLessThanOrEqual(5);
    expect(validatePlan(full, ctx({ extraction: ex({ minutesAvailable: 120 }) })).minutes).toBeLessThanOrEqual(LIMITS.maxMinutes);
  });

  it('keeps at most the maximum number of exercises', () => {
    const big = libraryFor(null);
    const v = validatePlan(plan(big.map((e) => ({ exerciseId: e.id, sets: 1, reps: 3 }))), { library: big, extraction: ex(), redFlags: [] });
    expect(v.plan.items.length).toBeLessThanOrEqual(LIMITS.maxItems);
    expect(v.changes.filter((c) => c.reason === 'too_many').length).toBe(big.length - LIMITS.maxItems);
  });
});

describe('rules-only plan', () => {
  it('follows the prescription on an ordinary day', () => {
    const v = rulesPlan(lib, ex(), []);
    expect(v.plan.source).toBe('rules');
    expect(v.plan.whyKey).toBe('checkin.why_rules');
    expect(v.plan.items.map((i) => [i.exerciseId, i.sets, i.reps])).toEqual([
      ['shoulder_abduction', 3, 10],
      ['mini_squat', 3, 10],
      ['single_leg_balance', 2, 1],
    ]);
  });

  it('is lighter on a tired day and fits the time', () => {
    const v = rulesPlan(lib, ex({ energy: 'low' }), [], 8);
    expect(v.plan.whyKey).toBe('checkin.why_rules_lighter');
    expect(v.plan.items[0].sets).toBeLessThan(3);
    expect(v.minutes).toBeLessThanOrEqual(8);
  });

  it('gives no plan when there is a red flag', () => {
    expect(rulesPlan(lib, ex(), ['fall']).plan.items).toEqual([]);
  });
});
