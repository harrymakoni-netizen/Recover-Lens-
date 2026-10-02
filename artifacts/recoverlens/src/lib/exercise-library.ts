export type ExerciseTracking = 'shoulder' | 'knee' | 'balance';

export type ClinicalReviewStatus = 'pending-licensed-review' | 'approved';

export type ExerciseClinicalReview = {
  status: ClinicalReviewStatus;
  reviewer: string | null;
  reviewedAt: string | null;
  protocolVersion: string;
};

export type ExercisePilotTuning = {
  status: 'needs-pilot-tuning' | 'pilot-tuned';
  holdThresholdPercent: number;
  torsoScoreMinimum: number;
  symmetryToleranceDegrees: number;
  cameraPosition: 'front';
  assistedMovement: 'needs-assisted-pilot';
  validationCoverage: {
    bodyVariation: boolean;
    mobileAndLaptopDevices: boolean;
    cameraHeightAndDistance: boolean;
    assistedMovement: boolean;
  };
};

export type ExerciseSafetyRules = {
  painFreeRange: boolean;
  stopSessionIf: string[];
};

export type ExerciseDefinition = {
  id: string;
  name: string;
  bodyArea: string;
  description: string;
  targetAngle: number;
  sets: number;
  reps: number;
  tracking: ExerciseTracking;
  cues: string[];
  clinicalReview: ExerciseClinicalReview;
  pilotTuning: ExercisePilotTuning;
  safety: ExerciseSafetyRules;
};

const PROVISIONAL_CLINICAL_REVIEW: ExerciseClinicalReview = {
  status: 'pending-licensed-review',
  reviewer: null,
  reviewedAt: null,
  protocolVersion: 'MVP-DEMO-2026-09-02',
};

const DEFAULT_PILOT_TUNING: ExercisePilotTuning = {
  status: 'needs-pilot-tuning',
  holdThresholdPercent: 0.85,
  torsoScoreMinimum: 88,
  symmetryToleranceDegrees: 15,
  cameraPosition: 'front',
  assistedMovement: 'needs-assisted-pilot',
  validationCoverage: {
    bodyVariation: false,
    mobileAndLaptopDevices: false,
    cameraHeightAndDistance: false,
    assistedMovement: false,
  },
};

const DEFAULT_SAFETY_RULES: ExerciseSafetyRules = {
  painFreeRange: true,
  stopSessionIf: [
    'Sharp, escalating, or new pain',
    'Dizziness, shortness of breath, numbness, or loss of balance',
    'The person cannot control the movement or feels unsafe',
  ],
};

export const SHOULDER_EXERCISES: ExerciseDefinition[] = [
  {
    id: 'sh_01',
    name: 'Shoulder Abduction',
    bodyArea: 'Shoulder complex',
    description: 'Raise both arms out to the side with a steady, centred torso.',
    targetAngle: 90,
    sets: 3,
    reps: 10,
    tracking: 'shoulder',
    cues: ['Raise both arms slowly and evenly', 'Keep your torso upright and centred'],
    clinicalReview: PROVISIONAL_CLINICAL_REVIEW,
    pilotTuning: DEFAULT_PILOT_TUNING,
    safety: DEFAULT_SAFETY_RULES,
  },
  {
    id: 'sh_02',
    name: 'Shoulder Flexion',
    bodyArea: 'Anterior shoulder',
    description: 'Raise both arms forward without arching the lower back.',
    targetAngle: 160,
    sets: 3,
    reps: 10,
    tracking: 'shoulder',
    cues: ['Keep your elbows straight', 'Move only within a pain-free range'],
    clinicalReview: PROVISIONAL_CLINICAL_REVIEW,
    pilotTuning: DEFAULT_PILOT_TUNING,
    safety: DEFAULT_SAFETY_RULES,
  },
  {
    id: 'sh_03',
    name: 'Shoulder External Rotation',
    bodyArea: 'Rotator cuff',
    description: 'Rotate the forearm outward while keeping the elbow at your side.',
    targetAngle: 90,
    sets: 3,
    reps: 12,
    tracking: 'shoulder',
    cues: ['Keep your elbow pinned to your side', 'Rotate the forearm, not your torso'],
    clinicalReview: PROVISIONAL_CLINICAL_REVIEW,
    pilotTuning: DEFAULT_PILOT_TUNING,
    safety: DEFAULT_SAFETY_RULES,
  },
  {
    id: 'sh_04',
    name: 'Shoulder Internal Rotation',
    bodyArea: 'Rotator cuff',
    description: 'Rotate the forearm inward while keeping hips and torso forward.',
    targetAngle: 70,
    sets: 3,
    reps: 12,
    tracking: 'shoulder',
    cues: ['Keep your torso facing forward', 'Keep your elbow fixed at your side'],
    clinicalReview: PROVISIONAL_CLINICAL_REVIEW,
    pilotTuning: DEFAULT_PILOT_TUNING,
    safety: DEFAULT_SAFETY_RULES,
  },
  {
    id: 'sh_05',
    name: 'Pendulum Swing',
    bodyArea: 'Shoulder mobility',
    description: 'Let the arm hang loose and trace small controlled circles.',
    targetAngle: 30,
    sets: 2,
    reps: 10,
    tracking: 'shoulder',
    cues: ['Let the arm hang loose', 'Use small controlled circles'],
    clinicalReview: PROVISIONAL_CLINICAL_REVIEW,
    pilotTuning: DEFAULT_PILOT_TUNING,
    safety: DEFAULT_SAFETY_RULES,
  },
];

export const KNEE_EXERCISES: ExerciseDefinition[] = [
  {
    id: 'kn_01',
    name: 'Quadriceps Set',
    bodyArea: 'Knee and quadriceps',
    description: 'Straighten the knee and tighten the thigh without lifting the leg.',
    targetAngle: 0,
    sets: 4,
    reps: 10,
    tracking: 'knee',
    cues: ['Press the back of your knee down', 'Hold, then fully relax'],
    clinicalReview: PROVISIONAL_CLINICAL_REVIEW,
    pilotTuning: DEFAULT_PILOT_TUNING,
    safety: DEFAULT_SAFETY_RULES,
  },
  {
    id: 'kn_02',
    name: 'Straight Leg Raise',
    bodyArea: 'Knee and hip',
    description: 'Keep the knee locked straight while lifting and lowering slowly.',
    targetAngle: 45,
    sets: 3,
    reps: 10,
    tracking: 'knee',
    cues: ['Lock the knee straight before lifting', 'Lower slowly and do not let the leg drop'],
    clinicalReview: PROVISIONAL_CLINICAL_REVIEW,
    pilotTuning: DEFAULT_PILOT_TUNING,
    safety: DEFAULT_SAFETY_RULES,
  },
  {
    id: 'kn_03',
    name: 'Knee Flexion (Heel Slide)',
    bodyArea: 'Knee mobility',
    description: 'Slide the heel inward to bend the knee through a comfortable range.',
    targetAngle: 120,
    sets: 3,
    reps: 10,
    tracking: 'knee',
    cues: ['Slide slowly and evenly', 'Stop at tightness, not sharp pain'],
    clinicalReview: PROVISIONAL_CLINICAL_REVIEW,
    pilotTuning: DEFAULT_PILOT_TUNING,
    safety: DEFAULT_SAFETY_RULES,
  },
  {
    id: 'kn_04',
    name: 'Mini Squat / Wall Sit',
    bodyArea: 'Knee and gluteals',
    description: 'Bend both knees with even weight and knees tracking over the feet.',
    targetAngle: 45,
    sets: 3,
    reps: 10,
    tracking: 'knee',
    cues: ['Keep your knees over your toes', 'Keep your weight even on both feet'],
    clinicalReview: PROVISIONAL_CLINICAL_REVIEW,
    pilotTuning: DEFAULT_PILOT_TUNING,
    safety: DEFAULT_SAFETY_RULES,
  },
  {
    id: 'kn_05',
    name: 'Standing Single-Leg Balance',
    bodyArea: 'Knee and ankle balance',
    description: 'Balance on one leg with a soft knee and level hips.',
    targetAngle: 15,
    sets: 3,
    reps: 6,
    tracking: 'balance',
    cues: ['Keep a soft bend in your knee', 'Keep your hips level'],
    clinicalReview: PROVISIONAL_CLINICAL_REVIEW,
    pilotTuning: DEFAULT_PILOT_TUNING,
    safety: DEFAULT_SAFETY_RULES,
  },
  {
    id: 'kn_06',
    name: 'Step-Up',
    bodyArea: 'Knee and hip',
    description: 'Step onto a low platform and control the return to the floor.',
    targetAngle: 90,
    sets: 3,
    reps: 10,
    tracking: 'knee',
    cues: ['Control the step down', 'Keep your knee aligned over your foot'],
    clinicalReview: PROVISIONAL_CLINICAL_REVIEW,
    pilotTuning: DEFAULT_PILOT_TUNING,
    safety: DEFAULT_SAFETY_RULES,
  },
];

export const EXERCISE_LIBRARY = [...SHOULDER_EXERCISES, ...KNEE_EXERCISES];

export function getExercise(name: string): ExerciseDefinition {
  return EXERCISE_LIBRARY.find((exercise) => exercise.name === name) ?? SHOULDER_EXERCISES[0];
}

export const SPORT_PROFILES = [
  {
    id: 'football',
    name: 'Football / Soccer',
    screening: 'Observed squat, jump-landing and change-of-direction movement patterns',
    instruction: 'Perform three controlled squats, then two soft jump landings.',
    exercises: [
      'Straight Ahead', 'Hip Out', 'Hip In', 'Circling Partner',
      'Jumping with Shoulder Contact', 'Quick Forwards and Backwards Sprints',
      'The Bench', 'Sideways Bench', 'Hamstrings', 'Single-Leg Stance',
      'Squats', 'Jumping', 'Across the Pitch', 'Bounding', 'Plant and Cut',
    ],
    recommendation: 'Consider discussing FIFA 11+ single-leg stance, squats and jumping with a qualified professional before adding them to a warm-up.',
  },
  {
    id: 'basketball',
    name: 'Basketball',
    screening: 'Observed vertical landing, lateral control and knee-over-toe movement patterns',
    instruction: 'Perform three vertical jumps and land softly with knees aligned.',
    exercises: ['Vertical Jump Landing', 'Lateral Jump', 'Single-Leg Balance', 'Mini Squat'],
    recommendation: 'Consider practising soft landing mechanics, lateral hip strength and knee-over-toe control with qualified coaching.',
  },
  {
    id: 'running',
    name: 'Running / Athletics',
    screening: 'Observed single-leg balance, hip stability and squat symmetry',
    instruction: 'Hold a single-leg stance, then perform three shallow single-leg squats.',
    exercises: ['Single-Leg Balance', 'Single-Leg Squat', 'Step-Up', 'Hip Stability'],
    recommendation: 'Consider single-leg balance, hip stability and controlled step-down work before running, subject to qualified review.',
  },
  {
    id: 'general',
    name: 'General Fitness',
    screening: 'Observed bodyweight squat mobility, symmetry and torso control',
    instruction: 'Perform three slow bodyweight squats while facing the camera.',
    exercises: ['Bodyweight Squat', 'Mini Squat', 'Standing Balance'],
    recommendation: 'Consider building squat control with even weight, level hips and knees aligned over the feet.',
  },
] as const;