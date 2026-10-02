// Ties camera frames → pose → SessionEngine → voice → canvas, in a requestAnimationFrame loop.
// Per-frame data stays in refs; React state for the HUD updates at most ~10×/s (SPEC §16).
import { useCallback, useEffect, useRef, useState } from 'react';
import { drawSkeleton } from '../components/mirror/drawSkeleton';
import type { ExerciseConfig } from '../exercises/types';
import type { Landmark } from '../pose/landmarks';
import { encodeLandmarks, encodeWorld, type LandmarkRecording, type RecordedFrame } from '../pose/recording';
import { type EngineFrame, type EngineOptions, SessionEngine, type SessionSummary } from '../pose/sessionEngine';
import { cuesForEvents } from '../voice/cues';
import type { CueMode, Lang } from '../voice/phrases';
import { voice } from '../voice/voiceEngine';
import { type LoadedLandmarker, fallbackToCpu } from './usePoseLandmarker';

export type HudState = Omit<EngineFrame, 'events'> & { fps: number; detectMs: number };

interface Args {
  config: ExerciseConfig;
  options: EngineOptions;
  mode: CueMode;
  lang: Lang;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  model: LoadedLandmarker | null;
  onModelReplaced: (model: LoadedLandmarker) => void;
  /** Camera is streaming and the user has started. */
  running: boolean;
  /** Change to start a fresh engine (e.g. next test in a screening battery). */
  sessionKey: string;
}

const HUD_INTERVAL_MS = 100;
const SLOW_DETECT_MS = 40;

export function useSession({
  config, options, mode, lang, videoRef, canvasRef, model, onModelReplaced, running, sessionKey,
}: Args) {
  const engineRef = useRef<SessionEngine | null>(null);
  const engineKeyRef = useRef<string | null>(null);
  if (engineKeyRef.current !== sessionKey) {
    engineRef.current = new SessionEngine(config, options);
    engineKeyRef.current = sessionKey;
  }

  const [hud, setHud] = useState<HudState | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [pill, setPill] = useState('');
  const [recording, setRecording] = useState(false);
  const recordRef = useRef<{ start: number; frames: RecordedFrame[]; width: number; height: number } | null>(null);
  const lastLandmarksRef = useRef<Landmark[] | null>(null);

  // Reset per-session UI state when the engine changes.
  useEffect(() => {
    setSummary(null);
    setHud(null);
    setPill('');
  }, [sessionKey]);

  useEffect(() => voice.onText(setPill), []);
  useEffect(() => {
    voice.lang = lang;
  }, [lang]);

  const cueCtx = useRef({ config, mode, lang, options });
  cueCtx.current = { config, mode, lang, options };

  useEffect(() => {
    if (!running || !model) return;
    const engine = engineRef.current!;
    let raf = 0;
    let lastVideoTime = -1;
    let lastHud = 0;
    let frameNo = 0;
    let detectEma = 0;
    const frameTimes: number[] = [];
    let lastColor: EngineFrame['skeletonColor'] = 'grey';
    let current = model;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return;
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      frameNo += 1;
      // On slow devices detect every second frame; the video itself still plays at full rate.
      if (detectEma > SLOW_DETECT_MS && frameNo % 2 === 0) return;

      const now = performance.now();
      let landmarks: Landmark[] | null = null;
      let world: Landmark[] | null = null;
      try {
        const t0 = performance.now();
        const result = current.landmarker.detectForVideo(video, now);
        detectEma = detectEma ? detectEma * 0.9 + (performance.now() - t0) * 0.1 : performance.now() - t0;
        landmarks = (result.landmarks[0] as Landmark[] | undefined) ?? null;
        world = (result.worldLandmarks[0] as Landmark[] | undefined) ?? null;
      } catch {
        if (current.delegate === 'GPU') {
          stopped = true;
          cancelAnimationFrame(raf);
          void fallbackToCpu().then(onModelReplaced);
        }
        return;
      }
      frameTimes.push(now);
      while (frameTimes.length && now - frameTimes[0] > 1000) frameTimes.shift();
      lastLandmarksRef.current = landmarks;

      const frame = engine.update(landmarks, now, video.videoWidth, video.videoHeight, world);
      drawSkeleton(canvas, landmarks, frame.skeletonColor);

      const rec = recordRef.current;
      if (rec) rec.frames.push({ t: Math.round(now - rec.start), lm: encodeLandmarks(landmarks), w: encodeWorld(world) });

      if (frame.events.length) {
        const { config: cfg, mode: m, lang: l, options: o } = cueCtx.current;
        const cues = cuesForEvents(frame.events, {
          config: cfg,
          mode: m,
          lang: l,
          targetReps: engine.targetReps,
          sets: engine.sets,
          side: o.side,
          holdSeconds: engine.holdSeconds,
        });
        for (const cue of cues) {
          const spoken = voice.speak(cue.text, cue.priority, cue.key, cue.pill);
          // Corrections that were not spoken (cooldown) still show on screen.
          if (!spoken && cue.priority <= 2) voice.setText(cue.pill);
        }
      }

      const forceHud = frame.events.length > 0 || frame.skeletonColor !== lastColor;
      lastColor = frame.skeletonColor;
      if (forceHud || now - lastHud >= HUD_INTERVAL_MS) {
        lastHud = now;
        const { events: _events, ...rest } = frame;
        setHud({ ...rest, fps: frameTimes.length, detectMs: detectEma });
      }
      if (frame.events.some((e) => e.type === 'sessionComplete')) {
        setSummary(engine.summary());
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [running, model, sessionKey, videoRef, canvasRef, onModelReplaced]);

  /** End early (Stop button). Returns the summary of what was done. */
  const finish = useCallback((): SessionSummary => {
    const s = engineRef.current!.summary();
    setSummary(s);
    return s;
  }, []);

  const startRecording = useCallback(() => {
    const video = videoRef.current;
    recordRef.current = {
      start: performance.now(),
      frames: [],
      width: video?.videoWidth ?? 0,
      height: video?.videoHeight ?? 0,
    };
    setRecording(true);
  }, [videoRef]);

  const stopRecording = useCallback(() => {
    const rec = recordRef.current;
    recordRef.current = null;
    setRecording(false);
    if (!rec) return;
    const reps = engineRef.current?.summary().reps ?? 0;
    const data: LandmarkRecording = {
      version: 1,
      exerciseId: config.id,
      source: 'recorded',
      width: rec.width,
      height: rec.height,
      recordedAt: new Date().toISOString(),
      frames: rec.frames,
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `recorded_${config.id}_${reps}reps.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, [config.id]);

  return {
    hud,
    summary,
    pill,
    finish,
    engine: engineRef.current!,
    recording,
    startRecording,
    stopRecording,
  };
}
