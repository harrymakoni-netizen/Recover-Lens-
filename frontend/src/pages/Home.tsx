// Patient home (SPEC §8.1).
import { Calendar, Dumbbell, History, Play, Timer, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PatientDetail, SessionRecord } from '../api/types';
import { PainCheckIn } from '../components/dashboard/PainCheckIn';
import { Sparkline } from '../components/dashboard/TrendChart';
import { Disclaimer } from '../components/layout/Disclaimer';
import { Badge, Button, Card, CardTitle, Empty, Skeleton } from '../components/ui';
import { type AnyExercise, LIBRARY, exerciseName, getExercise, isLive } from '../exercises';
import { useApi } from '../hooks/useApi';
import { useLocalSessions, useMerged } from '../hooks/useLocalData';
import { loadPoseLandmarker } from '../hooks/usePoseLandmarker';
import { useApp } from '../lib/appContext';
import { cn, formatDate, round } from '../lib/format';
import { voice } from '../voice/voiceEngine';

export function conditionLabel(condition: string | undefined): string {
  return condition ?? '';
}

export function scoreOf(sessions: SessionRecord[]): number | null {
  const scored = sessions.filter((s) => s.movement_score !== null).slice(0, 3);
  if (!scored.length) return null;
  return scored.reduce((a, s) => a + (s.movement_score ?? 0), 0) / scored.length;
}

export function useStartExercise(caregiver = false) {
  const navigate = useNavigate();
  const { patientId } = useApp();
  const [pending, setPending] = useState<AnyExercise | null>(null);
  const checkIn = (
    <PainCheckIn
      open={!!pending}
      caregiver={caregiver}
      exerciseName={pending?.name ?? ''}
      onClose={() => setPending(null)}
      onStart={({ pain, confirmedByPatient }) => {
        // This click is the user gesture iOS needs before speech is allowed (SPEC §6.1).
        voice.unlock();
        const ex = pending!;
        setPending(null);
        navigate(`/mirror/${ex.id}${caregiver ? '?mode=caregiver' : ''}`, { state: { painBefore: pain, painConfirmed: confirmedByPatient, patientId } });
      }}
    />
  );
  return { start: (id: string) => setPending(getExercise(id) ?? null), checkIn };
}

function ExerciseCard({ ex, onStart, caregiver }: { ex: AnyExercise; onStart: () => void; caregiver?: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{ex.name}</h3>
        {isLive(ex) ? <Badge tone="teal">Live tracking</Badge> : <Badge tone="neutral"><Timer size={12} /> Guided timer</Badge>}
      </div>
      <p className="mt-1 flex-1 text-sm text-navy-soft">{ex.description}</p>
      <div className="mt-2 text-xs text-navy-soft">
        {ex.defaultSets} sets · {isLive(ex) && ex.kind === 'hold' ? `${ex.holdSeconds}s hold` : `${ex.defaultReps} reps`}
      </div>
      <Button variant={caregiver ? 'care' : 'primary'} className="mt-3 w-full" onClick={onStart}>
        <Play size={16} /> Start Exercise
      </Button>
    </div>
  );
}

export function ExerciseLibrary({ onStart, caregiver }: { onStart: (id: string) => void; caregiver?: boolean }) {
  const { t } = useApp();
  const [tab, setTab] = useState<'shoulder' | 'knee'>('shoulder');
  const items = LIBRARY.filter((e) => e.region === tab);
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
        <Dumbbell className="text-teal" size={22} /> {t('exercise_library')}
      </h2>
      <div role="tablist" className="mb-4 inline-grid grid-cols-2 rounded-xl bg-navy/5 p-1">
        {(['shoulder', 'knee'] as const).map((r) => (
          <button
            key={r}
            role="tab"
            type="button"
            aria-selected={tab === r}
            onClick={() => setTab(r)}
            className={cn('min-h-10 rounded-lg px-6 text-sm font-medium', tab === r ? 'bg-white shadow-sm' : 'text-navy-soft')}
          >
            {t(r)}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((ex) => (
          <ExerciseCard key={ex.id} ex={ex} onStart={() => onStart(ex.id)} caregiver={caregiver} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { t, patientId } = useApp();
  const { data: patient, loading, offline } = useApi<PatientDetail>(`/patients/${patientId}`);
  const local = useLocalSessions(patientId);
  const sessions = useMerged<SessionRecord>(patient?.sessions, local, 'started_at');
  const { start, checkIn } = useStartExercise();

  // Preload the pose model so the Mirror opens fast (SPEC §16).
  useEffect(() => {
    loadPoseLandmarker().catch(() => undefined);
  }, []);

  const firstName = patient?.name.split(' ')[0];
  const programs = patient?.programs.filter((p) => p.active) ?? [];
  const score = scoreOf(sessions);
  const spark = sessions
    .filter((s) => s.movement_score !== null)
    .slice(0, 7)
    .reverse()
    .map((s) => ({ label: `${formatDate(s.started_at)} · ${exerciseName(s.exercise_id)}`, value: s.movement_score }));
  const unsynced = local.filter((s) => !s.synced).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {loading && !patient ? (
            <Skeleton className="h-9 w-72" />
          ) : (
            <h1 className="text-3xl font-semibold md:text-4xl">{t('welcome_back', { name: firstName ?? 'there' })}</h1>
          )}
          {patient && <p className="mt-1 text-lg text-navy-soft">{conditionLabel(patient.condition)}</p>}
        </div>
      </div>

      {offline && !patient && (
        <p className="mt-4 rounded-xl bg-navy/5 px-4 py-3 text-sm text-navy-soft">
          Can't reach the server right now. You can still exercise — sessions save on this phone and sync later.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="border-teal/20 bg-teal-soft/40">
          <CardTitle icon={<Calendar size={20} />}>{t('todays_program')}</CardTitle>
          {loading && !patient ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : programs.length === 0 ? (
            <p className="text-navy-soft">No exercises assigned yet. Pick one from the library below.</p>
          ) : (
            <ul className="space-y-3">
              {programs.map((p) => {
                const ex = getExercise(p.exercise_id);
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4">
                    <div>
                      <div className="font-semibold">{exerciseName(p.exercise_id)}</div>
                      <div className="text-sm text-navy-soft">
                        {p.sets} sets × {ex && isLive(ex) && ex.kind === 'hold' ? `${ex.holdSeconds}s hold` : `${p.reps} reps`}
                        {p.target_angle ? ` · target ${p.target_angle}°` : ''}
                      </div>
                    </div>
                    <Button onClick={() => start(p.exercise_id)}>
                      <Play size={16} /> {t('start_exercise')}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle icon={<TrendingUp size={20} />}>{t('recovery_progress')}</CardTitle>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-navy-soft">{t('overall_score')}</span>
                <span className="font-semibold tabular-nums">{score === null ? '—' : `${Math.round(score)}/100`}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-teal-soft">
                <div className="h-2 rounded-full bg-teal" style={{ width: `${score ?? 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-navy-soft">{t('adherence')}</span>
                <span className="font-semibold tabular-nums">{patient ? `${Math.round(patient.adherence)}%` : '—'}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-teal-soft">
                <div className="h-2 rounded-full bg-teal" style={{ width: `${patient?.adherence ?? 0}%` }} />
              </div>
            </div>
            {spark.length > 1 && (
              <div>
                <div className="text-xs text-navy-soft">Movement score, last {spark.length} sessions</div>
                <Sparkline data={spark} name="Score" />
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle icon={<History size={20} />}>
          My recent sessions{unsynced > 0 && <Badge tone="neutral">{unsynced} waiting to sync</Badge>}
        </CardTitle>
        {sessions.length === 0 ? (
          <Empty title="No sessions yet">Your sessions appear here as soon as you finish one.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {sessions.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{exerciseName(s.exercise_id)}</div>
                  <div className="text-sm text-navy-soft">
                    {formatDate(s.started_at)} · {s.reps} reps{s.mode === 'caregiver' ? ' · with caregiver' : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{round(s.movement_score)}</div>
                  <div className="text-xs text-navy-soft">score</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ExerciseLibrary onStart={start} />
      <Disclaimer />
      {checkIn}
    </div>
  );
}
