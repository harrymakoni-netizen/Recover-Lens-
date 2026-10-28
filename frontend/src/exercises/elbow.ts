import { LM } from '../pose/landmarks';
import type { ExerciseConfig } from './types';

/**
 * Elbow curl (biceps curl), side-on. Can be done with nothing in the hand or holding a water
 * bottle or dumbbell; the weight feeds the joint-load estimate (pose/effort.ts).
 */
export const elbowCurl: ExerciseConfig = {
  tracking: 'live',
  id: 'elbow_curl',
  name: 'Elbow Curl',
  region: 'elbow',
  kind: 'reps',
  cameraView: 'side',
  description: 'Stand side-on to the camera and bend your elbow to bring your hand up, keeping your upper arm still.',
  steps: [
    'Turn side-on to the camera, arm straight by your side. Hold a water bottle if you like.',
    'Bend your elbow to bring your hand up towards your shoulder.',
    'Lower slowly until your arm is straight again.',
  ],
  requiredLandmarks: [LM.NOSE],
  primaryAngle: { joint: 'elbow' },
  side: 'auto',
  // TUNE: a straight elbow reads about 158–177° on a real person, so depth is measured from the
  // person's own resting angle: a rep is about 95° of bend.
  startAngle: 160,
  targetAngle: 65,
  relativeRange: true,
  defaultSets: 3,
  defaultReps: 10,
  minRepSeconds: 1.0,
  faultRules: ['back_arch', 'not_high_enough'],
  angleLabel: 'Elbow',
  effort: 'elbow',
  cues: {
    intro: 'curl_intro',
    onRaising: 'curl_raising',
    onTop: 'curl_top',
    onLowering: 'curl_lower',
    onRep: 'rep_of',
    faults: {
      back_arch: 'curl_no_swing',
      not_high_enough: 'curl_bend_more',
    },
    onSetComplete: 'set_complete',
    onSessionComplete: 'session_complete',
  },
};
