// Replays a landmark recording through the real SessionEngine and prints what happened, rep by
// rep. Use it to check the computer vision on real people:
//
//   python ../tools/extract_landmarks.py squats.mp4 --exercise mini_squat --reps 5
//   npm run eval -- ../recorded_mini_squat_5reps.json
//
// Options: --exercise <id> (default: from the file), --reps <n> (target; default from the file
// name, else 10), --sets <n>, --side left|right.
import { readFileSync } from 'node:fs';
import { getLiveExercise } from '../src/exercises';
import { decodeLandmarks, decodeWorld, type LandmarkRecording } from '../src/pose/recording';
import { SessionEngine } from '../src/pose/sessionEngine';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!file) {
  console.error('Usage: npm run eval -- <recording.json> [--exercise id] [--reps n] [--sets n] [--side left|right]');
  process.exit(1);
}

const rec = JSON.parse(readFileSync(file, 'utf8')) as LandmarkRecording;
const exerciseId = opt('exercise') ?? rec.exerciseId;
const fromName = /_(\d+)reps\.json$/.exec(file)?.[1];
const targetReps = Number(opt('reps') ?? fromName ?? 10);
const side = opt('side') as 'left' | 'right' | undefined;
const config = getLiveExercise(exerciseId);
const engine = new SessionEngine(config, { targetReps, sets: Number(opt('sets') ?? 1), side });

const t0 = rec.frames[0]?.t ?? 0;
const ts = (t: number) => `${((t - t0) / 1000).toFixed(1).padStart(6)}s`;
let detected = 0;
let minAngle = Infinity;
let maxAngle = -Infinity;
let lastStatus = '';

console.log(`${config.name} · ${rec.frames.length} frames · ${rec.width}x${rec.height} · target ${targetReps} reps${side ? ` · ${side} side` : ''}`);
console.log('─'.repeat(78));
for (const f of rec.frames) {
  const lm = decodeLandmarks(f.lm);
  if (lm) detected += 1;
  const frame = engine.update(lm, f.t, rec.width, rec.height, decodeWorld(f.w));
  if (frame.phase === 'active' && frame.primaryAngle !== null) {
    minAngle = Math.min(minAngle, frame.primaryAngle);
    maxAngle = Math.max(maxAngle, frame.primaryAngle);
  }
  for (const e of frame.events) {
    switch (e.type) {
      case 'calibration':
        console.log(`${ts(f.t)}  calibration: ${e.issue}`);
        break;
      case 'ready':
        console.log(`${ts(f.t)}  calibrated, countdown`);
        break;
      case 'start': {
        const m = frame.metrics;
        console.log(
          `${ts(f.t)}  START  resting angles: shoulder ${m.shoulderL?.toFixed(0)}/${m.shoulderR?.toFixed(0)}°, knee ${m.kneeL?.toFixed(0)}/${m.kneeR?.toFixed(0)}°`,
        );
        break;
      }
      case 'rep':
        console.log(
          `${ts(f.t)}  REP ${e.repNumber}  top ${e.topAngle.toFixed(0)}°  quality ${e.quality.toFixed(0)}  ${e.correct ? 'correct' : 'form issue'}${e.faults.length ? ` (${e.faults.join(', ')})` : ''}  ${e.durationS.toFixed(1)}s`,
        );
        break;
      case 'fault':
        console.log(`${ts(f.t)}    fault: ${e.id}`);
        break;
      case 'turnedBackEarly':
        console.log(`${ts(f.t)}    turned back before the target (partial rep, not counted)`);
        break;
      case 'paused':
        console.log(`${ts(f.t)}  PAUSED (body out of view)`);
        break;
      case 'resumed':
        console.log(`${ts(f.t)}  resumed`);
        break;
      case 'setComplete':
        console.log(`${ts(f.t)}  set ${e.set}/${e.sets} complete`);
        break;
      case 'sessionComplete':
        console.log(`${ts(f.t)}  session complete`);
        break;
      case 'holdStart':
      case 'holdBroken':
      case 'feetDown':
        console.log(`${ts(f.t)}    ${e.type}`);
        break;
    }
  }
  if (frame.phase === 'active' && frame.status !== lastStatus) lastStatus = frame.status;
}

const s = engine.summary();
console.log('─'.repeat(78));
console.log(`Person detected in ${detected}/${rec.frames.length} frames (${((detected / rec.frames.length) * 100).toFixed(0)}%)`);
console.log(`Reps counted: ${s.reps} (${s.correctReps} correct) · target ${targetReps}`);
if (Number.isFinite(minAngle)) console.log(`Primary angle while counting: ${minAngle.toFixed(0)}–${maxAngle.toFixed(0)}°`);
if (s.movementScore !== null) console.log(`Movement score: ${s.movementScore.toFixed(0)} · top fault: ${s.topFault ?? 'none'}`);
if (s.holdRecords.length) console.log(`Holds: ${s.holdRecords.map((h) => `${h.standingSide} ${h.seconds}s`).join(', ')}`);
if (engine.currentPhase !== 'complete' && engine.currentPhase !== 'active') {
  console.log(`Ended in phase "${engine.currentPhase}" — counting never started or was paused.`);
}
