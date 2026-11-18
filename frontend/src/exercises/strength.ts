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
  armsOnChest: true,
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

/**
 * Seated reach-to-target (SPEC §17.12): the wrist moves into a target circle drawn on the video, holds
 * for a moment and returns. Reach is measured against torso size, so it does not depend on how far
 * the person sits from the camera. A MediaPipe study showed reaching after stroke can be tracked in
 * seven people; this is a prototype for local validation, not a validated measure.
 */
export const seatedReach: ExerciseConfig = {
  tracking: 'live',
  id: 'seated_reach',
  name: 'Seated Reach',
  region: 'shoulder',
  kind: 'reps',
  cameraView: 'side',
  description: 'Sit side-on to the camera and reach your hand into the target circle on the screen, hold for a moment, then bring it back.',
  steps: [
    'Sit tall on a sturdy chair side-on to the camera, hands in your lap. Your shoulder, arm and hip must be in view.',
    'First reach forward as far as is comfortable: the target is set from this practice reach.',
    'Reach your hand into the circle, hold for a moment, then bring it back slowly. Keep your back upright.',
  ],
  requiredLandmarks: [LM.NOSE],
  requiredJoints: ['shoulder', 'elbow', 'wrist', 'hip'],
  // Progress towards the target circle, 0–100 % (0 = hand at rest, 100 = inside the circle).
  primaryAngle: { metric: 'reach' },
  side: 'auto',
  startAngle: 0,
  targetAngle: 100,
  holdSeconds: 1,
  defaultSets: 2,
  defaultReps: 8,
  minRepSeconds: 1.5,
  faultRules: ['trunk_lean', 'not_high_enough'],
  angleLabel: 'Reach',
  // Seated: the lower body is not needed, and the body looks short.
  calibration: { minBodyHeight: 0, maxBodyHeight: 2 },
  // TUNE: every number below needs local validation. 100 % = a straight arm at shoulder height is
  // about 120 % of torso length for most adults; the practice reach replaces the default target.
  reach: { targetPct: 100, targetDropPct: 0, radiusPct: 22, minPct: 55, maxPct: 130, practiceSeconds: 5 },
  cues: {
    intro: 'reach_intro',
    onRaising: 'reach_out',
    onTop: 'hold',
    onLowering: 'reach_back',
    onRep: 'rep_of',
    faults: { trunk_lean: 'reach_keep_back', not_high_enough: 'reach_further' },
    onSetComplete: 'set_complete',
    onSessionComplete: 'session_complete',
  },
};

/**
 * Wall sit (hold): time within a knee-angle band. The clinician sets the angle to hold; the timer
 * pauses, never resets, when the knee leaves the band. Contact with the wall is not measured: the
 * person is asked to keep their back flat on it, and the torso-lean observation checks the posture.
 */
export const wallSit: ExerciseConfig = {
  tracking: 'live',
  id: 'wall_sit',
  name: 'Wall Sit',
  region: 'knee',
  kind: 'hold',
  cameraView: 'side',
  description: 'Slide down a wall until your knees are bent to about a right angle, hold, then slide back up.',
  steps: [
    'Stand side-on to the camera with your back flat against a wall and your feet a step in front of you.',
    'Slide down until your knees are bent to about a right angle. Keep your back on the wall.',
    'Hold, breathing normally, then slide back up to rest.',
  ],
  requiredLandmarks: [LM.NOSE],
  side: 'auto',
  startAngle: 0,
  targetAngle: 0,
  // TUNE: 90° ± 12° is a starting band; the clinician sets the angle that suits the patient.
  holdGate: { joint: 'knee', centerDeg: 90, halfWidthDeg: 12, standingDeg: 150 },
  programTarget: { default: 90, min: 60, max: 130 },
  holdSeconds: 30,
  defaultSets: 2,
  defaultReps: 1,
  minRepSeconds: 0,
  faultRules: ['torso_lean'],
  angleLabel: 'Knee',
  calibration: { minBodyHeight: 0.4 },
  cues: {
    intro: 'ws_intro',
    onRaising: 'ws_slide_up',
    onTop: 'ws_holding',
    onLowering: 'ws_holding',
    onRep: 'ws_done',
    faults: { torso_lean: 'ws_back' },
    onSetComplete: 'ws_rest',
    onSessionComplete: 'session_complete',
  },
};

/**
 * Lateral step-down: stand on a step on one leg, bend that knee to lower the other heel towards
 * the floor, then push back up. Measures control on the way down (timed) and how far the free heel
 * lowers; knee drift is an observation. Front view. Which leg is on the step is chosen on the intro.
 */
export const lateralStepDown: ExerciseConfig = {
  tracking: 'live',
  id: 'lateral_step_down',
  name: 'Lateral Step-Down',
  region: 'knee',
  kind: 'reps',
  cameraView: 'front',
  description: 'Stand on a low step on one leg. Bend that knee slowly to lower the other heel towards the floor, then push back up.',
  steps: [
    'Face the camera, standing on a low step on one leg, with a wall or chair beside you for balance.',
    'Bend the standing knee slowly (about two seconds) to lower the other heel towards the floor.',
    'Push back up through the standing leg. Choose the leg on the step before you start.',
  ],
  requiredLandmarks: FULL_BODY,
  chooseSide: true,
  primaryAngle: { metric: 'freeLegLower' },
  side: 'auto',
  // TUNE: percent of body height the free heel lowers (a 10 cm step is about 6 %). The clinician can set it.
  startAngle: 0,
  targetAngle: 4,
  programTarget: { default: 4, min: 2, max: 10 },
  // TUNE: time from the start of the lowering to the heel nearly touching (25 %→90 % of the range), so a
  // steady two-second lowering reads about 1.3 s. A descent faster than this gets a "slower" cue; the rep still counts.
  minDescentSeconds: 1,
  holdSeconds: 0,
  defaultSets: 2,
  defaultReps: 8,
  minRepSeconds: 1,
  faultRules: ['knee_valgus', 'pelvis_drop', 'not_high_enough'],
  angleLabel: 'Heel lowering',
  cues: {
    intro: 'sd_intro',
    onRaising: 'sd_lower',
    onTop: 'sd_touch',
    onLowering: 'sd_up',
    onRep: 'rep_of',
    faults: { knee_valgus: 'knee_over_toes_single', pelvis_drop: 'keep_hips_level', not_high_enough: 'sd_lower_more' },
    onSetComplete: 'set_complete',
    onSessionComplete: 'session_complete',
    onTooFast: 'sd_slower',
  },
};

/**
 * Knee-to-wall ankle mobility, low side view. Progress is the forward tilt of the shin in degrees
 * with the heel down. A knee-to-wall distance in centimetres would need a calibrated distance
 * reference, so this reports degrees only, and only for a consistent camera set-up.
 */
export const kneeToWall: ExerciseConfig = {
  tracking: 'live',
  id: 'knee_to_wall',
  name: 'Knee-to-Wall',
  region: 'knee',
  kind: 'reps',
  cameraView: 'side',
  description: 'Stand facing a wall with one foot forward. Keeping your heel down, bring your knee forward towards the wall, then return.',
  steps: [
    'Put the phone on the floor 1.5–2 metres away, side-on to you. Your hip, knee, ankle and foot must be in view.',
    'Stand facing the wall, front foot a hand’s width from it. Keep the front heel down and bring your knee forward towards the wall.',
    'Hold for a moment, then return. Choose the leg you are testing before you start.',
  ],
  requiredLandmarks: [],
  requiredJoints: ['hip', 'knee', 'ankle', 'heel', 'foot'],
  chooseSide: true,
  primaryAngle: { metric: 'shinTilt' },
  side: 'auto',
  // TUNE: degrees of forward shin tilt from vertical. 30° is a starting target; the clinician sets it.
  startAngle: 8,
  targetAngle: 30,
  programTarget: { default: 30, min: 15, max: 55 },
  holdSeconds: 1,
  defaultSets: 2,
  defaultReps: 8,
  minRepSeconds: 1.5,
  faultRules: ['heel_rise', 'not_high_enough'],
  heelCheck: 'tracked',
  angleLabel: 'Shin tilt',
  calibration: { minBodyHeight: 0, maxBodyHeight: 3 },
  cues: {
    intro: 'ktw_intro',
    onRaising: 'ktw_forward',
    onTop: 'hold',
    onLowering: 'ktw_back',
    onRep: 'rep_of',
    faults: { heel_rise: 'keep_heels_down', not_high_enough: 'ktw_further' },
    onSetComplete: 'set_complete',
    onSessionComplete: 'session_complete',
  },
};

export const STRENGTH: ExerciseConfig[] = [
  wallPushUp, kneePushUp, chairStand30, seatedKneeExtension, standingKneeCurl, heelRaise, scaption, seatedReach,
  wallSit, lateralStepDown, kneeToWall,
];
