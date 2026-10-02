// Full-screen camera + pose + HUD. Reused by the rehab Mirror, caregiver mode and the sports
// screening battery. Calls onComplete with the summary when the engine finishes.
import { ArrowLeft, RefreshCw, Square, Volume2, VolumeX } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import type { ExerciseConfig } from '../../exercises/types';
import { useCamera } from '../../hooks/useCamera';
import { usePoseLandmarker } from '../../hooks/usePoseLandmarker';
import { useSession } from '../../hooks/useSession';
import { useApp } from '../../lib/appContext';
import type { EngineOptions, SessionSummary } from '../../pose/sessionEngine';
import { pillText } from '../../voice/phrases';
import { voice } from '../../voice/voiceEngine';
import { CameraMessage } from './CameraMessage';
import { CameraView } from './CameraView';
import { CalibrationOverlay, DebugPanel, HudCompactBar, HudMetricsPanel, HudStatusPanel, InstructionPill } from './Hud';

const PORTRAIT_HINT_KEY = 'rl.portraitHintShown';

interface Props {
  config: ExerciseConfig;
  options: EngineOptions;
  caregiver: boolean;
  sessionKey: string;
  debug?: boolean;
  /** Title shown in the status panel (e.g. "Test 2 of 3 · Single-leg balance (left)"). */
  title?: string;
  /** Steps shown on the intro card. */
  steps?: string[];
  onComplete: (summary: SessionSummary) => void;
  /** Stop button: called with what was done so far (null if nothing). */
  onStop: (summary: SessionSummary | null) => void;
  onBack: () => void;
  /** Replace the camera with this (e.g. the summary card). */
  overlay?: ReactNode;
}

export function MirrorSession({
  config, options, caregiver, sessionKey, debug, title, steps, onComplete, onStop, onBack, overlay,
}: Props) {
  const { lang } = useApp();
  const camera = useCamera();
  const pose = usePoseLandmarker();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [muted, setMuted] = useState(voice.muted);
  const [portraitHint, setPortraitHint] = useState(false);
  const startedRef = useRef(false);

  const onModelReplaced = pose.replace;
  const running = camera.status === 'ready' && pose.status === 'ready' && !overlay;
  const session = useSession({
    config,
    options,
    mode: caregiver ? 'caregiver' : 'self',
    lang,
    videoRef: camera.videoRef,
    canvasRef,
    model: pose.model,
    onModelReplaced,
    running,
    sessionKey,
  });

  const start = useCallback(() => {
    voice.unlock();
    startedRef.current = true;
    void camera.start(caregiver ? 'environment' : 'user');
  }, [camera, caregiver]);

  // If the user already tapped Start on Home, speech is unlocked: open the camera directly.
  useEffect(() => {
    if (!startedRef.current && voice.unlocked) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Completion → parent.
  const completedKey = useRef<string | null>(null);
  useEffect(() => {
    if (session.summary && completedKey.current !== sessionKey && session.engine.currentPhase === 'complete') {
      completedKey.current = sessionKey;
      onComplete(session.summary);
    }
  }, [session.summary, session.engine, sessionKey, onComplete]);

  // One-time portrait hint on phones (SPEC §7.2). Never forces landscape.
  useEffect(() => {
    if (camera.status !== 'ready') return;
    const portrait = window.matchMedia('(orientation: portrait) and (max-width: 767px)').matches;
    let shown = false;
    try {
      shown = localStorage.getItem(PORTRAIT_HINT_KEY) === '1';
      if (portrait && !shown) localStorage.setItem(PORTRAIT_HINT_KEY, '1');
    } catch {
      // ignore
    }
    if (portrait && !shown) {
      setPortraitHint(true);
      const id = setTimeout(() => setPortraitHint(false), 6000);
      return () => clearTimeout(id);
    }
  }, [camera.status]);

  // Show the calibration instruction in the pill before anything has been spoken.
  const hud = session.hud;
  const pill =
    hud?.phase === 'calibrating' && hud.calibrationIssue
      ? pillText(`cal_${hud.calibrationIssue}`, {
          lang,
          mode: caregiver ? 'caregiver' : 'self',
        })
      : session.pill;

  const toggleMute = () => {
    voice.setMuted(!muted);
    setMuted(!muted);
  };

  const stop = () => {
    const s = session.finish();
    onStop(s.reps > 0 || s.holdRecords.length > 0 ? s : null);
  };

  const mirrored = camera.facingMode === 'user';
  const showMessage = camera.status !== 'ready' || pose.status === 'error';

  return (
    <div className="fixed inset-0 z-50 select-none bg-black text-white">
      <CameraView videoRef={camera.videoRef} canvasRef={canvasRef} mirrored={mirrored}>
        {hud && !overlay && <CalibrationOverlay hud={hud} />}
      </CameraView>
      {caregiver && <div className="pointer-events-none absolute inset-0 z-10 border-4 border-care" aria-hidden />}

      {/* Top edge: small and translucent */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-2 sm:p-3">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="hud-panel flex h-11 w-11 items-center justify-center rounded-full"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          {caregiver && (
            <span className="rounded-full bg-care px-3 py-1 text-xs font-bold tracking-wider">CAREGIVER MODE</span>
          )}
          {camera.status === 'ready' && (
            <button
              type="button"
              aria-label="Switch camera"
              onClick={() => void camera.switchCamera()}
              className="hud-panel flex h-11 w-11 items-center justify-center rounded-full"
            >
              <RefreshCw size={20} />
            </button>
          )}
          <button
            type="button"
            aria-label={muted ? 'Unmute voice' : 'Mute voice'}
            aria-pressed={muted}
            onClick={toggleMute}
            className="hud-panel flex h-11 w-11 items-center justify-center rounded-full"
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          {camera.status === 'ready' && !overlay && (
            <button
              type="button"
              onClick={stop}
              className="hud-panel flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold"
            >
              <Square size={14} fill="currentColor" /> Stop
            </button>
          )}
        </div>
      </div>

      {debug && hud && pose.model && (
        <DebugPanel
          hud={hud}
          delegate={pose.model.delegate}
          recording={session.recording}
          onRecord={session.recording ? session.stopRecording : session.startRecording}
        />
      )}

      {portraitHint && (
        <div className="hud-panel absolute inset-x-4 top-16 z-30 rounded-xl px-4 py-3 text-center text-sm">
          Turn your phone sideways or step back so your whole body fits.
        </div>
      )}

      {/* Bottom HUD */}
      {hud && !overlay && camera.status === 'ready' && (
        <div className="pb-safe absolute inset-x-0 bottom-0 z-20 p-2 sm:p-4">
          {/* < 640 px wide (or a short landscape phone): pill + one merged bar */}
          <div className="space-y-2 roomy:hidden">
            <InstructionPill text={pill} color={hud.skeletonColor} countdown={hud.phase === 'countdown' ? hud.countdown : null} />
            <HudCompactBar hud={hud} config={config} caregiver={caregiver} />
          </div>
          {/* Otherwise: pill above the status panel (left), metrics (right) */}
          <div className="hidden items-end justify-between gap-4 roomy:flex">
            <div className="flex min-w-0 flex-col items-start gap-2">
              <InstructionPill text={pill} color={hud.skeletonColor} countdown={hud.phase === 'countdown' ? hud.countdown : null} />
              <HudStatusPanel hud={hud} config={config} caregiver={caregiver} title={title} />
            </div>
            <HudMetricsPanel hud={hud} config={config} />
          </div>
        </div>
      )}

      {camera.status === 'ready' && pose.status === 'loading' && (
        <div className="hud-panel absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-sm">
          Loading pose model…
        </div>
      )}

      {showMessage && (
        <CameraMessage
          status={pose.status === 'error' && camera.status === 'ready' ? 'error' : camera.status === 'idle' ? 'intro' : camera.status}
          exerciseName={config.name}
          steps={steps ?? config.steps}
          onStart={start}
          onRetry={start}
          caregiver={caregiver}
          modelError={pose.error}
        />
      )}

      {overlay && <div className="absolute inset-0 z-40 overflow-y-auto bg-[#0b0d10]">{overlay}</div>}
    </div>
  );
}
