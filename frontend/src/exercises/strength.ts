// Exercises added from the live-tracking research (reports/Live tracked rehab exercises.md):
// push-ups from the wall to the knees, the 30-second chair stand, the chair-supported Otago
// strength set and scaption. Each needs only a wall or a chair.
import { FULL_BODY, LM } from '../pose/landmarks';
import { sitToStand } from './knee';
import { shoulderAbduction } from './shoulder';
import type { ExerciseConfig } from './types';

const pushUpCues = (intro: string): ExerciseConfig['cues'] => ({
  intro,
  onRaising: 'pushup_down',
  onTop: 'pushup_bottom',
  onLowering: 'pushup_push',
  onRep: 'rep_of',
  faults: {
    body_line: 'pushup_body_straight',
    not_high_enough: 'pushup_lower_more',
  },
  onSetComplete: 'set_complete',
  onSessionComplete: 'session_complete',
});

export const wallPushUp: ExerciseConfig = {
  tracking: 'live',
  id: 'wall_push_up',
  name: 'Wall Push-Up',
  region: 'shoulder',
  kind: 'reps',
  cameraView: 'side',
  description: 'Stand side-on to the camera with your hands on a wall, bend your elbows to bring your chest towards the wall, then push back.',
  steps: [
    'Stand side-on to the camera, an arm’s length from a wall, hands on the wall at shoulder height.',
    'Keep your body straight and bend your elbows to bring your chest towards the wall.',
    'Push back until your arms are straight.',
  ],
  requiredLandmarks: [LM.NOSE],
  primaryAngle: { joint: 'elbow' },
  side: 'auto',
  // Sourced: push-up counters use elbow > 160° up, < 90° down. A wall push-up moves less, so the
  // bottom is set higher. TUNE: target from real wall push-ups.
  startAngle: 155,
  targetAngle: 105,
  defaultSets: 2,
  defaultReps: 10,
  minRepSeconds: 1.0,
  faultRules: ['body_line', 'not_high_enough'],
  bodyLine: 'ankle',
  uprightTorso: false,
  angleLabel: 'Elbow',
  cues: pushUpCues('pushup_wall_intro'),
};

export const kneePushUp: ExerciseConfig = {
  tracking: 'live',
  id: 'knee_push_up',
  name: 'Knee Push-Up',
  region: 'shoulder',
  kind: 'reps',
  cameraView: 'side',
  description: 'On your hands and knees side-on to the camera, keep a straight line from shoulders to knees and lower your chest, then push up.',
  steps: [
    'Put the phone on the floor about 2 metres away and kneel side-on to it, hands under your shoulders.',
    'Keep a straight line from your shoulders to your knees and bend your elbows to lower your chest.',
    'Push back up until your arms are straight.',
  ],
  requiredLandmarks: [],
  primaryAngle: { joint: 'elbow' },
  side: 'auto',
  // Sourced: elbow > 160° up, < 90° down (push-up counters). TUNE: 95° leaves a little room.
  startAngle: 155,
  targetAngle: 95,
  defaultSets: 2,
  defaultReps: 8,
  minRepSeconds: 1.0,
  faultRules: ['body_line', 'not_high_enough'],
  bodyLine: 'knee',
  uprightTorso: false,
  angleLabel: 'Elbow',
  // Lying down, the nose and ankles are almost level, so body height says nothing about distance.
  calibration: { minBodyHeight: 0 },
  cues: pushUpCues('pushup_knee_intro'),
};

export const chairStand30: ExerciseConfig = {
  ...sitToStand,
  id: 'chair_stand_30s',
  name: '30-Second Chair Stand',
  description: 'A strength and balance check: stand up and sit down as many times as you safely can in 30 seconds, arms crossed.',
  steps: [
    'Place a sturdy chair without arms side-on to the camera, against a wall so it cannot slide.',
    'Sit in the middle of the chair with your arms crossed on your chest.',
    'When the count starts, stand up fully and sit down as many times as you can in 30 seconds.',
  ],
  // The test counts every full stand; the target only needs to be out of reach in 30 seconds.
  defaultSets: 1,
  defaultReps: 30,
  timeLimitSeconds: 30,
  cues: {
    ...sitToStand.cues,
    intro: 'chair30_intro',
    onSetComplete: 'chair30_time_up',
    onSessionComplete: 'chair30_time_up',
  },
};

export const seatedKneeExtension: ExerciseConfig = {
  tracking: 'live',
  id: 'seated_knee_extension',
  name: 'Seated Knee Extension',
  region: 'knee',
  kind: 'reps',
  cameraView: 'side',
  description: 'Sit side-on to the camera and straighten the knee nearer the camera, hold, then lower slowly (Otago "front knee strengthening").',
  steps: [
    'Sit tall on a chair side-on to the camera, feet flat on the floor.',
    'Straighten the knee nearer the camera until your leg is out in front, and hold for a moment.',
    'Lower slowly. Turn the chair round to work the other leg.',
  ],
  requiredLandmarks: [LM.NOSE],
  primaryAngle: { joint: 'knee' },
  side: 'auto',
  // TUNE: counted from the person's own seated knee angle (~90–100°) to 65° straighter.
  startAngle: 95,
  targetAngle: 160,
  relativeRange: true,
  holdSeconds: 1,
  defaultSets: 2,
  defaultReps: 10,
  minRepSeconds: 1.5,
  faultRules: ['not_high_enough'],
  angleLabel: 'Knee',
  calibration: { minBodyHeight: 0.4 },
  cues: {
    intro: 'ske_intro',
    onRaising: 'ske_straighten',
    onTop: 'hold',
    onLowering: 'lower_slowly',
    onRep: 'rep_of',
    faults: { not_high_enough: 'ske_straighten_more' },
    onSetComplete: 'set_complete_turn',
    onSessionComplete: 'session_complete',
  },
};

export const standingKneeCurl: ExerciseConfig = {
  tracking: 'live',
  id: 'standing_knee_curl',
  name: 'Standing Knee Curl',
  region: 'knee',
  kind: 'reps',
  cameraView: 'side',
  description: 'Hold a chair, stand side-on to the camera and bend the knee nearer the camera to bring your heel up behind you (Otago "back knee strengthening").',
  steps: [
    'Stand side-on to the camera holding the back of a chair.',
    'Bend the knee nearer the camera to bring your heel up behind you. Keep your thigh pointing down.',
    'Lower slowly. Turn round to work the other leg.',
  ],
  requiredLandmarks: FULL_BODY,
  primaryAngle: { joint: 'knee' },
  side: 'auto',
  // TUNE: counted from the person's own standing knee angle (~170–178° side-on) to 70° bent.
  startAngle: 170,
  targetAngle: 100,
  relativeRange: true,
  defaultSets: 2,
  defaultReps: 10,
  minRepSeconds: 1.2,
  faultRules: ['torso_lean', 'not_high_enough'],
  angleLabel: 'Knee',
  cues: {
    intro: 'kc_intro',
    onRaising: 'kc_bend',
    onTop: 'hold',
    onLowering: 'lower_slowly',
    onRep: 'rep_of',
    faults: { torso_lean: 'keep_torso_upright', not_high_enough: 'kc_bend_more' },
    onSetComplete: 'set_complete_turn',
    onSessionComplete: 'session_complete',
  },
};

export const heelRaise: ExerciseConfig = {
  tracking: 'live',
  id: 'heel_raise',
  name: 'Heel Raise',
  region: 'knee',
  kind: 'reps',
  cameraView: 'side',
  description: 'Hold a chair, rise up onto your toes, then lower your heels slowly (Otago "calf raises").',
  steps: [
    'Stand side-on to the camera holding the back of a chair, feet hip-width apart.',
    'Keep your knees straight and rise up onto your toes.',
    'Lower your heels slowly to the floor.',
  ],
  requiredLandmarks: [...FULL_BODY, LM.L_HEEL, LM.R_HEEL],
  primaryAngle: { metric: 'heelRise' },
  side: 'both',
  // Percent of body height. TUNE: a 4–6 cm rise reads ~2.5–4 % of nose-to-ankle height.
  startAngle: 0,
  targetAngle: 2,
  defaultSets: 2,
  defaultReps: 10,
  minRepSeconds: 1.0,
  faultRules: ['knee_bend', 'not_high_enough'],
  angleLabel: 'Heel lift',
  cues: {
    intro: 'hr_intro',
    onRaising: 'hr_up',
    onTop: 'hold',
    onLowering: 'hr_lower',
    onRep: 'rep_of',
    faults: { knee_bend: 'keep_knees_straight', not_high_enough: 'hr_higher' },
    onSetComplete: 'set_complete',
    onSessionComplete: 'session_complete',
  },
};

export const scaption: ExerciseConfig = {
  ...shoulderAbduction,
  id: 'scaption',
  name: 'Scaption',
  description: 'Raise both arms up and slightly forward, thumbs up, to shoulder height, keeping your shoulders down.',
  steps: [
    'Face the camera, arms by your sides, thumbs pointing forward.',
    'Raise both arms up and slightly forward (halfway between the front and the side) to shoulder height.',
    'Lower slowly, keeping your shoulders down.',
  ],
  // Front camera: the arm's forward angle is hidden, so the same elevation thresholds as abduction.
  cues: { ...shoulderAbduction.cues, intro: 'scap_intro', onRaising: 'scap_raising' },
};

export const STRENGTH: ExerciseConfig[] = [wallPushUp, kneePushUp, chairStand30, seatedKneeExtension, standingKneeCurl, heelRaise, scaption];
