// /mirror/:exerciseId?mode=caregiver&reps=5&sets=1&debug=1 (SPEC §8.2)
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { PatientDetail } from '../api/types';
import { GuidedSession } from '../components/mirror/GuidedSession';
import { MirrorSession } from '../components/mirror/MirrorSession';
import { SessionSummaryCard } from '../components/mirror/SessionSummary';
import { getExercise, isLive } from '../exercises';
import { exerciseName } from '../i18n';
import { useApi } from '../hooks/useApi';
import { useApp } from '../lib/appContext';
import { uuid } from '../lib/format';
import type { SessionSummary } from '../pose/sessionEngine';

export interface MirrorState {
  painBefore?: number;
  painConfirmed?: boolean;
  patientId?: string;
}

export default function Mirror() {
  const { exerciseId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, patientId: currentPatient } = useApp();
  const state = (location.state ?? {}) as MirrorState;
  const patientId = state.patientId ?? currentPatient;
  const { data: patient } = useApi<PatientDetail>(`/patients/${patientId}`, { poll: false });

  const caregiver = params.get('mode') === 'caregiver';
  const debug = params.get('debug') === '1';
  const exercise = getExercise(exerciseId);
  const program = patient?.programs.find((p) => p.exercise_id === exerciseId && p.active);
  const reps = Number(params.get('reps')) || program?.reps || exercise?.defaultReps || 10;
  const sets = Number(params.get('sets')) || program?.sets || exercise?.defaultSets || 1;

  const [sessionId] = useState(uuid);
  const [startedAt] = useState(() => new Date().toISOString());
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const backTo = caregiver ? '/caregiver' : '/';
  const sideParam = params.get('side');
  const side: 'left' | 'right' | undefined = sideParam === 'left' || sideParam === 'right' ? sideParam : undefined;
  // A recorded video cannot wait for the 3-2-1 countdown: start counting as soon as the person is in view.
  const fileMode = params.get('source') === 'file';
  const options = useMemo(
    () => ({ targetReps: reps, sets, side, ...(fileMode ? { countdownMs: 0, calibrationHoldMs: 300 } : {}) }),
    [reps, sets, side, fileMode],
  );

  // Full-screen routes sit outside AppShell, so they name the page themselves (WCAG 2.4.2).
  const pageTitle = exercise ? exerciseName(t, exercise.id) : t('mirror.not_found');
  useEffect(() => {
    document.title = `${pageTitle} · RecoverLens`;
  }, [pageTitle]);

  if (!exercise) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-lg">{t('mirror.not_found')}</h1>
        <Link to="/" className="mt-4 inline-block text-teal underline">
          {t('common.back_home')}
        </Link>
      </main>
    );
  }

  const summaryCard = summary && (
    <SessionSummaryCard
      sessionId={sessionId}
      summary={summary}
      patientId={patientId}
      patientName={patient?.name}
      mode={caregiver ? 'caregiver' : 'self'}
      startedAt={startedAt}
      painBefore={state.painBefore ?? null}
      painConfirmed={state.painConfirmed ?? false}
      guided={!isLive(exercise)}
      onDone={() => navigate(backTo)}
    />
  );

  if (!isLive(exercise)) {
    if (summaryCard) {
      return <main className="dark-ui fixed inset-0 z-50 overflow-y-auto bg-[#0b0d10]">{summaryCard}</main>;
    }
    return (
      <GuidedSession
        config={exercise}
        reps={reps}
        sets={sets}
        caregiver={caregiver}
        onComplete={setSummary}
        onBack={() => navigate(backTo)}
      />
    );
  }

  return (
    <MirrorSession
      config={exercise}
      options={options}
      caregiver={caregiver}
      sessionKey={sessionId}
      debug={debug}
      fileMode={fileMode}
      onComplete={setSummary}
      onStop={(s) => (s ? setSummary(s) : navigate(backTo))}
      onBack={() => navigate(backTo)}
      overlay={summaryCard || undefined}
    />
  );
}
