// Patient home (SPEC §8.1).
import { Dumbbell, Footprints, History, PersonStanding, Play, Timer, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PatientDetail, SessionRecord } from '../api/types';
import { InsightsCard } from '../components/dashboard/Insights';
import { PainCheckIn } from '../components/dashboard/PainCheckIn';
import { ScoreRing } from '../components/dashboard/ScoreRing';
import { Sparkline } from '../components/dashboard/TrendChart';
import { Disclaimer } from '../components/layout/Disclaimer';
import { Badge, Button, Card, CardTitle, Empty } from '../components/ui';
import { type AnyExercise, LIBRARY, getExercise, isLive } from '../exercises';
import { useApi } from '../hooks/useApi';
import { useLocalSessions, useMerged } from '../hooks/useLocalData';
import { loadPoseLandmarker } from '../hooks/usePoseLandmarker';
import { type T, exerciseDescription, exerciseName, formatDate } from '../i18n';
import { useApp } from '../lib/appContext';
import { cn, round } from '../lib/format';
import { FatigueBadge } from '../lib/fatigueText';
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
  const { t, patientId } = useApp();
  const [pending, setPending] = useState<AnyExercise | null>(null);
  const checkIn = (
    <PainCheckIn
      open={!!pending}
      caregiver={caregiver}
      exerciseName={pending ? exerciseName(t, pending.id) : ''}
      armChoice={!!pending && isLive(pending) && pending.region === 'shoulder' && pending.side === 'both'}
      loadChoice={!!pending && isLive(pending) && !!pending.effort}
      onClose={() => setPending(null)}
      onStart={({ pain, confirmedByPatient, side, loadKg }) => {
        // This click is the user gesture iOS needs before speech is allowed (SPEC §6.1).
        voice.unlock();
        const ex = pending!;
        setPending(null);
        const query = new URLSearchParams();
        if (caregiver) query.set('mode', 'caregiver');
        if (side) query.set('side', side);
        if (loadKg) query.set('load', String(loadKg));
        const qs = query.toString();
        navigate(`/mirror/${ex.id}${qs ? `?${qs}` : ''}`, {
          state: { painBefore: pain, painConfirmed: confirmedByPatient, patientId },
        });
      }}
    />
  );
  return { start: (id: string) => setPending(getExercise(id) ?? null), checkIn };
}

/** "3 sets × 10 reps" or "3 sets × 30s hold" for an exercise plan. */
export function planText(t: T, ex: AnyExercise | undefined, sets: number, reps: number): string {
  return ex && isLive(ex) && ex.kind === 'hold'
    ? t('plan.sets_hold', { sets, seconds: ex.holdSeconds ?? 0 })
    : t('plan.sets_reps', { sets, reps });
}

function ExerciseCard({ ex, onStart, caregiver }: { ex: AnyExercise; onStart: () => void; caregiver?: boolean }) {
  const { t } = useApp();
  return (
    <div className="lift flex flex-col rounded-2xl border border-line/80 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            caregiver ? 'bg-care-soft text-care' : 'bg-teal-soft text-teal',
          )}
          aria-hidden
        >
          {ex.region === 'knee' ? <Footprints size={20} /> : <PersonStanding size={20} />}
        </span>
        {isLive(ex) ? (
          <Badge tone="teal">{t('home.live_tracking')}</Badge>
        ) : (
          <Badge tone="neutral">
            <Timer size={12} /> {t('home.guided_timer')}
          </Badge>
        )}
      </div>
      <h3 className="mt-3 font-semibold">{exerciseName(t, ex.id)}</h3>
      <p className="mt-1 flex-1 text-sm text-navy-soft">{exerciseDescription(t, ex)}</p>
      <div className="mt-2 text-xs text-navy-soft">{planText(t, ex, ex.defaultSets, ex.defaultReps)}</div>
      <Button variant={caregiver ? 'care' : 'primary'} className="mt-3 w-full" onClick={onStart}>
        <Play size={16} /> {t('home.start_exercise')}
      </Button>
    </div>
  );
}

export function ExerciseLibrary({ onStart, caregiver }: { onStart: (id: string) => void; caregiver?: boolean }) {
  const { t } = useApp();
  const [tab, setTab] = useState<'shoulder' | 'elbow' | 'knee'>('shoulder');
  const items = LIBRARY.filter((e) => e.region === tab);
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2.5 text-xl font-semibold tracking-tight">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-soft text-teal" aria-hidden>
          <Dumbbell size={18} />
        </span>
        {t('home.exercise_library')}
      </h2>
      <div role="tablist" className="mb-4 inline-grid grid-cols-3 rounded-xl bg-navy/5 p-1">
        {(['shoulder', 'elbow', 'knee'] as const).map((r) => (
          <button
            key={r}
            role="tab"
            type="button"
            aria-selected={tab === r}
            onClick={() => setTab(r)}
            className={cn('min-h-10 rounded-lg px-4 text-sm font-medium sm:px-6', tab === r ? 'bg-white shadow-sm' : 'text-navy-soft')}
          >
            {t(`home.${r}`)}
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
  const { t, lang, patientId } = useApp();
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
    .map((s) => ({ label: `${formatDate(s.started_at, lang)} · ${exerciseName(t, s.exercise_id)}`, value: s.movement_score }));
  const unsynced = local.filter((s) => !s.synced).length;
  const weekDays = new Set(
    sessions.filter((s) => Date.now() - Date.parse(s.started_at) < 7 * 86_400_000).map((s) => new Date(s.started_at).toDateString()),
  ).size;

  return (
    <div>
      <section className="bg-brand-gradient rise relative overflow-hidden rounded-3xl p-5 text-white shadow-[var(--shadow-lift)] sm:p-8">
        <img
          src="/brand/mark-dark.webp"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 hidden w-80 opacity-[0.07] sm:block"
        />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-mint">
              {t('home.today', { date: formatDate(new Date().toISOString(), lang) })}
            </p>
            {loading && !patient ? (
              <div className="mt-2 h-10 w-72 max-w-full animate-pulse rounded-lg bg-white/15" />
            ) : (
              <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
                {firstName ? t('home.welcome', { name: firstName }) : t('home.welcome_anon')}
              </h1>
            )}
            {patient && <p className="mt-1 text-lg text-white/80">{conditionLabel(patient.condition)}</p>}

            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-white/75">{t('home.todays_program')}</h2>
            {loading && !patient ? (
              <div className="mt-3 h-20 animate-pulse rounded-2xl bg-white/10" />
            ) : programs.length === 0 ? (
              <p className="mt-2 text-white/80">{t('home.no_program')}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {programs.map((p) => {
                  const ex = getExercise(p.exercise_id);
                  return (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm"
                    >
                      <div className="min-w-0">
                        <div className="text-lg font-semibold">{exerciseName(t, p.exercise_id)}</div>
                        <div className="text-sm text-white/75">
                          {planText(t, ex, p.sets, p.reps)}
                          {p.target_angle ? ` · ${t('plan.target', { angle: p.target_angle })}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => start(p.exercise_id)}
                        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-brand shadow-lg shadow-black/10 transition-transform hover:bg-white/90 active:scale-[0.98]"
                      >
                        <Play size={18} className="fill-current" aria-hidden /> {t('home.start_exercise')}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-5 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 lg:flex-col lg:px-8 lg:py-6">
            <div className="flex flex-col items-center gap-1.5">
              <ScoreRing value={score} label={t('home.overall_score')} />
              <span className="text-sm text-white/75" aria-hidden>
                {t('home.overall_score')}
              </span>
            </div>
            <dl className="grid gap-2 text-sm lg:text-center">
              <div>
                <dt className="text-white/75">{t('home.adherence')}</dt>
                <dd className="text-lg font-semibold tabular-nums">{patient ? `${Math.round(patient.adherence)}%` : '—'}</dd>
              </div>
              <div>
                <dt className="text-white/75">{t('home.this_week')}</dt>
                <dd className="text-lg font-semibold tabular-nums">{t('home.days_n', { n: weekDays })}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {offline && !patient && (
        <p className="mt-4 rounded-xl bg-navy/5 px-4 py-3 text-sm text-navy-soft">
          {t('home.offline_notice')}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <InsightsCard sessions={sessions} programs={programs} />
        <Card>
          <CardTitle icon={<TrendingUp size={18} />}>{t('home.recovery_progress')}</CardTitle>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-navy-soft">{t('home.adherence')}</span>
                <span className="font-semibold tabular-nums">{patient ? `${Math.round(patient.adherence)}%` : '—'}</span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-teal-soft">
                <div className="btn-brand h-2.5 rounded-full" style={{ width: `${patient?.adherence ?? 0}%` }} />
              </div>
            </div>
            {spark.length > 1 ? (
              <div>
                <div className="text-xs text-navy-soft">{t('home.score_trend', { n: spark.length })}</div>
                <Sparkline data={spark} name={t('home.score_series')} />
              </div>
            ) : (
              <p className="text-sm text-navy-soft">{t('home.no_sessions_hint')}</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle icon={<History size={18} />}>
          {t('home.recent_sessions')}
          {unsynced > 0 && <Badge tone="neutral">{t('waiting_to_sync', { n: unsynced })}</Badge>}
        </CardTitle>
        {sessions.length === 0 ? (
          <Empty title={t('home.no_sessions')}>{t('home.no_sessions_hint')}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {sessions.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-page text-teal" aria-hidden>
                    {getExercise(s.exercise_id)?.region === 'knee' ? <Footprints size={18} /> : <PersonStanding size={18} />}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium">{exerciseName(t, s.exercise_id)}</div>
                    <div className="text-sm text-navy-soft">
                      {formatDate(s.started_at, lang)} · {t('plan.reps', { n: s.reps })}
                      {s.mode === 'caregiver' ? ` · ${t('home.with_caregiver')}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FatigueBadge level={s.fatigue_level} />
                  <div className="min-w-14 rounded-xl bg-teal-soft px-3 py-1.5 text-center">
                    <div className="font-semibold tabular-nums text-teal-dark">{round(s.movement_score)}</div>
                    <div className="text-[0.6875rem] text-navy-soft">{t('common.score')}</div>
                  </div>
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
