import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Activity, ArrowLeft, Camera, CircleStop, Info, LoaderCircle, RotateCcw, ShieldAlert, Volume2, X, HeartHandshake } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { useCreateSession } from '@workspace/api-client-react';
import { useRecoverLensAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/locale';
import { getExercise } from '@/lib/exercise-library';

import demoReady from '@assets/04_ready_resting_1788295982281.jpg';
import demoRaise from '@assets/02_keep_torso_centered_1788295982280.jpg';
import demoCorrect from '@assets/03_correct_form_1788295982281.jpg';

type MirrorState =
  | 'READY'
  | 'RAISING'
  | 'KEEP_TORSO_CENTERED'
  | 'CORRECT_FORM'
  | 'HOLD'
  | 'LOWERING'
  | 'GOOD_REP'
  | 'COMPLETE'
  | 'STOPPED';

type Landmark = { x: number; y: number; z?: number; visibility?: number };
type PoseResults = { poseLandmarks?: Landmark[] };
type PoseInstance = {
  setOptions(options: Record<string, unknown>): void;
  onResults(callback: (results: PoseResults) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): Promise<void>;
};

declare global {
  interface Window {
    Pose?: new (options: { locateFile: (file: string) => string }) => PoseInstance;
  }
}

const CONNECTIONS: Array<[number, number]> = [
  [0, 11], [0, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];

const baseInstructions: Record<MirrorState, { title: string; detail: string }> = {
  READY: { title: 'Stand tall and face forward', detail: 'Keep your whole body in frame. Let both arms rest by your sides.' },
  RAISING: { title: 'Raise both arms slowly', detail: 'Lead with your elbows and keep both shoulders level.' },
  KEEP_TORSO_CENTERED: { title: 'Bring your torso back to centre', detail: 'Do not lean to reach higher. Keep your hips beneath your shoulders.' },
  CORRECT_FORM: { title: 'Excellent alignment', detail: 'Both arms are even and your torso is centred. Continue to shoulder height.' },
  HOLD: { title: 'Hold this position', detail: 'Stay still, breathe normally, and keep your shoulders relaxed.' },
  LOWERING: { title: 'Lower with control', detail: 'Bring both arms down together. Do not let them drop.' },
  GOOD_REP: { title: 'Good rep', detail: 'Return to the starting position before beginning the next repetition.' },
  COMPLETE: { title: 'Session complete', detail: 'Your movement report is ready.' },
  STOPPED: { title: 'Session stopped safely', detail: 'No movement target is worth pushing through pain or feeling unsafe.' },
};

const statusColor = (state: MirrorState) =>
  ['CORRECT_FORM', 'HOLD', 'GOOD_REP'].includes(state) ? '#4ADE80' : '#E8C547';

function angle(a: Landmark, b: Landmark, c: Landmark) {
  const ab = Math.atan2(a.y - b.y, a.x - b.x);
  const cb = Math.atan2(c.y - b.y, c.x - b.x);
  let value = Math.abs((ab - cb) * (180 / Math.PI));
  if (value > 180) value = 360 - value;
  return value;
}

function loadPoseRuntime(): Promise<void> {
  if (window.Pose) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-mediapipe-pose]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Pose runtime failed')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
    script.async = true;
    script.dataset.mediapipePose = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Pose runtime failed'));
    document.head.appendChild(script);
  });
}

export default function LiveMirror() {
  const { t } = useLocale();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const { selectedPatientId: patientId } = useRecoverLensAuth();
  const exerciseParam = searchParams.get('exercise') || 'Shoulder Abduction';
  const isCaregiverMode = searchParams.get('mode') === 'caregiver-assisted';
  const exercise = useMemo(() => getExercise(exerciseParam), [exerciseParam]);
  const targetReps = exercise.reps;
  const jointLabel = exercise.tracking === 'shoulder' ? 'Shoulder' : 'Knee';
  const instructions = useMemo<Record<MirrorState, { title: string; detail: string; voice: string }>>(() => ({
    ...baseInstructions,
    READY: { title: 'Set your starting position', detail: `${exercise.name}: ${exercise.description}`, voice: `Get ready for ${exercise.name}. ${exercise.description}` },
    RAISING: { title: exercise.cues[0], detail: `Move toward the ${exercise.targetAngle}° target slowly and evenly.`, voice: `${exercise.name}. ${exercise.cues[0]}. Move toward ${exercise.targetAngle} degrees.` },
    KEEP_TORSO_CENTERED: { title: exercise.cues[1] ?? 'Keep your body facing forward', detail: 'Straighten your torso and keep your hips level before continuing.', voice: `${exercise.name}. ${exercise.cues[1] ?? 'Keep your body facing forward'}.` },
    CORRECT_FORM: { title: 'Great — keep going', detail: `${exercise.name} is aligned with the prescribed movement.`, voice: `Good ${exercise.name} form. Keep moving with control.` },
    HOLD: { title: 'Hold this position', detail: `Keep the ${jointLabel.toLowerCase()} stable, breathe normally, and maintain your alignment.`, voice: `Hold the ${exercise.name} position. Keep your ${jointLabel.toLowerCase()} stable.` },
    LOWERING: { title: 'Return with control', detail: `Reverse the ${exercise.name.toLowerCase()} slowly without dropping or twisting.`, voice: `Lower slowly to finish the ${exercise.name}.` },
    GOOD_REP: { title: 'Rep complete', detail: 'Return to the starting position before the next repetition.', voice: `Rep complete. Return to the starting position for the next ${exercise.name}.` },
    STOPPED: { ...baseInstructions.STOPPED, voice: baseInstructions.STOPPED.title },
    COMPLETE: { ...baseInstructions.COMPLETE, voice: baseInstructions.COMPLETE.title },
  }), [exercise, jointLabel]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<PoseInstance | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastAngleRef = useRef(0);
  const phaseRef = useRef<'down' | 'up' | 'counted'>('down');
  const holdStartedAtRef = useRef<number | null>(null);
  const lastSpokenRef = useRef('');
  const scoreTotalRef = useRef(0);
  const scoreFramesRef = useRef(0);
  const sessionSavedRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [cameraMode, setCameraMode] = useState<'idle' | 'starting' | 'live' | 'demo'>('idle');
  const [state, setState] = useState<MirrorState>('READY');
  const [reps, setReps] = useState(0);
  const [leftShoulder, setLeftShoulder] = useState(0);
  const [rightShoulder, setRightShoulder] = useState(0);
  const [torso, setTorso] = useState(100);
  const [symmetry, setSymmetry] = useState(100);
  const [movementScore, setMovementScore] = useState(84);
  const [personDetected, setPersonDetected] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [painScore, setPainScore] = useState<number | null>(null);
  const { mutate: saveSession } = useCreateSession();

  const speak = useCallback((next: MirrorState) => {
    if (!voiceOn || lastSpokenRef.current === next || !('speechSynthesis' in window)) return;
    lastSpokenRef.current = next;
    window.speechSynthesis.cancel();
    const message = new SpeechSynthesisUtterance(instructions[next].voice);
    message.rate = 0.95;
    message.pitch = 1;
    window.speechSynthesis.speak(message);
  }, [instructions, voiceOn]);

  const finishSession = useCallback((completedReps: number) => {
    if (sessionSavedRef.current) return;
    sessionSavedRef.current = true;
    setState('COMPLETE');
    const averageScore = scoreFramesRef.current
      ? Math.round(scoreTotalRef.current / scoreFramesRef.current)
      : movementScore;
    saveSession({
      data: {
        patientId: patientId!,
        exercise: exerciseParam,
        totalReps: completedReps,
        correctReps: completedReps,
        averageAngle: Math.round((leftShoulder + rightShoulder) / 2),
        movementScore: averageScore,
        torsoAlignment: torso,
        symmetry,
        painScore: painScore ?? 0,
        mode: isCaregiverMode ? 'caregiver-assisted' : 'self',
        protocolMode: 'pilot-demo',
        recommendation: torso < 90 ? 'Keep torso centred; stop if pain increases.' : 'Continue only within a pain-free range.',
      },
    });
  }, [leftShoulder, movementScore, painScore, rightShoulder, saveSession, symmetry, torso, exerciseParam, isCaregiverMode, patientId]);

  const recordRep = useCallback(() => {
    if (phaseRef.current === 'counted') return;
    phaseRef.current = 'counted';
    holdStartedAtRef.current = null;
    setReps((current) => {
      const next = current + 1;
      if (voiceOn && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const announcement = new SpeechSynthesisUtterance(`Good rep. ${next} of ${targetReps} complete.`);
        announcement.rate = 0.92;
        announcement.pitch = 1.05;
        window.speechSynthesis.speak(announcement);
        lastSpokenRef.current = `REP_${next}`;
      }
      if (next >= targetReps) finishSession(next);
      return next;
    });
  }, [finishSession, targetReps, voiceOn]);

  const stopSession = useCallback(() => {
    if (sessionSavedRef.current) return;
    sessionSavedRef.current = true;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void poseRef.current?.close();
    poseRef.current = null;
    setCameraMode('idle');
    setState('STOPPED');
    saveSession({
      data: {
        patientId: patientId!,
        exercise: exerciseParam,
        totalReps: reps,
        correctReps: reps,
        averageAngle: Math.round((leftShoulder + rightShoulder) / 2),
        movementScore,
        torsoAlignment: torso,
        symmetry,
        painScore: painScore ?? 0,
        mode: isCaregiverMode ? 'caregiver-assisted' : 'self',
        protocolMode: 'pilot-demo',
        recommendation: 'Session stopped for safety. Pause and contact your clinician before resuming.',
      },
    });
  }, [exerciseParam, isCaregiverMode, leftShoulder, movementScore, painScore, reps, rightShoulder, saveSession, symmetry, torso, patientId]);

  const drawPose = useCallback((landmarks: Landmark[], nextState: MirrorState) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const rect = video.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    const point = (landmark: Landmark) => ({
      x: (1 - landmark.x) * rect.width,
      y: landmark.y * rect.height,
    });
    
    // Adjust colors for caregiver mode
    let color = statusColor(nextState);
    if (isCaregiverMode && color === '#4ADE80') {
      color = '#F59E0B'; // Amber for caregiver correct form
    } else if (isCaregiverMode && color === '#E8C547') {
      color = '#0D9488'; // Teal for warning in caregiver mode
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    CONNECTIONS.forEach(([from, to]) => {
      const a = landmarks[from];
      const b = landmarks[to];
      if (!a || !b || (a.visibility ?? 1) < 0.45 || (b.visibility ?? 1) < 0.45) return;
      const start = point(a);
      const end = point(b);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });
    ctx.shadowBlur = 5;
    landmarks.forEach((landmark, index) => {
      if (![0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(index)) return;
      if ((landmark.visibility ?? 1) < 0.45) return;
      const p = point(landmark);
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    const shoulderMid = point({
      x: (landmarks[11].x + landmarks[12].x) / 2,
      y: (landmarks[11].y + landmarks[12].y) / 2,
    });
    const hipMid = point({
      x: (landmarks[23].x + landmarks[24].x) / 2,
      y: (landmarks[23].y + landmarks[24].y) / 2,
    });
    const label = nextState === 'KEEP_TORSO_CENTERED' ? 'CENTRE TORSO' : nextState === 'HOLD' ? 'HOLD' : 'FORM TRACKED';
    ctx.shadowBlur = 0;
    ctx.font = '700 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    const width = ctx.measureText(label).width + 24;
    ctx.fillStyle = 'rgba(7, 12, 18, .82)';
    ctx.fillRect(shoulderMid.x - width / 2, shoulderMid.y - 42, width, 28);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(shoulderMid.x - width / 2, shoulderMid.y - 42, width, 28);
    ctx.fillStyle = color;
    ctx.fillText(label, shoulderMid.x, shoulderMid.y - 23);
    ctx.beginPath();
    ctx.moveTo(shoulderMid.x, shoulderMid.y - 14);
    ctx.lineTo(hipMid.x, hipMid.y);
    ctx.stroke();
  }, [isCaregiverMode]);

  const analyzePose = useCallback((results: PoseResults) => {
    const landmarks = results.poseLandmarks;
    if (!landmarks || landmarks.length < 29) {
      setPersonDetected(false);
      canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      return;
    }
    setPersonDetected(true);
    const leftShoulderAngle = Math.max(0, 180 - angle(landmarks[13], landmarks[11], landmarks[23]));
    const rightShoulderAngle = Math.max(0, 180 - angle(landmarks[14], landmarks[12], landmarks[24]));
    const leftKneeAngle = Math.max(0, 180 - angle(landmarks[23], landmarks[25], landmarks[27]));
    const rightKneeAngle = Math.max(0, 180 - angle(landmarks[24], landmarks[26], landmarks[28]));
    const left = exercise.tracking === 'shoulder' ? leftShoulderAngle : leftKneeAngle;
    const right = exercise.tracking === 'shoulder' ? rightShoulderAngle : rightKneeAngle;
    const average = (left + right) / 2;
    const shoulderMidX = (landmarks[11].x + landmarks[12].x) / 2;
    const hipMidX = (landmarks[23].x + landmarks[24].x) / 2;
    const lean = Math.abs(shoulderMidX - hipMidX);
    const nextTorso = Math.max(0, Math.round(100 - lean * 420));
    const nextSymmetry = Math.max(0, Math.round(100 - Math.abs(left - right) * 2));
    const targetDifference = Math.abs(exercise.targetAngle - Math.min(average, exercise.targetAngle));
    const targetScore = Math.max(0, 100 - targetDifference * 0.8);
    const nextScore = Math.round(Math.max(0, Math.min(100, nextTorso * 0.36 + nextSymmetry * 0.34 + targetScore * 0.3)));
    const rising = average > lastAngleRef.current + 1.5;
    const lowering = average < lastAngleRef.current - 1.5;
    let nextState: MirrorState = state;
    
    // In caregiver mode, we could relax tolerances.
    const torsoTolerance = isCaregiverMode
      ? Math.max(75, exercise.pilotTuning.torsoScoreMinimum - 8)
      : exercise.pilotTuning.torsoScoreMinimum;
    
    const startThreshold = Math.max(8, exercise.targetAngle * 0.2);
    const holdThreshold = Math.max(startThreshold + 5, exercise.targetAngle * exercise.pilotTuning.holdThresholdPercent);
    if (nextTorso < torsoTolerance && average > startThreshold) nextState = 'KEEP_TORSO_CENTERED';
    else if (average < startThreshold) {
      if (phaseRef.current === 'up') recordRep();
      nextState = phaseRef.current === 'counted' ? 'GOOD_REP' : 'READY';
      if (phaseRef.current === 'counted') phaseRef.current = 'down';
      holdStartedAtRef.current = null;
    }
    else if (average < holdThreshold) nextState = rising ? 'RAISING' : lowering ? 'LOWERING' : 'CORRECT_FORM';
    else if (Math.abs(left - right) > exercise.pilotTuning.symmetryToleranceDegrees) nextState = 'KEEP_TORSO_CENTERED';
    else if (average >= holdThreshold) nextState = 'HOLD';
    else nextState = 'CORRECT_FORM';

    if (nextState === 'HOLD' && phaseRef.current === 'down') {
      phaseRef.current = 'up';
      holdStartedAtRef.current = performance.now();
    } else if (
      nextState === 'HOLD' &&
      phaseRef.current === 'up' &&
      holdStartedAtRef.current !== null &&
      performance.now() - holdStartedAtRef.current >= 700 &&
      nextScore >= 75
    ) {
      recordRep();
    }
    lastAngleRef.current = average;
    setState(nextState);
    setLeftShoulder(Math.round(left));
    setRightShoulder(Math.round(right));
    setTorso(nextTorso);
    setSymmetry(nextSymmetry);
    setMovementScore(nextScore);
    scoreTotalRef.current += nextScore;
    scoreFramesRef.current += 1;
    drawPose(landmarks, nextState);
    speak(nextState);
  }, [drawPose, exercise, recordRep, speak, state, isCaregiverMode]);

  const startSession = useCallback(async () => {
    if (painScore !== null && painScore >= 4) return;
    sessionSavedRef.current = false;
    setStarted(true);
    setCameraMode('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Camera view unavailable');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraMode('live');
      await loadPoseRuntime();
      if (!window.Pose) throw new Error('Pose runtime unavailable');
      const pose = new window.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      pose.onResults(analyzePose);
      poseRef.current = pose;
      const processFrame = async () => {
        const video = videoRef.current;
        if (video?.readyState === 4 && video.videoWidth > 0 && video.videoHeight > 0 && poseRef.current) {
          try {
            await poseRef.current.send({ image: video });
          } catch {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            void poseRef.current?.close();
            poseRef.current = null;
            setCameraMode('demo');
            return;
          }
        }
        frameRef.current = requestAnimationFrame(processFrame);
      };
      frameRef.current = requestAnimationFrame(processFrame);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraMode('demo');
    }
  }, [analyzePose, painScore]);

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void poseRef.current?.close();
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    if (!started || cameraMode !== 'demo' || state === 'COMPLETE' || state === 'STOPPED') return;
    const sequence: MirrorState[] = ['READY', 'RAISING', 'KEEP_TORSO_CENTERED', 'CORRECT_FORM', 'HOLD', 'LOWERING', 'GOOD_REP'];
    const timeout = window.setTimeout(() => {
      const index = sequence.indexOf(state);
      const next = sequence[(index + 1) % sequence.length];
      if (state === 'HOLD') {
        phaseRef.current = 'up';
        recordRep();
      }
      if (next === 'RAISING') {
        phaseRef.current = 'down';
      }
      setState(next);
      speak(next);
      const atTop = ['KEEP_TORSO_CENTERED', 'CORRECT_FORM', 'HOLD'].includes(next);
      setLeftShoulder(atTop ? 89 : next === 'RAISING' ? 48 : 8);
      setRightShoulder(atTop ? 91 : next === 'RAISING' ? 46 : 9);
      setTorso(next === 'KEEP_TORSO_CENTERED' ? 78 : 97);
      setSymmetry(next === 'KEEP_TORSO_CENTERED' ? 89 : 98);
      setMovementScore(next === 'KEEP_TORSO_CENTERED' ? 71 : atTop ? 96 : 86);
    }, state === 'HOLD' ? 2200 : 1700);
    return () => window.clearTimeout(timeout);
  }, [cameraMode, recordRep, speak, started, state]);

  if (state === 'COMPLETE' || state === 'STOPPED') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090d0b] p-5 text-white">
        <section className="w-full max-w-2xl border border-white/15 bg-[#101511] p-8 shadow-2xl md:p-12">
          <p className="mb-2 font-mono text-xs uppercase tracking-[.28em] text-white/45">RecoverLens movement report</p>
          <h1 className={`mb-10 text-3xl font-bold md:text-4xl ${state === 'STOPPED' ? 'text-[#F59E0B]' : 'text-[#4ADE80]'}`}>
            {state === 'STOPPED' ? 'SESSION STOPPED' : 'SESSION COMPLETE'}
          </h1>
          <div className="grid grid-cols-[1fr_auto] gap-x-8 gap-y-4 text-base">
            <span className="text-white/55">Exercise</span><strong>{exercise.name}</strong>
            <span className="text-white/55">Total Reps</span><strong>{reps}</strong>
            <span className="text-white/55">Correct Reps</span><strong>{reps}</strong>
            <span className="text-white/55">Average {jointLabel} Angle</span><strong>{Math.round((leftShoulder + rightShoulder) / 2)} deg</strong>
            <span className="text-white/55">Movement Score</span><strong>{movementScore}%</strong>
            <span className="text-white/55">Safety note</span><strong>{state === 'STOPPED' ? 'Pause and contact your clinician before resuming.' : 'Continue only within a pain-free range.'}</strong>
          </div>
          <Button className="mt-10" onClick={() => setLocation('/')}><ArrowLeft className="mr-2 h-4 w-4" />Return home</Button>
        </section>
      </div>
    );
  }

  const demoImage = ['CORRECT_FORM', 'HOLD'].includes(state) ? demoCorrect : state === 'READY' ? demoReady : demoRaise;
  
  const uiThemeColor = isCaregiverMode ? '#F59E0B' : '#37D8C4'; // Amber vs Teal

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black text-white">
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4 md:p-6">
          <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/15" onClick={() => setLocation('/')} aria-label="Exit live session">
          <X className="h-7 w-7" />
        </Button>
        
        {isCaregiverMode && (
          <div className="flex items-center gap-2 rounded-full border border-amber/50 bg-amber/20 px-4 py-1.5 font-bold tracking-widest text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <HeartHandshake className="h-5 w-5" />
            <span className="hidden sm:inline">CAREGIVER MODE</span>
          </div>
        )}
        
          <div className="flex items-center gap-3">
           {started && <Button variant="outline" size="sm" className="border-red-400/50 bg-red-950/50 text-red-100 hover:bg-red-900/70" onClick={stopSession} aria-label="Stop session for safety">
             <CircleStop className="mr-2 h-4 w-4" />Stop safely
           </Button>}
          {started && <div className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 font-mono text-xs tracking-wider hidden sm:flex items-center"><span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />REC</div>}
          <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/15" onClick={() => setVoiceOn((value) => !value)} aria-label="Toggle voice coaching">
            <Volume2 className={`h-5 w-5 ${voiceOn ? 'text-[#4ADE80]' : 'text-white/35'}`} />
          </Button>
        </div>
      </header>

      <main className="relative h-full w-full flex flex-col justify-between">
        <div className="absolute inset-0 z-0">
          <video ref={videoRef} muted playsInline className={`h-full w-full -scale-x-100 object-cover ${cameraMode === 'live' ? 'block' : 'hidden'}`} />
          <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 z-10 h-full w-full ${cameraMode === 'live' ? 'block' : 'hidden'}`} />
          {cameraMode !== 'live' && (
            <img src={demoImage} alt="Guided rehabilitation demonstration" className="h-full w-full object-cover opacity-75" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.18),transparent_45%,rgba(0,0,0,.82))]" />
        </div>

        {!started && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 p-4 md:p-5 backdrop-blur-sm">
            <section className={`w-full max-w-lg border ${isCaregiverMode ? 'border-amber/30' : 'border-white/15'} bg-[#101513]/95 p-6 shadow-2xl md:p-10 rounded-xl overflow-y-auto max-h-full`}>
              <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-full ${isCaregiverMode ? 'bg-amber/10 text-amber' : 'bg-[#4ADE80]/10 text-[#4ADE80]'}`}>
                {isCaregiverMode ? <HeartHandshake className="h-7 w-7" /> : <Camera className="h-7 w-7" />}
              </div>
              <p className={`mb-2 font-mono text-xs uppercase tracking-[.25em] ${isCaregiverMode ? 'text-amber' : 'text-[#4ADE80]'}`}>
                {isCaregiverMode ? 'Caregiver Assisted Session' : 'AI Rehab Mirror'}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                {exercise.name}
              </h1>
              <p className="mt-3 leading-relaxed text-white/70 text-sm md:text-base">
                {isCaregiverMode 
                  ? "Caregiver tracking is active. Assist the patient through the movement. The AI will accommodate hands-on support and wider tolerances."
                  : "RecoverLens will show your camera, place tracking lines directly on your body, measure each movement, and coach you through every repetition."}
              </p>
               <div className="mt-5 rounded-lg border border-amber-400/35 bg-amber-950/30 p-4 text-left text-sm">
                 <div className="flex items-center gap-2 font-semibold text-amber-200"><ShieldAlert className="h-4 w-4" />Safety check before movement</div>
                 <label htmlFor="pain-score" className="mt-3 block text-white/80">Current pain level (0 = none, 10 = worst)</label>
                 <input
                   id="pain-score"
                   type="number"
                   min={0}
                   max={10}
                   step={1}
                   value={painScore ?? ''}
                   onChange={(event) => {
                     const value = Number(event.target.value);
                     setPainScore(event.target.value === '' ? null : Math.max(0, Math.min(10, value)));
                   }}
                   className="mt-2 h-11 w-full rounded-md border border-white/20 bg-black/40 px-3 text-white"
                 />
                 <p className="mt-2 text-xs leading-relaxed text-white/60">
                   0–3: proceed only in a pain-free range. 4–5: pause and ask your clinician before starting. 6–10: do not start; stop and seek clinical guidance.
                 </p>
                 {painScore !== null && painScore >= 4 && (
                   <p className="mt-3 font-semibold text-amber-200">
                     {painScore >= 6 ? 'Do not start this session. Contact your clinician for guidance.' : 'Pause this session and ask your clinician before starting.'}
                   </p>
                 )}
               </div>
              <div className="mt-5 space-y-2 text-sm text-white/70">
                 <p>1. Stand far enough back so full body is visible.</p>
                 <p>2. Keep the camera steady and room well lit.</p>
                 <p>3. Move slowly and follow live instruction.</p>
                 <p>4. Stop safely if pain increases, feels sharp, or you feel dizzy, numb, short of breath, or unsteady.</p>
              </div>
                <p className="mt-4 flex items-start gap-2 text-left text-xs leading-relaxed text-white/55">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Demonstration build — exercise targets are illustrative and not clinically validated for real patient use.
                </p>
                <Button size="lg" disabled={painScore !== null && painScore >= 4} className={`mt-8 w-full ${isCaregiverMode ? 'bg-amber text-amber-foreground hover:bg-amber/90' : 'bg-[#4ADE80] text-black hover:bg-[#6EE79A]'} py-6 text-lg font-bold shadow-lg`} onClick={startSession}>
                  <Camera className="mr-2 h-6 w-6" />{isCaregiverMode ? 'Start Assisted Session' : 'Start Exercise'}
              </Button>
            </section>
          </div>
        )}

        {cameraMode === 'starting' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
            <div className="text-center"><LoaderCircle className={`mx-auto h-9 w-9 animate-spin ${isCaregiverMode ? 'text-amber' : 'text-[#4ADE80]'}`} /><p className="mt-4 font-mono text-sm tracking-wider">STARTING CAMERA & AI TRACKING</p></div>
          </div>
        )}

        {started && (
          <>
            {cameraMode === 'live' && !personDetected && (
              <div className="absolute left-1/2 top-1/2 z-20 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 border border-[#E8C547]/50 bg-black/90 p-6 text-center rounded-xl shadow-2xl">
                <p className="font-bold text-[#E8C547] text-lg">Move back until full body is visible</p>
                <p className="mt-2 text-sm text-white/70">Tracking lines will appear automatically.</p>
              </div>
            )}

            <div className="mirror-overlays relative z-20 mt-auto grid w-full grid-cols-1 gap-2 p-2 sm:grid-cols-2 sm:gap-3 sm:p-3 lg:grid-cols-[minmax(320px,460px)_minmax(280px,400px)] lg:justify-between md:p-6 mb-2">
              <div className="space-y-2">
                <div className={`w-fit max-w-full rounded-md border px-3 py-2 shadow-lg backdrop-blur-md ${isCaregiverMode ? 'border-amber/25 bg-black/80' : 'border-white/10 bg-black/78'}`} role="status" aria-live="polite" data-testid="live-instruction">
                  <p className="font-mono text-[9px] uppercase tracking-[.2em] text-white/45">Live instruction</p>
                  <p className="mt-0.5 text-sm font-semibold leading-tight md:text-base" style={{ color: isCaregiverMode && statusColor(state) === '#4ADE80' ? '#F59E0B' : statusColor(state) }}>
                    {instructions[state].title}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] leading-tight text-white/65 md:text-xs">{instructions[state].detail}</p>
                </div>
                <section className={`border ${isCaregiverMode ? 'border-amber/20 bg-amber/5' : 'border-white/10 bg-black/78'} p-4 backdrop-blur-md rounded-xl shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-xs font-bold tracking-[.18em]" style={{ color: uiThemeColor }}>
                      {isCaregiverMode ? 'CAREGIVER ASSIST' : t('mirror.ai_rehab') || 'AI REHAB'}
                    </p>
                    <p className="mt-1 max-w-[42vw] truncate font-mono text-[9px] text-white/70 sm:max-w-[200px] md:text-xs">{exercise.name}</p>
                  </div>
                  {isCaregiverMode ? <HeartHandshake className="h-6 w-6 text-amber" /> : <Activity className="h-6 w-6 text-[#37D8C4]" />}
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] text-white/50 mb-1">STATUS</p>
                    <p className="text-lg md:text-xl font-bold leading-none uppercase" style={{ color: isCaregiverMode && statusColor(state) === '#4ADE80' ? '#F59E0B' : statusColor(state) }}>{state.replaceAll('_', ' ')}</p>
                  </div>
                  <div className="text-right font-mono text-[10px] md:text-xs">
                    <p className="mb-1 text-white/90">Score <span className="text-lg md:text-xl ml-1">{movementScore}</span><span className="text-white/50">/100</span></p>
                    <p className="text-white/90" data-testid="rep-counter">Rep <span className="text-lg md:text-xl ml-1">{String(reps).padStart(2, '0')}</span><span className="text-white/50">/{String(targetReps).padStart(2, '0')}</span></p>
                  </div>
                </div>
                </section>
              </div>
              
              <section className={`border ${isCaregiverMode ? 'border-amber/20 bg-amber/5' : 'border-white/10 bg-black/78'} p-4 backdrop-blur-md rounded-xl shadow-lg hidden sm:block`}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] md:text-xs font-bold tracking-[.18em]" style={{ color: uiThemeColor }}>LIVE METRICS</p>
                  <span className={`font-mono text-[10px] ${isCaregiverMode ? 'text-amber' : 'text-[#4ADE80]'}`}>{cameraMode === 'live' ? 'TRACKING' : 'DEMO'}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[10px] md:text-xs">
                  <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                    <span className="text-white/60">L Shoulder</span><strong className="text-white/90 text-sm">{leftShoulder}°</strong>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                    <span className="text-white/60">R Shoulder</span><strong className="text-white/90 text-sm">{rightShoulder}°</strong>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                    <span className="text-white/60">Torso Align</span><strong className="text-white/90 text-sm">{torso}%</strong>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                    <span className="text-white/60">Symmetry</span><strong className="text-white/90 text-sm">{symmetry}%</strong>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}

        {cameraMode === 'demo' && started && (
          <Button variant="outline" size="sm" className="absolute right-4 top-20 z-30 border-white/20 bg-black/50 text-white hover:bg-white/10" onClick={startSession}>
            <RotateCcw className="mr-2 h-4 w-4" />Retry camera
          </Button>
        )}
      </main>
    </div>
  );
}