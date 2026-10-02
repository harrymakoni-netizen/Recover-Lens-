// Sports movement screen (SPEC §8.4): test batteries per sport and analysis of the results into
// observations. Observations, not diagnoses: each item is Good or Review.
import library from '../../../docs/exercise_library.json';
import { THRESHOLDS } from './formRules';
import type { Side } from './landmarks';
import type { RepRecord, SessionSummary } from './sessionEngine';

export type Sport = 'football' | 'basketball' | 'running' | 'general';
export type ObservationStatus = 'good' | 'review';

export interface BatteryStep {
  id: string;
  exerciseId: string;
  label: string;
  side?: Side;
  reps?: number;
  holdSeconds?: number;
}

export interface Observation {
  id: string;
  label: string;
  status: ObservationStatus;
  detail: string;
  recommendation: string | null;
}

export interface StepResult {
  step: BatteryStep;
  summary: SessionSummary;
}

export interface ScreeningAnalysis {
  observations: Observation[];
  tests: Array<{ id: string; name: string; reps?: number; holdSeconds?: number; score: number | null }>;
  overall: ObservationStatus;
}

export const SPORTS: Array<{ id: Sport; name: string; blurb: string }> = [
  { id: 'football', name: 'Football / Soccer', blurb: 'Squats and single-leg balance' },
  { id: 'basketball', name: 'Basketball', blurb: 'Squats and jump landings' },
  { id: 'running', name: 'Running / Athletics', blurb: 'Single-leg squats and balance' },
  { id: 'general', name: 'General Fitness', blurb: 'Bodyweight squats' },
];

const squat: BatteryStep = { id: 'squat', exerciseId: 'squat_screen', label: 'Bodyweight squat ×5', reps: 5 };
const balance = (side: Side, seconds: number): BatteryStep => ({
  id: `balance_${side}`,
  exerciseId: 'single_leg_balance',
  label: `Single-leg balance (${side} leg) ${seconds}s`,
  side,
  holdSeconds: seconds,
});
const slSquat = (side: Side): BatteryStep => ({
  id: `sls_${side}`,
  exerciseId: 'single_leg_squat',
  label: `Single-leg squat (${side} leg) ×5`,
  side,
  reps: 5,
});

export const BATTERIES: Record<Sport, BatteryStep[]> = {
  football: [squat, balance('left', 20), balance('right', 20)],
  basketball: [squat, { id: 'jump', exerciseId: 'jump_landing', label: 'Vertical jump landing ×3', reps: 3 }],
  running: [slSquat('left'), slSquat('right'), balance('left', 20), balance('right', 20)],
  general: [squat],
};

// Recommendations from docs/exercise_library.json → sports_screening.risk_flag_recommendations.
const RECS = Object.fromEntries(
  library.sports_screening.risk_flag_recommendations.map((r) => [r.finding, r.recommendation]),
) as Record<string, string>;
const REC = {
  valgus: RECS['Knee valgus detected'],
  lean: RECS['Excessive forward torso lean'],
  asymmetry: RECS['Asymmetric squat pattern'],
  heel: RECS['Heel rise on descent'],
};
const FIFA = {
  valgus: 'FIFA 11+: Squats (With Toe Raise → One-Leg Squats) and Single-Leg Stance.',
  balance: 'FIFA 11+: Single-Leg Stance series and Sideways Bench.',
  landing: 'FIFA 11+: Jumping (Vertical Jumps) focusing on soft, knee-over-toe landings.',
  core: 'FIFA 11+: The Bench and Sideways Bench series.',
};

/** Fraction of reps that must show a pattern before it is flagged for review. */
const REVIEW_FRACTION = 0.4; // TUNE:
const STIFF_LANDING_DEG = 160; // SPEC §8.4: knee angle at landing > 160°
const SHALLOW_SQUAT_DEG = 130; // TUNE:

const count = (recs: RepRecord[], pred: (r: RepRecord) => boolean) => recs.filter(pred).length;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function withFifa(rec: string, sport: Sport, fifa: string): string {
  return sport === 'football' ? `${rec} ${fifa}` : rec;
}

function repObservation(
  id: string,
  recs: RepRecord[],
  pred: (r: RepRecord) => boolean,
  texts: { bad: (n: number, total: number) => string; good: string; label: string },
  recommendation: string,
): Observation {
  const n = count(recs, pred);
  const review = recs.length > 0 && n / recs.length >= REVIEW_FRACTION;
  return {
    id,
    label: texts.label,
    status: review ? 'review' : 'good',
    detail: n > 0 ? texts.bad(n, recs.length) : texts.good,
    recommendation: review ? recommendation : null,
  };
}

function analyzeSquat(r: StepResult, sport: Sport): Observation[] {
  const recs = r.summary.repRecords;
  if (recs.length === 0) return [];
  const v = THRESHOLDS.valgusRatio;
  const out: Observation[] = [];
  for (const side of ['left', 'right'] as const) {
    out.push(
      repObservation(
        `squat_valgus_${side}`,
        recs,
        (x) => ((side === 'left' ? x.maxValgusL : x.maxValgusR) ?? 0) > v,
        {
          label: `${cap(side)} knee alignment`,
          bad: (n, t) => `${cap(side)} knee drifted inward on ${n} of ${t} reps`,
          good: `${cap(side)} knee stayed over the toes`,
        },
        withFifa(REC.valgus, sport, FIFA.valgus),
      ),
    );
  }
  out.push(
    repObservation(
      'squat_symmetry',
      recs,
      (x) => (x.minSymmetry ?? 100) < THRESHOLDS.symmetryPct,
      { label: 'Left–right symmetry', bad: (n, t) => `One side bent more than the other on ${n} of ${t} reps`, good: 'Both sides moved evenly' },
      withFifa(REC.asymmetry, sport, FIFA.balance),
    ),
  );
  out.push(
    repObservation(
      'squat_torso',
      recs,
      (x) => (x.maxTorsoLean ?? 0) > THRESHOLDS.torsoLeanDeg,
      { label: 'Torso position', bad: (n, t) => `Torso leaned to one side on ${n} of ${t} reps`, good: 'Torso stayed centred' },
      withFifa(REC.lean, sport, FIFA.core),
    ),
  );
  out.push(
    repObservation(
      'squat_heels',
      recs,
      (x) => (x.maxHeelRise ?? 0) > THRESHOLDS.heelRiseFraction,
      { label: 'Heels', bad: (n, t) => `Heels lifted on ${n} of ${t} reps`, good: 'Heels stayed down' },
      REC.heel,
    ),
  );
  if (sport === 'general') {
    const depths = recs.map((x) => Math.min(x.minKneeL ?? 180, x.minKneeR ?? 180));
    const avg = depths.reduce((a, b) => a + b, 0) / depths.length;
    const shallow = avg > SHALLOW_SQUAT_DEG;
    out.push({
      id: 'squat_depth',
      label: 'Squat depth',
      status: shallow ? 'review' : 'good',
      detail: `Knees bent to about ${Math.round(avg)}° on average${shallow ? ' (shallow)' : ''}`,
      recommendation: shallow ? REC.heel : null,
    });
  }
  return out;
}

function analyzeSingleLegSquat(r: StepResult, sport: Sport): Observation[] {
  const side = r.step.side ?? 'left';
  const recs = r.summary.repRecords;
  if (recs.length === 0) return [];
  return [
    repObservation(
      `sls_valgus_${side}`,
      recs,
      (x) => ((side === 'left' ? x.maxValgusL : x.maxValgusR) ?? 0) > THRESHOLDS.valgusRatio,
      {
        label: `${cap(side)} leg squat: knee`,
        bad: (n, t) => `${cap(side)} knee drifted inward on ${n} of ${t} single-leg squats`,
        good: `${cap(side)} knee stayed over the toes`,
      },
      withFifa(REC.valgus, sport, FIFA.valgus),
    ),
    repObservation(
      `sls_pelvis_${side}`,
      recs,
      (x) => (x.maxHipDrop ?? 0) > THRESHOLDS.hipDrop,
      {
        label: `${cap(side)} leg squat: hips`,
        bad: (n, t) => `Hips dropped on ${n} of ${t} single-leg squats on the ${side} leg`,
        good: `Hips stayed level on the ${side} leg`,
      },
      withFifa(REC.asymmetry, sport, FIFA.balance),
    ),
  ];
}

function analyzeBalance(r: StepResult, sport: Sport): Observation[] {
  const side = r.step.side ?? 'left';
  const rec = r.summary.holdRecords[0];
  const target = r.step.holdSeconds ?? 20;
  if (!rec) {
    return [
      {
        id: `balance_${side}`,
        label: `Balance on ${side} leg`,
        status: 'review',
        detail: `Did not complete the ${target}s hold on the ${side} leg`,
        recommendation: withFifa(REC.asymmetry, sport, FIFA.balance),
      },
    ];
  }
  const out: Observation[] = [];
  const drop = (rec.maxHipDrop ?? 0) > THRESHOLDS.hipDrop;
  out.push({
    id: `balance_pelvis_${side}`,
    label: `Balance on ${side} leg: hips`,
    status: drop ? 'review' : 'good',
    detail: drop ? `Hip dropped while balancing on the ${side} leg` : `Held ${target}s with hips level`,
    recommendation: drop ? withFifa(REC.asymmetry, sport, FIFA.balance) : null,
  });
  const valgus = (rec.maxValgus ?? 0) > THRESHOLDS.valgusRatio;
  out.push({
    id: `balance_valgus_${side}`,
    label: `Balance on ${side} leg: knee`,
    status: valgus ? 'review' : 'good',
    detail: valgus ? `${cap(side)} knee drifted inward while balancing` : `${cap(side)} knee stayed over the toes`,
    recommendation: valgus ? withFifa(REC.valgus, sport, FIFA.valgus) : null,
  });
  return out;
}

function analyzeJump(r: StepResult, sport: Sport): Observation[] {
  const recs = r.summary.repRecords;
  if (recs.length === 0) return [];
  return [
    repObservation(
      'landing_stiff',
      recs,
      (x) => (x.landingKneeMin ?? 180) > STIFF_LANDING_DEG,
      { label: 'Landing softness', bad: (n, t) => `Stiff landing (knees nearly straight) on ${n} of ${t} jumps`, good: 'Landed softly with bent knees' },
      withFifa(REC.valgus, sport, FIFA.landing),
    ),
    repObservation(
      'landing_valgus',
      recs,
      (x) => Math.max(x.maxValgusL ?? 0, x.maxValgusR ?? 0) > THRESHOLDS.valgusRatio,
      { label: 'Knees on landing', bad: (n, t) => `Knees drifted inward on ${n} of ${t} landings`, good: 'Knees stayed over the toes on landing' },
      withFifa(REC.valgus, sport, FIFA.landing),
    ),
  ];
}

export function analyzeScreening(sport: Sport, results: StepResult[]): ScreeningAnalysis {
  const observations: Observation[] = [];
  for (const r of results) {
    switch (r.step.exerciseId) {
      case 'squat_screen':
        observations.push(...analyzeSquat(r, sport));
        break;
      case 'single_leg_squat':
        observations.push(...analyzeSingleLegSquat(r, sport));
        break;
      case 'single_leg_balance':
        observations.push(...analyzeBalance(r, sport));
        break;
      case 'jump_landing':
        observations.push(...analyzeJump(r, sport));
        break;
    }
  }
  // Review items first.
  observations.sort((a, b) => (a.status === b.status ? 0 : a.status === 'review' ? -1 : 1));
  return {
    observations,
    tests: results.map((r) => ({
      id: r.step.id,
      name: r.step.label,
      reps: r.summary.kind === 'reps' ? r.summary.reps : undefined,
      holdSeconds: r.summary.kind === 'hold' ? (r.summary.holdRecords[0]?.seconds ?? 0) : undefined,
      score: r.summary.movementScore,
    })),
    overall: observations.some((o) => o.status === 'review') ? 'review' : 'good',
  };
}
