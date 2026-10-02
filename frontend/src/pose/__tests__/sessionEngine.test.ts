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
