import { describe, expect, it } from 'vitest';
import { RepCounter, type RepEvent, type RepCounterOptions } from '../repCounter';

const FPS = 30;
const FRAME_MS = 1000 / FPS;

/** Linear angle ramp from `from` to `to` over `seconds`, at 30 fps. */
function ramp(from: number, to: number, seconds: number): number[] {
  const n = Math.max(1, Math.round(seconds * FPS));
  return Array.from({ length: n }, (_, i) => from + ((to - from) * (i + 1)) / n);
}
function hold(value: number, seconds: number): number[] {
  return Array.from({ length: Math.round(seconds * FPS) }, () => value);
}

/** One clean rep: rise, short pause, lower, settle. */
function cleanRep(rest = 20, top = 95, seconds = 2): number[] {
  const leg = seconds * 0.4;
  return [...ramp(rest, top, leg), ...hold(top, seconds * 0.1), ...ramp(top, rest, leg), ...hold(rest, seconds * 0.1)];
}

function run(
  angles: number[],
  opts: Partial<RepCounterOptions> = {},
  faultsAt?: (i: number) => string[],
) {
  const counter = new RepCounter({
    startAngle: 20,
    targetAngle: 90,
    minRepSeconds: 0.8,
    targetReps: 10,
    ...opts,
  });
  const events: RepEvent[] = [];
  angles.forEach((angle, i) => {
    events.push(...counter.update({ angle, tMs: i * FRAME_MS, faults: faultsAt?.(i) ?? [] }));
  });
  return { counter, events };
}

describe('RepCounter (SPEC §5.4 / §12.2)', () => {
  it('counts a clean rep 20→95→20 over 2 s', () => {
    const { counter } = run([...hold(20, 0.3), ...cleanRep()]);
    expect(counter.reps).toBe(1);
    expect(counter.correctReps).toBe(1);
    expect(counter.state).toBe('READY');
  });

  it('counts 10 clean reps and emits setComplete once', () => {
    const angles = [...hold(20, 0.3)];
    for (let i = 0; i < 10; i++) angles.push(...cleanRep());
    const { counter, events } = run(angles);
    expect(counter.reps).toBe(10);
    expect(events.filter((e) => e.type === 'setComplete')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'rep')).toHaveLength(10);
  });

  it('counts a rep after holding 3 s at the top (the Replit bug)', () => {
    const angles = [...hold(20, 0.3), ...ramp(20, 95, 1), ...hold(95, 3), ...ramp(95, 20, 1), ...hold(20, 0.3)];
    const { counter, events } = run(angles);
    expect(counter.reps).toBe(1);
    // It really was in the HOLD (AT_TOP) state during the pause.
    expect(events.some((e) => e.type === 'state' && e.to === 'AT_TOP')).toBe(true);
    expect(counter.holdElapsed).toBeGreaterThan(2.9);
  });

  it('counts a rep when the exercise requires a hold and the hold is met', () => {
    const angles = [...hold(20, 0.3), ...ramp(20, 95, 1), ...hold(95, 2), ...ramp(95, 20, 1), ...hold(20, 0.3)];
    const { counter } = run(angles, { holdSeconds: 1.5 });
    expect(counter.reps).toBe(1);
  });

  it('does not count a partial rise 20→60→20', () => {
    const angles = [...hold(20, 0.3), ...ramp(20, 60, 1), ...ramp(60, 20, 1), ...hold(20, 0.3)];
    const { counter, events } = run(angles);
    expect(counter.reps).toBe(0);
    expect(events.some((e) => e.type === 'turnedBackEarly')).toBe(true);
  });

  it('counts jitter around the top (88↔92) as a single rep', () => {
    const jitter: number[] = [];
    for (let i = 0; i < 60; i++) jitter.push(i % 2 === 0 ? 88 : 92);
    const angles = [...hold(20, 0.3), ...ramp(20, 90, 1), ...jitter, ...ramp(90, 20, 1), ...hold(20, 0.3)];
    const { counter } = run(angles);
    expect(counter.reps).toBe(1);
  });

  it('counts jitter near the bottom threshold only once', () => {
    // Wobble around progress 0.2–0.3 after a full rep must not start/finish extra reps.
    const wobble: number[] = [];
    for (let i = 0; i < 40; i++) wobble.push(i % 2 === 0 ? 33 : 36);
    const angles = [...hold(20, 0.3), ...cleanRep(), ...wobble, ...hold(20, 0.3)];
    const { counter } = run(angles);
    expect(counter.reps).toBe(1);
  });

  it('rejects a 0.3 s rep as noise', () => {
    const angles = [...hold(20, 0.3), ...ramp(20, 95, 0.15), ...ramp(95, 20, 0.15), ...hold(20, 0.3)];
    const { counter, events } = run(angles);
    expect(counter.reps).toBe(0);
    expect(events).toContainEqual({ type: 'rejected', reason: 'too_fast' });
  });

  it('counts a rep with torso lean on 50 % of frames, but not as correct', () => {
    const angles = [...hold(20, 0.3), ...cleanRep()];
    const { counter } = run(angles, {}, (i) => (i % 2 === 0 ? ['torso_lean'] : []));
    expect(counter.reps).toBe(1);
    expect(counter.correctReps).toBe(0);
    expect(counter.results[0].faults).toEqual(['torso_lean']);
  });

  it('counts a decreasing-angle exercise (squat 170→130→170)', () => {
    const angles = [...hold(170, 0.3), ...ramp(170, 130, 1), ...hold(130, 0.3), ...ramp(130, 170, 1), ...hold(170, 0.3)];
    const { counter } = run(angles, { startAngle: 170, targetAngle: 135 });
    expect(counter.reps).toBe(1);
  });

  it('runs multiple sets and completes the session', () => {
    const angles = [...hold(20, 0.3)];
    for (let i = 0; i < 6; i++) angles.push(...cleanRep());
    const { counter, events } = run(angles, { targetReps: 3, sets: 2 });
    expect(counter.reps).toBe(6);
    expect(events.filter((e) => e.type === 'setComplete')).toHaveLength(2);
    expect(events.filter((e) => e.type === 'sessionComplete')).toHaveLength(1);
    expect(counter.done).toBe(true);
  });

  it('keeps showing the finished set until the next rep starts', () => {
    const angles = [...hold(20, 0.3)];
    for (let i = 0; i < 3; i++) angles.push(...cleanRep());
    const { counter } = run(angles, { targetReps: 3, sets: 2 });
    expect(counter.repsInSet).toBe(3);
    expect(counter.currentSet).toBe(1);
    counter.update({ angle: 60, tMs: 1e6 });
    expect(counter.repsInSet).toBe(0);
    expect(counter.currentSet).toBe(2);
  });

  it('ignores frames where the angle is not measurable', () => {
    const angles: Array<number | null> = [...hold(20, 0.3), ...ramp(20, 95, 1), null, null, ...ramp(95, 20, 1), ...hold(20, 0.3)];
    const counter = new RepCounter({ startAngle: 20, targetAngle: 90, minRepSeconds: 0.8, targetReps: 10 });
    angles.forEach((angle, i) => counter.update({ angle, tMs: i * FRAME_MS }));
    expect(counter.reps).toBe(1);
  });
});
