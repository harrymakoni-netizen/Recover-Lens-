// End-to-end tests of the per-frame pipeline using synthetic bodies.
import { describe, expect, it } from 'vitest';
import { getLiveExercise } from '../../exercises';
import { type EngineEvent, type EngineFrame, SessionEngine, type EngineOptions } from '../sessionEngine';
import { H, type Pose, W, makePose, seeded } from './simulator';

const FRAME_MS = 1000 / 30;

class Driver {
  t = 0;
  events: EngineEvent[] = [];
  last!: EngineFrame;
  private readonly rand = seeded(7);

  constructor(readonly engine: SessionEngine, private readonly noise = 2) {}

  frames(pose: Pose | null, seconds: number) {
    const n = Math.round(seconds * 30);
    for (let i = 0; i < n; i++) this.step(pose);
  }

  step(pose: Pose | null) {
    const p = pose ? makePose(pose, this.noise, this.rand) : null;
    this.last = this.engine.update(p?.landmarks ?? null, this.t, W, H, p?.world);
    this.events.push(...this.last.events);
    this.t += FRAME_MS;
  }

  /** Smoothly move between two poses. */
  move(from: Pose, to: Pose, seconds: number) {
    const n = Math.round(seconds * 30);
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      const pose: Pose = {};
      for (const key of new Set([...Object.keys(from), ...Object.keys(to)]) as Set<keyof Pose>) {
        const a = (from[key] ?? 0) as number;
        const b = (to[key] ?? 0) as number;
        (pose as Record<string, number>)[key] = a + (b - a) * k;
      }
      this.step(pose);
    }
  }

  /** Stand still until counting starts (calibration + countdown). */
  calibrate(pose: Pose) {
    this.frames(pose, 5);
    expect(this.last.phase).toBe('active');
  }

  count(type: EngineEvent['type']) {
    return this.events.filter((e) => e.type === type).length;
  }
}

const make = (id: string, opts: EngineOptions = {}) => new Driver(new SessionEngine(getLiveExercise(id), opts));

describe('calibration gate (SPEC §5.1)', () => {
  it('asks to stand in front of the camera when nobody is detected', () => {
    const d = make('shoulder_abduction');
    d.frames(null, 0.5);
    expect(d.last.phase).toBe('calibrating');
    expect(d.last.calibrationIssue).toBe('no_person');
    expect(d.last.skeletonColor).toBe('grey');
  });

  it('says "step back" when the legs are out of frame', () => {
    const d = make('shoulder_abduction');
    d.frames({ scale: 1.4 }, 1);
    expect(d.last.calibrationIssue).toBe('step_back');
    expect(d.last.phase).toBe('calibrating');
  });

  it('says "move closer" when the person is far away', () => {
    const d = make('shoulder_abduction');
    d.frames({ scale: 0.6 }, 1);
    expect(d.last.calibrationIssue).toBe('move_closer');
  });

  it('says "move to the centre" when off to one side', () => {
    const d = make('shoulder_abduction');
    d.frames({ offsetX: 0.36 }, 1);
    expect(d.last.calibrationIssue).toBe('move_center');
  });

  it('starts after 1 s of good position and a 3-2-1 countdown', () => {
    const d = make('shoulder_abduction');
    d.frames({ scale: 1.4 }, 1);
    d.frames({}, 0.9);
    expect(d.last.phase).toBe('calibrating');
    d.frames({}, 0.3);
    expect(d.last.phase).toBe('countdown');
    expect(d.events.filter((e) => e.type === 'countdown').map((e) => (e as { n: number }).n)).toEqual([3]);
    d.frames({}, 3.1);
    expect(d.last.phase).toBe('active');
    expect(d.events.filter((e) => e.type === 'countdown').map((e) => (e as { n: number }).n)).toEqual([3, 2, 1]);
    expect(d.count('start')).toBe(1);
  });

  it('pauses when the body leaves the frame for >1.5 s and resumes without a countdown', () => {
    const d = make('shoulder_abduction');
    d.calibrate({});
    d.frames(null, 1);
    expect(d.last.phase).toBe('active');
    d.frames(null, 1);
    expect(d.last.phase).toBe('paused');
    expect(d.last.skeletonColor).toBe('grey');
    d.frames({}, 0.1);
    expect(d.last.phase).toBe('active');
    expect(d.count('resumed')).toBe(1);
    expect(d.count('start')).toBe(1);
  });
});

describe('shoulder abduction session', () => {
  it('counts 10 reps with pauses at the top: 10/10 and 10 rep events', () => {
    const d = make('shoulder_abduction', { targetReps: 10, sets: 1 });
    d.calibrate({ armL: 15, armR: 15 });
    for (let i = 0; i < 10; i++) {
      d.move({ armL: 15, armR: 15 }, { armL: 90, armR: 90 }, 1.2);
      d.frames({ armL: 90, armR: 90 }, i % 2 === 0 ? 2.5 : 0.3); // pause at the top on every other rep
      d.move({ armL: 90, armR: 90 }, { armL: 15, armR: 15 }, 1.2);
      d.frames({ armL: 15, armR: 15 }, 0.4);
    }
    expect(d.last.reps).toBe(10);
    expect(d.last.repsInSet).toBe(10);
    expect(d.count('rep')).toBe(10);
    expect(d.count('sessionComplete')).toBe(1);
    expect(d.last.phase).toBe('complete');
    const summary = d.engine.summary();
    expect(summary.reps).toBe(10);
    expect(summary.correctReps).toBe(10);
    expect(summary.avgTopAngle).toBeGreaterThan(90);
    expect(summary.movementScore).toBeGreaterThan(80);
  });

  it('notices reps slowing within a set once, and reports fatigue signs in the summary', () => {
    const d = make('shoulder_abduction', { targetReps: 10, sets: 1 });
    d.calibrate({ armL: 15, armR: 15 });
    for (let i = 0; i < 10; i++) {
      const s = i < 3 ? 0.9 : 1.6; // later reps take much longer
      d.move({ armL: 15, armR: 15 }, { armL: 90, armR: 90 }, s);
      d.frames({ armL: 90, armR: 90 }, 0.2);
      d.move({ armL: 90, armR: 90 }, { armL: 15, armR: 15 }, s);
      d.frames({ armL: 15, armR: 15 }, 0.4);
    }
    expect(d.count('rep')).toBe(10);
    expect(d.count('tiring')).toBe(1);
    const fatigue = d.engine.summary().fatigue!;
    expect(fatigue.signs).toContain('slower');
    expect(fatigue.slowerPct).toBeGreaterThan(40);
  });

  it('counts elbow curls and estimates a higher joint load with a weight in the hand', () => {
    const run = (loadKg: number) => {
      const d = make('elbow_curl', { targetReps: 3, sets: 1, loadKg });
      const down = { armL: 5, armR: 5, elbowBend: 0 };
      const up = { armL: 5, armR: 5, elbowBend: 110 };
      d.calibrate(down);
      for (let i = 0; i < 3; i++) {
        d.move(down, up, 1);
        d.frames(up, 0.3);
        d.move(up, down, 1);
        d.frames(down, 0.4);
      }
      return d;
    };
    const empty = run(0);
    const bottle = run(0.5);
    expect(empty.count('rep')).toBe(3);
    const a = empty.engine.summary().effort!;
    const b = bottle.engine.summary().effort!;
    expect(a.joint).toBe('elbow');
    expect(a.peakNm).toBeGreaterThan(1.5);
    expect(b.loadKg).toBe(0.5);
    expect(b.peakNm - a.peakNm).toBeGreaterThan(1);
    expect(empty.engine.summary().repRecords[0].peakTorque).not.toBeNull();
  });

  it('reads ~90° when the arms are horizontal', () => {
    const d = make('shoulder_abduction');
    d.calibrate({ armL: 80, armR: 80 });
    // Hip–shoulder line slopes inward slightly, so 80° from vertical-down reads ~90°.
    expect(d.last.metrics.shoulderL).toBeGreaterThan(85);
    expect(d.last.metrics.shoulderL).toBeLessThan(95);
  });

  it('turns amber within 0.5 s of leaning and green again when upright', () => {
    const d = make('shoulder_abduction');
    d.calibrate({});
    expect(d.last.skeletonColor).toBe('green');
    d.frames({ lean: 18 }, 0.5);
    expect(d.last.skeletonColor).toBe('amber');
    expect(d.last.faults).toContain('torso_lean');
    expect(d.events).toContainEqual({ type: 'fault', id: 'torso_lean' });
    d.frames({ lean: 0 }, 0.3);
    expect(d.last.skeletonColor).toBe('green');
  });

  it('counts a rep done while leaning, but not as correct', () => {
    const d = make('shoulder_abduction');
    d.calibrate({});
    d.move({}, { lean: 18 }, 0.4);
    d.move({ lean: 18, armL: 15, armR: 15 }, { lean: 18, armL: 90, armR: 90 }, 1.2);
    d.move({ lean: 18, armL: 90, armR: 90 }, { lean: 18, armL: 15, armR: 15 }, 1.2);
    d.frames({ lean: 18 }, 0.4);
    expect(d.last.reps).toBe(1);
    expect(d.last.correctReps).toBe(0);
    expect(d.engine.summary().topFault).toBe('torso_lean');
  });

  it('flags one arm lagging as asymmetry and needs both arms up to count', () => {
    const d = make('shoulder_abduction');
    d.calibrate({});
    d.move({ armL: 15, armR: 15 }, { armL: 90, armR: 50 }, 1.2);
    d.frames({ armL: 90, armR: 50 }, 0.5);
    expect(d.last.faults).toContain('asymmetry');
    d.move({ armL: 90, armR: 50 }, { armL: 15, armR: 15 }, 1.2);
    d.frames({}, 0.4);
    expect(d.last.reps).toBe(0);
  });
});

describe('knee exercises (3D knee angle from a front camera)', () => {
  it('counts mini squats and flags knee valgus', () => {
    const d = make('mini_squat', { targetReps: 3, sets: 1 });
    d.calibrate({});
    for (let i = 0; i < 3; i++) {
      const valgus = i === 2 ? 0.35 : 0;
      d.move({}, { kneeFlexL: 50, kneeFlexR: 50, valgusL: valgus, valgusR: valgus }, 1);
      d.frames({ kneeFlexL: 50, kneeFlexR: 50, valgusL: valgus, valgusR: valgus }, 0.5);
      d.move({ kneeFlexL: 50, kneeFlexR: 50, valgusL: valgus, valgusR: valgus }, {}, 1);
      d.frames({}, 0.4);
    }
    expect(d.last.reps).toBe(3);
    expect(d.engine.summary().repRecords[2].faults).toContain('knee_valgus');
    expect(d.engine.summary().repRecords[0].faults).not.toContain('knee_valgus');
  });
});

describe('single-leg balance (hold)', () => {
  it('times the hold, pauses when the foot goes down, and completes', () => {
    const d = make('single_leg_balance', { holdSeconds: 10, sets: 2 });
    d.calibrate({});
    expect(d.last.status).toBe('LIFT ONE FOOT');
    d.frames({ liftR: 0.1 }, 6);
    expect(d.last.hold?.elapsed).toBeGreaterThan(5.5);
    d.frames({}, 1); // foot down: timer pauses, does not reset
    expect(d.last.hold?.elapsed).toBeGreaterThan(5.5);
    expect(d.last.hold?.elapsed).toBeLessThan(6.5);
    d.frames({ liftR: 0.1 }, 5);
    expect(d.count('setComplete')).toBe(1);
    expect(d.last.status).toBe('SWITCH LEGS');
    d.frames({}, 1.5);
    d.frames({ liftL: 0.1 }, 10.5);
    expect(d.count('sessionComplete')).toBe(1);
    const s = d.engine.summary();
    expect(s.holdRecords.map((r) => r.standingSide)).toEqual(['left', 'right']);
  });

  it('flags a dropped pelvis', () => {
    const d = make('single_leg_balance', { holdSeconds: 10, sets: 1 });
    d.calibrate({});
    d.frames({ liftR: 0.1, hipDropR: 0.2 }, 1);
    expect(d.last.faults).toContain('pelvis_drop');
  });
});

describe('slow devices', () => {
  it('still counts reps when detection runs at only 4 fps', () => {
    // Same movement as a 30 fps test, sampled every 250 ms (a slow phone or no GPU).
    const engine = new SessionEngine(getLiveExercise('shoulder_abduction'), { targetReps: 3, sets: 1 });
    const rand = seeded(3);
    let t = 0;
    const at = (pose: Pose, seconds: number) => {
      for (let i = 0; i < seconds * 4; i++) {
        const p = makePose(pose, 2, rand);
        engine.update(p.landmarks, t, W, H, p.world);
        t += 250;
      }
    };
    at({}, 5);
    for (let i = 0; i < 3; i++) {
      at({ armL: 90, armR: 90 }, 1.5);
      at({ armL: 15, armR: 15 }, 1.5);
    }
    expect(engine.summary().reps).toBe(3);
  });
});

describe('real-world calibration (measured on real people with MediaPipe)', () => {
  it('counts squats when a straight leg reads ~160° instead of 180°', () => {
    // Real 3D knee angles read 157–164° on a straight leg. Model that as a slight resting bend.
    const d = make('mini_squat', { targetReps: 3, sets: 1 });
    const rest: Pose = { kneeFlexL: 20, kneeFlexR: 20 };
    const down: Pose = { kneeFlexL: 60, kneeFlexR: 60 };
    d.calibrate(rest);
    for (let i = 0; i < 3; i++) {
      d.move(rest, down, 1);
      d.frames(down, 0.3);
      d.move(down, rest, 1);
      d.frames(rest, 0.4);
    }
    expect(d.last.reps).toBe(3);
  });

  it('does not count a squat that is too shallow, even from a bent resting knee', () => {
    const d = make('mini_squat', { targetReps: 3, sets: 1 });
    const rest: Pose = { kneeFlexL: 20, kneeFlexR: 20 };
    const shallow: Pose = { kneeFlexL: 35, kneeFlexR: 35 };
    d.calibrate(rest);
    d.move(rest, shallow, 1);
    d.move(shallow, rest, 1);
    d.frames(rest, 0.4);
    expect(d.last.reps).toBe(0);
  });

  it('counts abduction when one arm reads 15° lower at shoulder height (as on a real person)', () => {
    // Real arms held level read 83° and 98°.
    const d = make('shoulder_abduction', { targetReps: 2, sets: 1 });
    d.calibrate({});
    for (let i = 0; i < 2; i++) {
      d.move({ armL: 15, armR: 15 }, { armL: 72, armR: 88 }, 1.2);
      d.frames({ armL: 72, armR: 88 }, 0.5);
      d.move({ armL: 72, armR: 88 }, { armL: 15, armR: 15 }, 1.2);
      d.frames({}, 0.4);
    }
    expect(d.last.reps).toBe(2);
    expect(d.engine.summary().topFault).not.toBe('asymmetry');
  });
});

describe('visibility flicker during a set', () => {
  it('keeps counting when ankle visibility dips to 0.5 (below the 0.6 calibration bar)', () => {
    const engine = new SessionEngine(getLiveExercise('shoulder_abduction'), { targetReps: 2, sets: 1 });
    const rand = seeded(5);
    let t = 0;
    const frame = (pose: Pose, dim: boolean) => {
      const p = makePose(pose, 2, rand);
      if (dim) for (const i of [27, 28]) p.landmarks[i].visibility = 0.5;
      const f = engine.update(p.landmarks, t, W, H, p.world);
      t += FRAME_MS;
      return f;
    };
    for (let i = 0; i < 150; i++) frame({}, false); // calibrate + countdown with good light
    let paused = false;
    for (let rep = 0; rep < 2; rep++) {
      for (let i = 0; i < 40; i++) paused ||= frame({ armL: 15 + (75 * i) / 40, armR: 15 + (75 * i) / 40 }, true).phase === 'paused';
      for (let i = 0; i < 40; i++) paused ||= frame({ armL: 90 - (75 * i) / 40, armR: 90 - (75 * i) / 40 }, true).phase === 'paused';
      for (let i = 0; i < 12; i++) frame({}, true);
    }
    expect(paused).toBe(false);
    expect(engine.summary().reps).toBe(2);
  });
});

describe('single-arm shoulder abduction', () => {
  it('counts reps with only the chosen arm raised', () => {
    const d = make('shoulder_abduction', { targetReps: 2, sets: 1, side: 'right' });
    d.calibrate({});
    for (let i = 0; i < 2; i++) {
      d.move({ armL: 15, armR: 15 }, { armL: 15, armR: 90 }, 1.2);
      d.frames({ armL: 15, armR: 90 }, 0.3);
      d.move({ armL: 15, armR: 90 }, { armL: 15, armR: 15 }, 1.2);
      d.frames({}, 0.4);
    }
    expect(d.last.reps).toBe(2);
    expect(d.last.trackedSide).toBe('right');
    expect(d.engine.summary().topFault).toBeNull();
  });

  it('does not count when both arms are expected and only one rises', () => {
    const d = make('shoulder_abduction', { targetReps: 2, sets: 1 });
    d.calibrate({});
    d.move({ armL: 15, armR: 15 }, { armL: 15, armR: 90 }, 1.2);
    d.move({ armL: 15, armR: 90 }, { armL: 15, armR: 15 }, 1.2);
    d.frames({}, 0.4);
    expect(d.last.reps).toBe(0);
  });
});
