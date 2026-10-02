// Guided timer mode (SPEC §4.1): on-screen steps + voice + timer, no scoring. Used for exercises a
// single 2D camera cannot measure reliably (rotations, pendulum, lying exercises).
import { ArrowLeft, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { GuidedExerciseConfig } from '../../exercises/types';
import { useApp } from '../../lib/appContext';
import { cn } from '../../lib/format';
import type { SessionSummary } from '../../pose/sessionEngine';
import { phrase } from '../../voice/phrases';
import { voice } from '../../voice/voiceEngine';
import { Button } from '../ui';

const REST_S = 15;

interface Props {
  config: GuidedExerciseConfig;
  reps: number;
  sets: number;
  caregiver: boolean;
  onComplete: (summary: SessionSummary) => void;
  onBack: () => void;
}

export function GuidedSession({ config, reps, sets, caregiver, onComplete, onBack }: Props) {
  const { lang } = useApp();
  const mode = caregiver ? 'caregiver' : 'self';
  const [running, setRunning] = useState(false);
  const [, setVersion] = useState(0);
  const [muted, setMuted] = useState(voice.muted);
  // Timer state lives in a ref; React state only triggers a re-render each second.
  const t = useRef({ rep: 0, set: 1, elapsed: 0, resting: 0, total: 0, started: null as number | null, done: false });

  const finish = () => {
    const s = t.current;
    if (s.done) return;
    s.done = true;
    setRunning(false);
    voice.speak(phrase('session_complete', { lang, mode }), 1);
    onComplete({
      exerciseId: config.id,
      exerciseName: config.name,
      kind: 'reps',
      durationS: s.started ? (performance.now() - s.started) / 1000 : 0,
      reps: s.total,
      correctReps: s.total,
      targetReps: reps,
      sets,
      setsCompleted: Math.floor(s.total / reps),
      avgTopAngle: null,
      movementScore: null,
      torsoAlignmentAvg: null,
      symmetryAvg: null,
      topFault: null,
      repRecords: [],
      holdRecords: [],
    });
  };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const s = t.current;
      if (s.resting > 0) {
        s.resting -= 1;
        if (s.resting === 0) voice.speak(phrase(config.intro, { lang, mode }), 1);
      } else {
        s.elapsed += 1;
        if (s.elapsed >= config.secondsPerRep) {
          s.elapsed = 0;
          s.rep += 1;
          s.total += 1;
          voice.speak(phrase('guided_count', { lang, mode, vars: { n: s.rep } }), 1, `guided${s.rep}`);
          if (s.rep >= reps) {
            if (s.set >= sets) {
              finish();
            } else {
              voice.speak(phrase('set_complete', { lang, mode, vars: { set: s.set, sets } }), 1);
              s.set += 1;
              s.rep = 0;
              s.resting = REST_S;
            }
          }
        }
      }
      setVersion((v) => v + 1);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const toggle = () => {
    voice.unlock();
    if (!t.current.started) {
      t.current.started = performance.now();
      voice.speak(phrase(config.intro, { lang, mode }), 1);
    }
    setRunning((r) => !r);
  };

  const { rep, set, resting, elapsed } = t.current;
  const elapsedInRep = elapsed;
  const startRef = { current: t.current.started };
  const accent = caregiver ? 'bg-care' : 'bg-teal';
  const progress = elapsedInRep / config.secondsPerRep;

  return (
    <div className={cn('fixed inset-0 z-50 overflow-y-auto bg-[#0b0d10] text-white', caregiver && 'ring-4 ring-inset ring-care')}>
      <div className="flex items-center justify-between p-3">
        <button type="button" aria-label="Back" onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          {caregiver && <span className="rounded-full bg-care px-3 py-1 text-xs font-bold tracking-wider">CAREGIVER MODE</span>}
          <button
            type="button"
            aria-label={muted ? 'Unmute voice' : 'Mute voice'}
            onClick={() => {
              voice.setMuted(!muted);
              setMuted(!muted);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 pb-10">
        <div className="text-[11px] font-semibold tracking-[0.2em] text-white/60">GUIDED TIMER · NO CAMERA SCORING</div>
        <h1 className="mt-1 text-2xl font-semibold">{config.name}</h1>
        <p className="mt-1 text-sm text-white/70">
          A single camera cannot measure this movement reliably, so RecoverLens guides you with a timer instead.
        </p>
        <ol className="mt-4 space-y-2 text-white/85">
          {config.steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Stop if you feel sharp pain, dizziness or numbness.
        </p>

        <div className="mt-8 flex flex-col items-center">
          <div className="relative flex h-52 w-52 items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={caregiver ? '#E07A10' : '#4ADE80'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(resting ? 1 - resting / REST_S : progress) * 283} 283`}
              />
            </svg>
            <div className="text-center">
              {resting ? (
                <>
                  <div className="text-sm text-white/60">REST</div>
                  <div className="text-5xl font-semibold tabular-nums">{resting}s</div>
                </>
              ) : (
                <>
                  <div className="text-sm text-white/60">REP</div>
                  <div className="text-5xl font-semibold tabular-nums">
                    {String(Math.min(rep + 1, reps)).padStart(2, '0')}/{String(reps).padStart(2, '0')}
                  </div>
                  <div className="text-sm text-white/60">Set {set} of {sets}</div>
                </>
              )}
            </div>
          </div>
          <div className="mt-6 flex w-full gap-3">
            <Button size="lg" className={cn('flex-1', accent)} variant={caregiver ? 'care' : 'primary'} onClick={toggle}>
              {running ? <Pause size={20} /> : <Play size={20} />} {running ? 'Pause' : startRef.current ? 'Resume' : 'Start'}
            </Button>
            {startRef.current && (
              <Button size="lg" variant="secondary" onClick={finish}>
                Finish
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
