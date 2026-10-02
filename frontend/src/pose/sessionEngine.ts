// Ties one frame of landmarks → calibration → smoothing → rep counter / hold timer → form rules →
// score, for one exercise session. Pure TypeScript (no React, no DOM) so the whole pipeline can be
// replayed in tests from recorded landmarks.
import type { ExerciseConfig } from '../exercises/types';
import {
  CalibrationGate,
  type CalibrationIssue,
  checkCalibration,
  requiredVisible,
} from './calibration';
import { FaultDetector, type FaultInput, type FaultRuleId } from './formRules';
import { type RawMetrics, computeRawMetrics, symmetry, torsoAlignment } from './geometry';
import { HoldTimer } from './holdTimer';
import { type Landmark, SIDE_LANDMARKS, type Side, visibilityOf } from './landmarks';
import { RepCounter, type RepResult, type RepState, computeProgress } from './repCounter';
import { DisplayScore, frameScore, mean } from './scoring';
import { EmaBank } from './smoothing';

export type EnginePhase = 'calibrating' | 'countdown' | 'active' | 'paused' | 'complete';
export type SkeletonColor = 'green' | 'amber' | 'grey';

export interface EngineOptions {
  targetReps?: number;
  sets?: number;
  holdSeconds?: number;
  /** Overrides the config side: the tested / standing leg. */
  side?: Side;
  countdownMs?: number;
  calibrationHoldMs?: number;
  /** Landmarks missing this long during a set pauses counting (SPEC §5.1). */
  pauseAfterMs?: number;
}

export type EngineEvent =
  | { type: 'calibration'; issue: CalibrationIssue }
  | { type: 'ready' }
  | { type: 'countdown'; n: number }
  | { type: 'start' }
  | { type: 'phase'; state: RepState }
  | { type: 'fault'; id: FaultRuleId }
  | ({ type: 'rep' } & RepResult)
  | { type: 'turnedBackEarly' }
  | { type: 'setComplete'; set: number; sets: number }
  | { type: 'sessionComplete' }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'holdStart' }
  | { type: 'holdBroken' }
  | { type: 'holdRemaining'; seconds: number }
  | { type: 'feetDown' };

/** Per-rep measurements kept for the summary and sports screening analysis. */
export interface RepRecord extends RepResult {
  maxValgusL: number | null;
  maxValgusR: number | null;
  maxTorsoLean: number | null;
  maxHeelRise: number | null;
  minSymmetry: number | null;
  minKneeL: number | null;
  minKneeR: number | null;
  maxHipDrop: number | null;
  /** Jump landing: smallest knee angle in the 0.6 s after landing. */
  landingKneeMin: number | null;
}

export interface HoldRecord {
  set: number;
  standingSide: Side | null;
  seconds: number;
  target: number;
  quality: number;
  correct: boolean;
  maxHipDrop: number | null;
  maxValgus: number | null;
  faults: FaultRuleId[];
}

export interface SmoothedMetrics {
  shoulderL: number | null;
  shoulderR: number | null;
  elbowL: number | null;
  elbowR: number | null;
  kneeL: number | null;
  kneeR: number | null;
  torsoLean: number | null;
  torsoAlignment: number | null;
  symmetry: number | null;
}

export interface EngineFrame {
  phase: EnginePhase;
  calibrationIssue: CalibrationIssue | null;
  countdown: number | null;
  repState: RepState;
  status: string;
  /** Raw and smoothed primary angle (debug panel). */
  primaryRaw: number | null;
  primaryAngle: number | null;
  progress: number;
  metrics: SmoothedMetrics;
  reps: number;
  repsInSet: number;
  correctReps: number;
  set: number;
  sets: number;
  targetReps: number;
  /** Displayed (smoothed) movement score, null until the first movement. */
  score: number | null;
  faults: FaultRuleId[];
  skeletonColor: SkeletonColor;
  hold: { elapsed: number; target: number; holding: boolean } | null;
  /** Average visibility of the required landmarks (debug panel). */
  visibility: number;
  trackedSide: Side | null;
  events: EngineEvent[];
}

export interface SessionSummary {
  exerciseId: string;
  exerciseName: string;
  kind: 'reps' | 'hold';
  durationS: number;
  reps: number;
  correctReps: number;
  targetReps: number;
  sets: number;
  setsCompleted: number;
  avgTopAngle: number | null;
  movementScore: number | null;
  torsoAlignmentAvg: number | null;
  symmetryAvg: number | null;
  topFault: FaultRuleId | null;
  repRecords: RepRecord[];
  holdRecords: HoldRecord[];
}

const PHASE_LABELS: Record<string, Record<RepState, string>> = {
  default: { READY: 'READY', RAISING: 'RAISING', AT_TOP: 'HOLD', LOWERING: 'LOWERING' },
  knee_down: { READY: 'READY', RAISING: 'BENDING', AT_TOP: 'HOLD', LOWERING: 'STANDING UP' },
  sit_to_stand: { READY: 'READY', RAISING: 'STANDING UP', AT_TOP: 'HOLD', LOWERING: 'SITTING DOWN' },
  jump: { READY: 'READY', RAISING: 'JUMPING', AT_TOP: 'IN THE AIR', LOWERING: 'LANDING' },
};

const STANCE_LIFT_FRACTION = 0.05; // TUNE: lifted ankle must be this far (of body height) above the other
const LANDING_WINDOW_MS = 600;
const FEET_DOWN_MS = 800;

type MetricKey = keyof Omit<RawMetrics, never>;

interface Baseline {
  midHipX: number | null;
  midHipY: number | null;
  bodyHeight: number | null;
  heelLY: number | null;
  heelRY: number | null;
}

interface Extremes {
  maxValgusL: number | null;
  maxValgusR: number | null;
  maxTorsoLean: number | null;
  maxHeelRise: number | null;
  minSymmetry: number | null;
  minKneeL: number | null;
  minKneeR: number | null;
  maxHipDrop: number | null;
}

const emptyExtremes = (): Extremes => ({
  maxValgusL: null, maxValgusR: null, maxTorsoLean: null, maxHeelRise: null,
  minSymmetry: null, minKneeL: null, minKneeR: null, maxHipDrop: null,
});

const maxN = (a: number | null, b: number | null) => (b === null ? a : a === null ? b : Math.max(a, b));
const minN = (a: number | null, b: number | null) => (b === null ? a : a === null ? b : Math.min(a, b));

export class SessionEngine {
  readonly targetReps: number;
  readonly sets: number;
  readonly holdSeconds: number;

  private phase: EnginePhase = 'calibrating';
  private readonly gate: CalibrationGate;
  private lastIssue: CalibrationIssue | null | undefined = undefined;
  private countdownStart = 0;
  private lastCountdown: number | null = null;
  private lostSince: number | null = null;

  private readonly smooth = new EmaBank<MetricKey>(0.35);
  private readonly primarySmooth = new EmaBank<'L' | 'R' | 'hip'>(0.35);
  private readonly faults: FaultDetector;
  private readonly display = new DisplayScore(0.2);
  private readonly counter: RepCounter | null;
  private holdTimer: HoldTimer | null = null;
  private holdSet = 0;
  private holdStarted = false;
  private holdValidNow = false;
  private holdAwaitingFeetDown = false;
  private feetDownSince: number | null = null;
  private holdFrames = 0;
  private holdFaultFrames = 0;
  private holdScoreSum = 0;
  private holdFaultCounts = new Map<FaultRuleId, number>();
  private holdExtremes = emptyExtremes();
  private holdStandingSide: Side | null = null;
  private announcedRemaining = new Set<number>();
  private readonly holdRecords: HoldRecord[] = [];

  private baseline: Baseline | null = null;
  private autoSide: Side = 'left';
  private turnedBack = false;
  private prevActive = new Set<FaultRuleId>();
  private extremes = emptyExtremes();
  private readonly repRecords: RepRecord[] = [];
  private pendingLanding: { record: RepRecord; until: number } | null = null;

  private startMs: number | null = null;
  private lastMs = 0;
  private readonly faultFrameCounts = new Map<FaultRuleId, number>();
  private readonly alignSamples: number[] = [];
  private readonly symSamples: number[] = [];

  constructor(
    readonly config: ExerciseConfig,
    private readonly opts: EngineOptions = {},
  ) {
    this.targetReps = opts.targetReps ?? config.defaultReps;
    this.sets = opts.sets ?? config.defaultSets;
    this.holdSeconds = opts.holdSeconds ?? config.holdSeconds ?? 30;
    this.gate = new CalibrationGate(opts.calibrationHoldMs ?? 1000);
    this.faults = new FaultDetector(config.faultRules);
    this.counter =
      config.kind === 'reps'
        ? new RepCounter({
            startAngle: config.startAngle,
            targetAngle: config.targetAngle,
            holdSeconds: config.holdSeconds,
            minRepSeconds: config.minRepSeconds,
            targetReps: this.targetReps,
            sets: this.sets,
          })
        : null;
    if (opts.side) this.autoSide = opts.side;
  }

  get currentPhase(): EnginePhase {
    return this.phase;
  }

  /** Side used for single-side tracking. */
  private get side(): Side | null {
    if (this.opts.side) return this.opts.side;
    if (this.config.side === 'left' || this.config.side === 'right') return this.config.side;
    if (this.config.side === 'auto' && this.config.kind === 'reps') return this.autoSide;
    return null;
  }

  private requiredFor(landmarks: Landmark[] | null): number[] {
    const req = [...this.config.requiredLandmarks];
    if (this.config.side === 'auto' && this.config.kind === 'reps') {
      if (landmarks && !this.opts.side) this.pickAutoSide(landmarks);
      const s = SIDE_LANDMARKS[this.autoSide];
      req.push(s.shoulder, s.hip, s.knee, s.ankle);
      if (this.config.primaryAngle && 'joint' in this.config.primaryAngle && this.config.primaryAngle.joint === 'shoulder') {
        req.push(s.elbow);
      }
    }
    return [...new Set(req)];
  }

  /** Side view: track whichever side faces the camera (sticky to avoid flipping). */
  private pickAutoSide(landmarks: Landmark[]): void {
    const score = (side: Side) => {
      const s = SIDE_LANDMARKS[side];
      return [s.shoulder, s.elbow, s.hip, s.knee, s.ankle].reduce((sum, i) => sum + visibilityOf(landmarks[i]), 0);
    };
    const other: Side = this.autoSide === 'left' ? 'right' : 'left';
    if (score(other) > score(this.autoSide) + 0.5) this.autoSide = other;
  }

  /** Front-view exercises that read knee angles need depth (see AngleSpec.depth). */
  private get kneeDepth(): boolean {
    const spec = this.config.primaryAngle;
    if (spec && 'joint' in spec) return spec.joint === 'knee' && !!spec.depth;
    return this.config.cameraView === 'front';
  }

  update(
    landmarks: Landmark[] | null,
    tMs: number,
    width: number,
    height: number,
    world?: Landmark[] | null,
  ): EngineFrame {
    const events: EngineEvent[] = [];
    this.lastMs = tMs;
    const required = this.requiredFor(landmarks);
    const visibility =
      landmarks && landmarks.length >= 33
        ? required.reduce((s, i) => s + visibilityOf(landmarks[i]), 0) / required.length
        : 0;

    // Smooth metrics every frame so values are warm when counting starts.
    const raw = landmarks && landmarks.length >= 33 ? computeRawMetrics(landmarks, width, height, { kneeDepth: this.kneeDepth, world }) : null;
    const m = this.smoothMetrics(raw);
    const { primaryRaw, primaryAngle, symmetryPct } = this.primary(raw, m);

    if (this.phase === 'calibrating') {
      const check = checkCalibration(landmarks, required, this.config.calibration);
      if (check.issue !== this.lastIssue) {
        this.lastIssue = check.issue;
        if (check.issue) events.push({ type: 'calibration', issue: check.issue });
      }
      if (this.gate.update(check, tMs)) {
        this.phase = 'countdown';
        this.countdownStart = tMs;
        this.lastCountdown = null;
        events.push({ type: 'ready' });
      }
    } else if (this.phase === 'countdown') {
      if (!requiredVisible(landmarks, required)) {
        this.phase = 'calibrating';
        this.gate.reset();
        this.lastIssue = undefined;
      } else {
        const elapsed = tMs - this.countdownStart;
        const total = this.opts.countdownMs ?? 3000;
        const n = Math.ceil((total - elapsed) / 1000);
        if (elapsed >= total) {
          this.phase = 'active';
          this.startMs = tMs;
          this.baseline = {
            midHipX: m.midHipX,
            midHipY: m.midHipY,
            bodyHeight: m.bodyHeight,
            heelLY: m.heelLY,
            heelRY: m.heelRY,
          };
          events.push({ type: 'start' });
        } else if (n !== this.lastCountdown) {
          this.lastCountdown = n;
          events.push({ type: 'countdown', n });
        }
      }
    } else if (this.phase === 'active' || this.phase === 'paused') {
      const visible = requiredVisible(landmarks, required);
      if (this.phase === 'paused') {
        if (visible) {
          this.phase = 'active';
          this.lostSince = null;
          events.push({ type: 'resumed' });
        }
      } else if (!visible) {
        this.lostSince ??= tMs;
        if (tMs - this.lostSince > (this.opts.pauseAfterMs ?? 1500)) {
          this.phase = 'paused';
          events.push({ type: 'paused' });
        }
      } else {
        this.lostSince = null;
      }

      if (this.phase === 'active') {
        if (this.counter) this.stepReps(m, primaryAngle, symmetryPct, tMs, events);
        else this.stepHold(m, tMs, events);
      }
    }

    // Jump landing: keep watching the knees briefly after the rep completes.
    if (this.pendingLanding) {
      const kneeMin = minN(m.kneeL, m.kneeR);
      this.pendingLanding.record.landingKneeMin = minN(this.pendingLanding.record.landingKneeMin, kneeMin);
      if (tMs >= this.pendingLanding.until) this.pendingLanding = null;
    }

    const activeFaults = this.phase === 'active' ? this.faults.active : [];
    const holding = !!this.holdTimer && !this.holdTimer.complete && this.holdValidNow;
    const skeletonColor: SkeletonColor =
      this.phase !== 'active' || !landmarks ? 'grey' : activeFaults.length > 0 ? 'amber' : 'green';

    return {
      phase: this.phase,
      calibrationIssue: this.phase === 'calibrating' ? (this.lastIssue ?? null) : null,
      countdown: this.phase === 'countdown' ? this.lastCountdown : null,
      repState: this.counter?.state ?? 'READY',
      status: this.statusLabel(),
      primaryRaw,
      primaryAngle,
      progress: this.counter?.progress ?? (holding ? 1 : 0),
      metrics: {
        shoulderL: m.shoulderL,
        shoulderR: m.shoulderR,
        elbowL: m.elbowL,
        elbowR: m.elbowR,
        kneeL: m.kneeL,
        kneeR: m.kneeR,
        torsoLean: m.torsoLean,
        torsoAlignment: m.torsoLean === null ? null : torsoAlignment(m.torsoLean),
        symmetry: symmetryPct,
      },
      reps: this.counter?.reps ?? this.holdRecords.length,
      repsInSet: this.counter?.repsInSet ?? 0,
      correctReps: this.counter?.correctReps ?? this.holdRecords.filter((r) => r.correct).length,
      set: this.counter?.currentSet ?? Math.min(this.holdSet + 1, this.sets),
      sets: this.sets,
      targetReps: this.targetReps,
      score: this.display.current,
      faults: activeFaults,
      skeletonColor,
      hold: this.holdTimer
        ? { elapsed: this.holdTimer.elapsedMs / 1000, target: this.holdSeconds, holding }
        : this.config.kind === 'hold'
          ? { elapsed: 0, target: this.holdSeconds, holding: false }
          : null,
      visibility,
      trackedSide: this.side,
      events,
    };
  }

  private smoothMetrics(raw: RawMetrics | null): Record<MetricKey, number | null> {
    const out = {} as Record<MetricKey, number | null>;
    const keys: MetricKey[] = [
      'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'kneeL', 'kneeR', 'torsoLean', 'valgusL', 'valgusR',
      'hipDrop', 'midHipX', 'midHipY', 'hipWidth', 'bodyHeight', 'heelLY', 'heelRY', 'ankleLY', 'ankleRY',
      'shoulderForward',
    ];
    for (const k of keys) out[k] = this.smooth.update(k, raw ? raw[k] : null);
    return out;
  }

  private primary(
    raw: RawMetrics | null,
    m: Record<MetricKey, number | null>,
  ): { primaryRaw: number | null; primaryAngle: number | null; symmetryPct: number | null } {
    const spec = this.config.primaryAngle;
    if (!spec) {
      // Hold exercises: knee symmetry is not meaningful on one leg.
      return { primaryRaw: null, primaryAngle: null, symmetryPct: null };
    }
    if ('metric' in spec) {
      const b = this.baseline;
      if (!b || b.midHipY === null || !b.bodyHeight) return { primaryRaw: null, primaryAngle: null, symmetryPct: null };
      const rise = (y: number | null) => (y === null ? null : ((b.midHipY! - y) / b.bodyHeight!) * 100);
      const smoothed = this.primarySmooth.update('hip', rise(raw?.midHipY ?? null));
      return { primaryRaw: rise(raw?.midHipY ?? null), primaryAngle: smoothed, symmetryPct: null };
    }
    const key = (side: Side): MetricKey => `${spec.joint}${side === 'left' ? 'L' : 'R'}` as MetricKey;
    if (this.config.side === 'both' && !this.opts.side) {
      const l = m[key('left')];
      const r = m[key('right')];
      const sym = l !== null && r !== null ? symmetry(l, r) : null;
      if (l === null || r === null) {
        const one = l ?? r;
        return { primaryRaw: one, primaryAngle: one, symmetryPct: sym };
      }
      // Use the side with less progress so both arms/legs must reach the target.
      const pl = computeProgress(l, this.config.startAngle, this.config.targetAngle);
      const pr = computeProgress(r, this.config.startAngle, this.config.targetAngle);
      const useLeft = pl <= pr;
      return {
        primaryRaw: raw ? raw[key(useLeft ? 'left' : 'right')] : null,
        primaryAngle: useLeft ? l : r,
        symmetryPct: sym,
      };
    }
    const side = this.side ?? 'left';
    return { primaryRaw: raw ? raw[key(side)] : null, primaryAngle: m[key(side)], symmetryPct: null };
  }

  private faultInput(
    m: Record<MetricKey, number | null>,
    repState: RepState,
    inMovement: boolean,
    symmetryPct: number | null,
    kneeSide: Side | null,
  ): FaultInput {
    const b = this.baseline;
    const bodyH = b?.bodyHeight ?? m.bodyHeight;
    const heelRise = (base: number | null | undefined, now: number | null) =>
      base == null || now === null || !bodyH ? null : (base - now) / bodyH;
    const side = this.side;
    const elbowAngle =
      this.config.side === 'both' && !this.opts.side
        ? minN(m.elbowL, m.elbowR)
        : side === 'right'
          ? m.elbowR
          : m.elbowL;
    const valgus =
      kneeSide === 'left' ? m.valgusL : kneeSide === 'right' ? m.valgusR : maxN(m.valgusL, m.valgusR);
    return {
      repState,
      inMovement,
      torsoLean: m.torsoLean,
      symmetry: symmetryPct,
      elbowAngle,
      shoulderForward: this.config.cameraView === 'side' ? m.shoulderForward : null,
      bodyHeight: bodyH,
      valgus: this.config.cameraView === 'side' ? null : valgus,
      midHipX: m.midHipX,
      hipWidth: m.hipWidth,
      baselineMidHipX: b?.midHipX ?? null,
      heelRise: maxN(heelRise(b?.heelLY, m.heelLY), heelRise(b?.heelRY, m.heelRY)),
      hipDrop: m.hipDrop,
      turnedBackEarly: this.turnedBack,
    };
  }

  private stepReps(
    m: Record<MetricKey, number | null>,
    primaryAngle: number | null,
    symmetryPct: number | null,
    tMs: number,
    events: EngineEvent[],
  ): void {
    const counter = this.counter!;
    const kneeSide = this.opts.side ?? null;
    const inMovement = counter.state !== 'READY';
    const results = this.faults.update(this.faultInput(m, counter.state, inMovement, symmetryPct, kneeSide), tMs);
    const active = results.filter((r) => r.active).map((r) => r.id);
    this.emitNewFaults(active, events);

    let score: number | undefined;
    if (inMovement) {
      score = frameScore({
        progress: counter.progress,
        torsoAlignment: m.torsoLean === null ? 100 : torsoAlignment(m.torsoLean),
        symmetry: symmetryPct ?? 100,
        activeFaults: active.length,
      });
      this.display.update(score);
      this.recordMovementFrame(m, symmetryPct, active);
      this.trackExtremes(m, symmetryPct, this.baseline);
    }

    const repEvents = counter.update({ angle: primaryAngle, tMs, faults: active, frameScore: score });
    for (const e of repEvents) {
      switch (e.type) {
        case 'state':
          if (e.to === 'RAISING' && e.from === 'READY') {
            this.extremes = emptyExtremes();
            this.trackExtremes(m, symmetryPct, this.baseline);
          }
          if (e.to === 'READY') this.turnedBack = false;
          if (e.to !== 'READY') events.push({ type: 'phase', state: e.to });
          break;
        case 'turnedBackEarly':
          this.turnedBack = true;
          events.push({ type: 'turnedBackEarly' });
          break;
        case 'rep': {
          const { type: _t, ...result } = e;
          const record: RepRecord = { ...result, ...this.extremes, landingKneeMin: null };
          this.repRecords.push(record);
          if (this.config.primaryAngle && 'metric' in this.config.primaryAngle) {
            record.landingKneeMin = minN(m.kneeL, m.kneeR);
            this.pendingLanding = { record, until: tMs + LANDING_WINDOW_MS };
          }
          events.push(e);
          break;
        }
        case 'setComplete':
          events.push(e);
          break;
        case 'sessionComplete':
          this.phase = 'complete';
          events.push(e);
          break;
        case 'rejected':
          break;
      }
    }
  }

  private stepHold(m: Record<MetricKey, number | null>, tMs: number, events: EngineEvent[]): void {
    const bodyH = this.baseline?.bodyHeight ?? m.bodyHeight;
    let standing: Side | null = null;
    if (m.ankleLY !== null && m.ankleRY !== null && bodyH) {
      const diff = (m.ankleLY - m.ankleRY) / bodyH; // positive = left ankle lower = standing on left
      if (diff > STANCE_LIFT_FRACTION) standing = 'left';
      else if (diff < -STANCE_LIFT_FRACTION) standing = 'right';
    }
    const wanted = this.opts.side ?? (this.config.side === 'left' || this.config.side === 'right' ? this.config.side : null);
    const valid = standing !== null && (wanted === null || standing === wanted);
    this.holdValidNow = valid;

    // Between sets: wait for both feet down before timing the next leg.
    if (this.holdAwaitingFeetDown) {
      if (standing === null) {
        this.feetDownSince ??= tMs;
        if (tMs - this.feetDownSince >= FEET_DOWN_MS) {
          this.holdAwaitingFeetDown = false;
          this.feetDownSince = null;
          events.push({ type: 'feetDown' });
        }
      } else {
        this.feetDownSince = null;
      }
      this.faults.update(this.faultInput(m, 'READY', false, null, null), tMs);
      return;
    }

    if (!this.holdTimer) {
      this.holdTimer = new HoldTimer(this.holdSeconds);
      this.resetHoldStats();
    }
    const results = this.faults.update(this.faultInput(m, 'READY', valid, null, standing), tMs);
    const active = valid ? results.filter((r) => r.active).map((r) => r.id) : [];
    this.emitNewFaults(active, events);

    const u = this.holdTimer.update(valid, tMs);
    if (valid && !this.holdStarted) {
      this.holdStarted = true;
      this.holdStandingSide = standing;
      events.push({ type: 'holdStart' });
    }
    if (u.justBroken) events.push({ type: 'holdBroken' });

    if (valid) {
      const score = frameScore({
        progress: 1,
        torsoAlignment: m.torsoLean === null ? 100 : torsoAlignment(m.torsoLean),
        symmetry: 100,
        activeFaults: active.length,
      });
      this.display.update(score);
      this.holdFrames += 1;
      this.holdScoreSum += score;
      if (active.length) this.holdFaultFrames += 1;
      for (const f of active) this.holdFaultCounts.set(f, (this.holdFaultCounts.get(f) ?? 0) + 1);
      this.holdExtremes.maxHipDrop = maxN(this.holdExtremes.maxHipDrop, m.hipDrop);
      this.holdExtremes.maxValgusL = maxN(
        this.holdExtremes.maxValgusL,
        standing === 'left' ? m.valgusL : standing === 'right' ? m.valgusR : null,
      );
      this.recordMovementFrame(m, null, active);

      const remaining = Math.ceil(this.holdTimer.remainingS);
      for (const mark of [20, 10, 5]) {
        if (remaining === mark && this.holdSeconds > mark && !this.announcedRemaining.has(mark)) {
          this.announcedRemaining.add(mark);
          events.push({ type: 'holdRemaining', seconds: mark });
        }
      }
    }

    if (u.justCompleted) {
      this.holdSet += 1;
      const faultFraction = this.holdFrames ? this.holdFaultFrames / this.holdFrames : 0;
      this.holdRecords.push({
        set: this.holdSet,
        standingSide: this.holdStandingSide,
        seconds: this.holdSeconds,
        target: this.holdSeconds,
        quality: this.holdFrames ? this.holdScoreSum / this.holdFrames : 0,
        correct: faultFraction < 0.25,
        maxHipDrop: this.holdExtremes.maxHipDrop,
        maxValgus: this.holdExtremes.maxValgusL,
        faults: [...this.holdFaultCounts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id),
      });
      events.push({ type: 'setComplete', set: this.holdSet, sets: this.sets });
      this.holdTimer = null;
      this.holdStarted = false;
      if (this.holdSet >= this.sets) {
        this.phase = 'complete';
        events.push({ type: 'sessionComplete' });
      } else {
        this.holdAwaitingFeetDown = true;
      }
    }
  }

  private resetHoldStats(): void {
    this.holdFrames = 0;
    this.holdFaultFrames = 0;
    this.holdScoreSum = 0;
    this.holdFaultCounts = new Map();
    this.holdExtremes = emptyExtremes();
    this.holdStandingSide = null;
    this.announcedRemaining = new Set();
  }

  private emitNewFaults(active: FaultRuleId[], events: EngineEvent[]): void {
    for (const id of active) if (!this.prevActive.has(id)) events.push({ type: 'fault', id });
    this.prevActive = new Set(active);
  }

  private recordMovementFrame(m: Record<MetricKey, number | null>, sym: number | null, active: FaultRuleId[]): void {
    if (m.torsoLean !== null) this.alignSamples.push(torsoAlignment(m.torsoLean));
    if (sym !== null) this.symSamples.push(sym);
    for (const f of active) this.faultFrameCounts.set(f, (this.faultFrameCounts.get(f) ?? 0) + 1);
  }

  private trackExtremes(m: Record<MetricKey, number | null>, sym: number | null, b: Baseline | null): void {
    const e = this.extremes;
    e.maxValgusL = maxN(e.maxValgusL, m.valgusL);
    e.maxValgusR = maxN(e.maxValgusR, m.valgusR);
    e.maxTorsoLean = maxN(e.maxTorsoLean, m.torsoLean);
    e.minSymmetry = minN(e.minSymmetry, sym);
    e.minKneeL = minN(e.minKneeL, m.kneeL);
    e.minKneeR = minN(e.minKneeR, m.kneeR);
    e.maxHipDrop = maxN(e.maxHipDrop, m.hipDrop);
    const bodyH = b?.bodyHeight;
    if (bodyH) {
      const rise = (base: number | null | undefined, now: number | null) =>
        base == null || now === null ? null : (base - now) / bodyH;
      e.maxHeelRise = maxN(e.maxHeelRise, maxN(rise(b?.heelLY, m.heelLY), rise(b?.heelRY, m.heelRY)));
    }
  }

  private statusLabel(): string {
    switch (this.phase) {
      case 'calibrating':
        return 'CALIBRATING';
      case 'countdown':
        return 'GET READY';
      case 'paused':
        return 'PAUSED';
      case 'complete':
        return 'COMPLETE';
    }
    if (this.counter) {
      const id = this.config.id;
      const labels =
        id === 'sit_to_stand'
          ? PHASE_LABELS.sit_to_stand
          : id === 'jump_landing'
            ? PHASE_LABELS.jump
            : this.config.targetAngle < this.config.startAngle
              ? PHASE_LABELS.knee_down
              : PHASE_LABELS.default;
      return labels[this.counter.state];
    }
    if (this.holdAwaitingFeetDown) return 'SWITCH LEGS';
    if (this.holdStarted && this.holdValidNow) return 'HOLDING';
    return this.holdStarted ? 'HOLD PAUSED' : 'LIFT ONE FOOT';
  }

  summary(): SessionSummary {
    const reps = this.counter?.reps ?? this.holdRecords.length;
    const qualities = this.counter
      ? this.counter.results.map((r) => r.quality)
      : this.holdRecords.map((r) => r.quality);
    const topAngles =
      this.counter && this.config.primaryAngle && 'joint' in this.config.primaryAngle
        ? this.counter.results.map((r) => r.topAngle)
        : [];
    let topFault: FaultRuleId | null = null;
    let topCount = 0;
    for (const [id, count] of this.faultFrameCounts) {
      if (count > topCount) {
        topFault = id;
        topCount = count;
      }
    }
    return {
      exerciseId: this.config.id,
      exerciseName: this.config.name,
      kind: this.config.kind,
      durationS: this.startMs === null ? 0 : (this.lastMs - this.startMs) / 1000,
      reps,
      correctReps: this.counter?.correctReps ?? this.holdRecords.filter((r) => r.correct).length,
      targetReps: this.targetReps,
      sets: this.sets,
      setsCompleted: this.counter?.completedSets ?? this.holdRecords.length,
      avgTopAngle: mean(topAngles),
      movementScore: mean(qualities),
      torsoAlignmentAvg: mean(this.alignSamples),
      symmetryAvg: mean(this.symSamples),
      topFault,
      repRecords: [...this.repRecords],
      holdRecords: [...this.holdRecords],
    };
  }
}
