// Runs a sport's test battery in sequence, each test with its own calibration (SPEC §8.4).
import { useCallback, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { enqueue } from '../api/offlineQueue';
import type { Screening } from '../api/types';
import { MirrorSession } from '../components/mirror/MirrorSession';
import { ObservationList } from '../components/dashboard/ScreeningResult';
import { Button } from '../components/ui';
import { getLiveExercise } from '../exercises';
import { uuid } from '../lib/format';
import { BATTERIES, type ScreeningAnalysis, type Sport, type StepResult, analyzeScreening } from '../pose/screening';
import type { SessionSummary } from '../pose/sessionEngine';
import { voice } from '../voice/voiceEngine';
import { sportName } from './SportsScreening';

export default function ScreeningRun() {
  const { sport } = useParams<{ sport: Sport }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as { athleteId?: string; athleteName?: string };
  const [screeningId] = useState(uuid);
  const [athleteId] = useState(() => state.athleteId ?? uuid());
  const [stepIndex, setStepIndex] = useState(0);
  const [results, setResults] = useState<StepResult[]>([]);
  const [analysis, setAnalysis] = useState<ScreeningAnalysis | null>(null);

  const steps = sport ? BATTERIES[sport] : undefined;
  const step = steps?.[stepIndex];
  const config = useMemo(() => {
    if (!step) return null;
    const base = getLiveExercise(step.exerciseId);
    // The balance test names the leg in its intro ("Stand on your left leg…").
    return step.exerciseId === 'single_leg_balance' ? { ...base, cues: { ...base.cues, intro: 'screen_slb_intro' } } : base;
  }, [step]);
  const options = useMemo(
    () => ({ targetReps: step?.reps, sets: 1, side: step?.side, holdSeconds: step?.holdSeconds }),
    [step],
  );

  const finishBattery = useCallback(
    (all: StepResult[]) => {
      if (!sport) return;
      const a = analyzeScreening(sport, all);
      setAnalysis(a);
      const record: Screening = {
        id: screeningId,
        athlete_id: athleteId,
        athlete_name: state.athleteName ?? 'Athlete',
        sport,
        created_at: new Date().toISOString(),
        results_json: { observations: a.observations, tests: a.tests },
        overall: a.overall,
      };
      // Saved immediately (local first, then synced).
      void enqueue('screening', screeningId, record);
    },
    [sport, screeningId, athleteId, state.athleteName],
  );

  const onComplete = useCallback(
    (summary: SessionSummary) => {
      if (!steps || !step) return;
      const all = [...results, { step, summary }];
      setResults(all);
      if (stepIndex + 1 < steps.length) {
        const next = steps[stepIndex + 1];
        voice.speak(`Next test: ${next.label.replace('×', '')}.`, 1, `next${stepIndex}`);
        setStepIndex(stepIndex + 1);
      } else {
        finishBattery(all);
      }
    },
    [results, step, stepIndex, steps, finishBattery],
  );

  if (!sport || !steps || !step || !config) return <Navigate to="/sports" replace />;
  if (!state.athleteName && !state.athleteId) return <Navigate to="/sports" replace />;

  const vars = { side: step.side ?? 'left', seconds: step.holdSeconds ?? 20 };
  const introSteps =
    step.exerciseId === 'single_leg_balance'
      ? [`Stand on your ${vars.side} leg.`, `Hold for ${vars.seconds} seconds with your hips level.`]
      : config.steps;

  const overlay = analysis && (
    <div className="flex min-h-full items-center justify-center p-4 pt-16">
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#121510] p-6 text-white">
        <h1 className="text-2xl font-bold tracking-wide text-good">SCREENING COMPLETE</h1>
        <p className="mt-1 text-white/70">
          {state.athleteName} · {sportName(sport)} · {analysis.overall === 'review' ? 'Some items to review' : 'All good'}
        </p>
        <div className="mt-4">
          <ObservationList observations={analysis.observations} dark />
        </div>
        <p className="mt-4 text-xs text-white/50">Observations from a camera screen, not a diagnosis. Saved automatically.</p>
        <Button size="lg" className="mt-4 w-full" onClick={() => navigate('/sports')}>
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <MirrorSession
      config={config}
      options={options}
      caregiver={false}
      sessionKey={`${screeningId}-${stepIndex}`}
      debug={params.get('debug') === '1'}
      title={`Test ${stepIndex + 1}/${steps.length} · ${step.label}`}
      steps={introSteps}
      onComplete={onComplete}
      onStop={(summary) => {
        const all = summary ? [...results, { step, summary }] : results;
        if (all.length) finishBattery(all);
        else navigate('/sports');
      }}
      onBack={() => navigate('/sports')}
      overlay={overlay || undefined}
    />
  );
}
