// End-to-end tests of the per-frame pipeline using synthetic bodies.
import { describe, expect, it } from 'vitest';
import { getLiveExercise } from '../../exercises';
import { type EngineEvent, type EngineFrame, SessionEngine, type EngineOptions } from '../sessionEngine';
import { checkCalibration } from '../calibration';
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

describe('added exercises (reports/Live tracked rehab exercises.md)', () => {
  const up = { armL: 70, armR: 70, elbowBend: 0 };
  const down = { armL: 70, armR: 70, elbowBend: 80 };

  it('counts wall push-ups from the elbow and keeps a straight body unflagged', () => {
    const d = make('wall_push_up', { targetReps: 3, sets: 1 });
    d.calibrate(up);
    for (let i = 0; i < 3; i++) {
      d.move(up, down, 1);
      d.frames(down, 0.2);
      d.move(down, up, 1);
      d.frames(up, 0.4);
    }
    expect(d.last.reps).toBe(3);
    expect(d.last.correctReps).toBe(3);
    expect(d.events.some((e) => e.type === 'fault' && e.id === 'body_line')).toBe(false);
    // Torso alignment is left out of the score for push-ups, so the score stays high.
    expect(d.last.metrics.torsoAlignment).toBeNull();
  });

  it('flags a broken body line during push-ups but still counts the rep', () => {
    const d = make('wall_push_up', { targetReps: 2, sets: 1 });
    const bentUp = { ...up, lean: 30 };
    const bentDown = { ...down, lean: 30 };
    d.calibrate(up);
    d.move(up, bentUp, 0.5);
    d.move(bentUp, bentDown, 1);
    d.frames(bentDown, 0.3);
    d.move(bentDown, bentUp, 1);
    d.frames(bentUp, 0.4);
    expect(d.events.some((e) => e.type === 'fault' && e.id === 'body_line')).toBe(true);
    expect(d.last.reps).toBe(1);
    expect(d.last.correctReps).toBe(0);
  });

  it('counts heel raises from how far the heels and ankles rise', () => {
    const d = make('heel_raise', { targetReps: 3, sets: 1 });
    d.calibrate({});
    for (let i = 0; i < 3; i++) {
      d.move({ jump: 0 }, { jump: 0.03 }, 0.7);
      d.frames({ jump: 0.03 }, 0.2);
      d.move({ jump: 0.03 }, { jump: 0 }, 0.7);
      d.frames({}, 0.4);
    }
    expect(d.last.reps).toBe(3);
  });

  it('does not count a heel lift that is too small', () => {
    const d = make('heel_raise', { targetReps: 3, sets: 1 });
    d.calibrate({});
    d.move({ jump: 0 }, { jump: 0.006 }, 0.7);
    d.move({ jump: 0.006 }, { jump: 0 }, 0.7);
    d.frames({}, 0.4);
    expect(d.last.reps).toBe(0);
  });

  it('ends a timed test when time is up and shows the time left', () => {
    const config = { ...getLiveExercise('wall_push_up'), timeLimitSeconds: 6 };
    const d = new Driver(new SessionEngine(config, { targetReps: 30, sets: 1 }));
    d.calibrate(up);
    expect(d.last.timer?.total).toBe(6);
    d.move(up, down, 1);
    d.move(down, up, 1);
    d.frames(up, 0.4);
    expect(d.last.timer!.left).toBeLessThan(4);
    d.move(up, down, 1); // second push-up still on the way down when time runs out
    d.frames(down, 3);
    expect(d.last.phase).toBe('complete');
    expect(d.count('timeUp')).toBe(1);
    expect(d.last.reps).toBe(2);
    expect(d.last.timer?.left).toBe(0);
  });

  it('every added exercise has its cues in all three languages', async () => {
    const { PHRASES } = await import('../../voice/phrases');
    for (const id of ['wall_push_up', 'knee_push_up', 'chair_stand_30s', 'seated_knee_extension', 'standing_knee_curl', 'heel_raise', 'scaption']) {
      const c = getLiveExercise(id).cues;
      const keys = [c.intro, c.onRaising, c.onTop, c.onLowering, c.onRep, c.onSetComplete, c.onSessionComplete, ...Object.values(c.faults)];
      for (const lang of ['en', 'sn', 'nd'] as const) for (const k of keys) expect(PHRASES[lang][k!], `${id} ${lang} ${k}`).toBeTruthy();
    }
  });
});

describe('live reach training (SPEC §17.12)', () => {
  // Patient's left arm, side view, facing image-right: armL swings the wrist forward and up.
  const rest = { armL: 15, armR: 15, elbowBend: 0 };
  const out = { armL: 85, armR: 15, elbowBend: 0 };

  /** Practice reach, then 3-2-1: returns once counting has started. */
  const practiceThenStart = (d: Driver) => {
    d.frames(rest, 1.5); // calibration gate, then the practice window opens
    d.move(rest, out, 2);
    d.frames(out, 1);
    d.move(out, rest, 1.5);
    d.frames(rest, 4.5);
    expect(d.last.phase).toBe('active');
  };
  const reachRep = (d: Driver, holdS = 1.4) => {
    d.move(rest, out, 1);
    d.frames(out, holdS);
    d.move(out, rest, 1);
    d.frames(rest, 0.5);
  };

  it('sets the target from the practice reach and counts reps that enter it', () => {
    const d = make('seated_reach', { targetReps: 3, sets: 1 });
    practiceThenStart(d);
    expect(d.count('practice')).toBe(1);
    expect(d.last.target).not.toBeNull();
    for (let i = 0; i < 3; i++) reachRep(d);
    expect(d.last.reps).toBe(3);
    expect(d.last.correctReps).toBe(3);
    const s = d.engine.summary();
    expect(s.reach?.targetPct).toBeGreaterThan(95); // ≈ 90 % of a ~125 % practice reach
    expect(s.reach?.targetPct).toBeLessThan(125);
    expect(s.reach?.avgPeakPct).toBeGreaterThan(100);
    expect(s.reach?.avgHoldS).toBeGreaterThan(1);
    expect(s.trackingCoverage).toBe(100);
    expect(s.review).toEqual([]);
  });

  it('shows the target circle on the video, and marks a hit', () => {
    const d = make('seated_reach', { targetReps: 3, sets: 1 });
    practiceThenStart(d);
    expect(d.last.target?.hit).toBe(false);
    d.move(rest, out, 1);
    d.frames(out, 0.3);
    expect(d.last.target?.hit).toBe(true);
  });

  it("uses the clinician's target and skips the practice reach", () => {
    const d = make('seated_reach', { targetReps: 2, sets: 1, reachTargetPct: 90 });
    d.frames(rest, 5);
    expect(d.last.phase).toBe('active');
    expect(d.count('practice')).toBe(0);
    reachRep(d);
    expect(d.engine.summary().reach?.targetPct).toBe(90);
  });

  it('counts a rep whose hold is cut short, but not as a correct rep (rule 4)', () => {
    const d = make('seated_reach', { targetReps: 2, sets: 1 });
    practiceThenStart(d);
    reachRep(d, 0.2);
    expect(d.last.reps).toBe(1);
    expect(d.last.correctReps).toBe(0);
  });

  it('flags reaching with the trunk instead of the arm, as an observation', () => {
    const d = make('seated_reach', { targetReps: 2, sets: 1 });
    practiceThenStart(d);
    const lean = { ...out, lean: 28 };
    d.move(rest, lean, 1);
    d.frames(lean, 1.2);
    d.move(lean, rest, 1);
    d.frames(rest, 0.5);
    expect(d.events.some((e) => e.type === 'fault' && e.id === 'trunk_lean')).toBe(true);
    expect(d.engine.summary().reach?.maxTrunkDeg).toBeGreaterThan(12);
  });

  it('records the practice reach as unusable and falls back to the default target when it is too small', () => {
    const d = make('seated_reach', { targetReps: 1, sets: 1 });
    d.frames(rest, 1.5);
    d.frames(rest, 8); // no practice reach at all
    expect(d.last.phase).toBe('active');
    expect(d.engine.summary().reach?.targetPct).toBe(100);
  });
});

describe('tracking gaps and review flags (SPEC §17.12)', () => {
  const up = { armL: 70, armR: 70, elbowBend: 0 };
  const down = { armL: 70, armR: 70, elbowBend: 80 };

  it('records how long the camera lost the person, and marks the result for review', () => {
    const d = make('wall_push_up', { targetReps: 4, sets: 1 });
    d.calibrate(up);
    d.move(up, down, 1);
    d.move(down, up, 1);
    d.frames(null, 3); // the camera loses them: counting pauses
    expect(d.last.phase).toBe('paused');
    d.frames(up, 1);
    d.move(up, down, 1);
    d.move(down, up, 1);
    const s = d.engine.summary();
    expect(s.trackingLostS).toBeGreaterThan(2.5);
    expect(s.trackingCoverage).toBeLessThan(90);
    expect(s.review).toContain('tracking_gaps');
  });

  it('a clean session has full coverage and nothing to review', () => {
    const d = make('wall_push_up', { targetReps: 2, sets: 1 });
    d.calibrate(up);
    for (let i = 0; i < 2; i++) {
      d.move(up, down, 1);
      d.move(down, up, 1);
      d.frames(up, 0.4);
    }
    expect(d.engine.summary().trackingCoverage).toBe(100);
    expect(d.engine.summary().review).toEqual([]);
  });

  it('timed test: arms off the chest are recorded; only the STEADI protocol sends it for review', () => {
    const run = (protocol: 'practice' | 'assessment') => {
      const config = { ...getLiveExercise('wall_push_up'), timeLimitSeconds: 60, armsOnChest: true };
      const d = new Driver(new SessionEngine(config, { targetReps: 3, sets: 1, protocol }));
      d.calibrate(up); // arms hanging, so the wrist is well below the chest
      for (let i = 0; i < 2; i++) {
        d.move(up, down, 1);
        d.move(down, up, 1);
        d.frames(up, 0.4);
      }
      return d.engine.summary();
    };
    const practice = run('practice');
    expect(practice.armsUsedReps).toBe(2);
    expect(practice.reps).toBe(2); // every stand still counts
    expect(practice.review).not.toContain('arms_used');
    const test = run('assessment');
    expect(test.review).toContain('arms_used');
    expect(test.reps).toBe(2);
  });
});

describe('camera setup check (SPEC §17.12)', () => {
  const full = () => makePose({}, 0).landmarks;

  it('names the arm when only the elbow and wrist are out of view', () => {
    const lm = full();
    for (const i of [13, 14, 15, 16]) lm[i] = { ...lm[i], visibility: 0.1 };
    const check = checkCalibration(lm, [11, 23, 13, 15]);
    expect(check.issue).toBe('show_arms');
    expect(check.missing).toEqual([13, 15]);
  });

  it('names the ankles when only they are cut off at the bottom of the frame', () => {
    const lm = full();
    for (const i of [27, 28]) lm[i] = { x: 0.5, y: 1.04, z: 0, visibility: 0.1 };
    const check = checkCalibration(lm, [11, 23, 25, 27, 28]);
    expect(check.issue).toBe('show_feet');
    expect(check.missing).toEqual([27, 28]);
  });

  it('highlights the joints the exercise needs while calibrating', () => {
    const d = make('seated_reach');
    d.frames(null, 0.3);
    expect(d.last.setup?.required).toEqual(expect.arrayContaining([11, 13, 15, 23]));
    expect(d.last.setup?.required).not.toContain(27); // seated: the feet are not needed
    expect(d.last.setup?.missing.length).toBeGreaterThan(0);
    d.frames({}, 0.5);
    expect(d.last.setup?.missing).toEqual([]);
  });
});

describe('wall sit, lateral step-down and knee-to-wall', () => {
  describe('wall sit: time inside a knee-angle band', () => {
    const stand = { kneeSide: true };
    const sit = (deg: number) => ({ kneeSide: true, kneeFlexL: 180 - deg, kneeFlexR: 180 - deg });

    it('times the hold while the knee is in the band and completes the set', () => {
      const d = make('wall_sit', { sets: 1, holdSeconds: 4 });
      d.calibrate(stand);
      d.move(stand, sit(90), 1);
      d.frames(sit(90), 5);
      expect(d.count('holdStart')).toBe(1);
      expect(d.last.phase).toBe('complete');
      expect(d.engine.summary().setsCompleted).toBe(1);
    });

    it('pauses (never resets) when the knee leaves the band, and says which way', () => {
      const d = make('wall_sit', { sets: 1, holdSeconds: 6 });
      d.calibrate(stand);
      d.move(stand, sit(90), 1);
      d.frames(sit(90), 2.5);
      const before = d.last.hold!.elapsed;
      expect(before).toBeGreaterThan(2);
      d.move(sit(90), sit(125), 0.5); // sliding up: knee angle above the band
      d.frames(sit(125), 1);
      expect(d.events.some((e) => e.type === 'holdBroken' && e.reason === 'high')).toBe(true);
      expect(d.last.hold!.elapsed).toBeLessThan(before + 0.6);
      d.move(sit(125), sit(90), 0.5);
      d.frames(sit(90), 1);
      expect(d.last.hold!.elapsed).toBeGreaterThan(before); // continued, not restarted
    });

    it("uses the clinician's angle as the centre of the band", () => {
      const d = make('wall_sit', { sets: 1, holdSeconds: 4, targetValue: 120 });
      d.calibrate(stand);
      d.move(stand, sit(120), 1);
      d.frames(sit(120), 1);
      expect(d.last.hold!.holding).toBe(true);
      d.move(sit(120), sit(90), 0.5);
      d.frames(sit(90), 1);
      expect(d.events.some((e) => e.type === 'holdBroken' && e.reason === 'low')).toBe(true);
    });
  });

  describe('lateral step-down: control on the way down', () => {
    const hang = {};
    const lowered = { dropR: 0.045 }; // just past the 4 % target, as a real step-down ends
    const rep = (d: Driver, downS: number) => {
      d.move(hang, lowered, downS);
      d.frames(lowered, 0.4);
      d.move(lowered, hang, 1.2);
      d.frames(hang, 0.5);
    };

    it('counts reps from how far the free heel lowers and times the descent', () => {
      const d = make('lateral_step_down', { targetReps: 3, sets: 1, side: 'left' });
      d.calibrate(hang);
      for (let i = 0; i < 3; i++) rep(d, 2);
      expect(d.last.reps).toBe(3);
      expect(d.count('tooFast')).toBe(0);
      const s = d.engine.summary();
      expect(s.avgDescentS).toBeGreaterThan(1.0);
      expect(s.avgDescentS).toBeLessThan(2.0);
    });

    it('a rushed descent still counts, with a "slower" cue', () => {
      const d = make('lateral_step_down', { targetReps: 2, sets: 1, side: 'left' });
      d.calibrate(hang);
      rep(d, 0.6);
      expect(d.last.reps).toBe(1);
      expect(d.count('tooFast')).toBe(1);
      expect(d.engine.summary().avgDescentS).toBeLessThan(0.8);
    });

    it('the chosen leg decides which foot is the free one', () => {
      const d = make('lateral_step_down', { targetReps: 1, sets: 1 });
      d.engine.setSide('right'); // standing on the right: the left heel lowers
      d.calibrate(hang);
      d.move(hang, { dropL: 0.07 }, 2);
      d.frames({ dropL: 0.07 }, 0.4);
      d.move({ dropL: 0.07 }, hang, 1.2);
      d.frames(hang, 0.5);
      expect(d.last.reps).toBe(1);
    });

    it('does not count the standing foot moving', () => {
      const d = make('lateral_step_down', { targetReps: 1, sets: 1, side: 'left' });
      d.calibrate(hang);
      d.move(hang, { dropL: 0.07 }, 2);
      d.move({ dropL: 0.07 }, hang, 1.2);
      expect(d.last.reps).toBe(0);
    });
  });

  describe('knee-to-wall: forward shin tilt with the heel down', () => {
    // Negative valgus moves the left knee forward of the ankle: ~29° of shin tilt.
    const upright = { kneeSide: true };
    const forward = { kneeSide: true, valgusL: -1 };

    it('counts reps from the shin tilt in degrees and reports the angle reached', () => {
      const d = make('knee_to_wall', { targetReps: 2, sets: 1 });
      d.calibrate(upright);
      for (let i = 0; i < 2; i++) {
        d.move(upright, forward, 1);
        d.frames(forward, 1.4);
        d.move(forward, upright, 1);
        d.frames(upright, 0.5);
      }
      expect(d.last.reps).toBe(2);
      const s = d.engine.summary();
      expect(s.avgTopAngle).toBeGreaterThan(25);
      expect(s.avgTopAngle).toBeLessThan(33);
    });

    it("uses the clinician's target tilt", () => {
      const d = make('knee_to_wall', { targetReps: 1, sets: 1, targetValue: 45 });
      d.calibrate(upright);
      d.move(upright, forward, 1);
      d.frames(forward, 1.4); // ~29° is well short of 45°
      d.move(forward, upright, 1);
      d.frames(upright, 0.5);
      expect(d.last.reps).toBe(0);
    });

    it('flags a lifted heel on the tracked side, as an observation', () => {
      const d = make('knee_to_wall', { targetReps: 2, sets: 1 });
      d.calibrate(upright);
      const lifted = { ...forward, dropL: -0.04 };
      d.move(upright, lifted, 1);
      d.frames(lifted, 1.2);
      expect(d.events.some((e) => e.type === 'fault' && e.id === 'heel_rise')).toBe(true);
    });

    it("ignores the back foot's heel (it may lift in a lunge stance)", () => {
      const d = make('knee_to_wall', { targetReps: 2, sets: 1 });
      d.calibrate(upright);
      const backLifted = { ...forward, dropR: -0.05 };
      d.move(upright, backLifted, 1);
      d.frames(backLifted, 1.2);
      expect(d.events.some((e) => e.type === 'fault' && e.id === 'heel_rise')).toBe(false);
    });
  });

  it('all three have cues in every language', async () => {
    const { PHRASES, PILLS } = await import('../../voice/phrases');
    for (const id of ['wall_sit', 'lateral_step_down', 'knee_to_wall']) {
      const c = getLiveExercise(id).cues;
      const keys = [c.intro, c.onRaising, c.onTop, c.onLowering, c.onRep, c.onSetComplete, c.onSessionComplete, c.onTooFast, ...Object.values(c.faults)].filter(Boolean) as string[];
      for (const lang of ['en', 'sn', 'nd'] as const) for (const k of keys) expect(PHRASES[lang][k], `${id} ${lang} ${k}`).toBeTruthy();
      for (const lang of ['en', 'sn', 'nd'] as const) expect(PILLS[lang][c.intro], `${id} pill ${lang}`).toBeTruthy();
    }
    for (const k of ['ws_lower', 'ws_higher']) for (const lang of ['en', 'sn', 'nd'] as const) expect(PHRASES[lang][k]).toBeTruthy();
  });
});
