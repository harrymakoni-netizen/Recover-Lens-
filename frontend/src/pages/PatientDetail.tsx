// Patient detail (SPEC §8.5): score / angle / pain trends (one measure per chart), adherence,
// session table, edit program.
import { ArrowLeft, ClipboardList, Pencil, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { put } from '../api/client';
import type { Alert, PatientDetail as Detail, Program } from '../api/types';
import { ProgramEditor, type ProgramDraft } from '../components/dashboard/ProgramEditor';
import { TrendChart } from '../components/dashboard/TrendChart';
import { Badge, Button, Card, CardTitle, Empty, Skeleton, Stat } from '../components/ui';
import { getExercise, isLive } from '../exercises';
import { useApi } from '../hooks/useApi';
import { exerciseName, formatDate } from '../i18n';
import { useApp } from '../lib/appContext';
import { cn, round } from '../lib/format';
import { faultLabel } from '../lib/sessionRecord';
import { AlertsList, Avatar } from './ClinicianPortal';
import { planText } from './Home';

export default function PatientDetail() {
  const { t, lang } = useApp();
  const { patientId } = useParams();
  const { data: patient, loading, refresh } = useApi<Detail>(`/patients/${patientId}`);
  const alerts = useApi<Alert[]>('/alerts?resolved=false');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProgramDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const sessions = useMemo(
    () => [...(patient?.sessions ?? [])].sort((a, b) => a.started_at.localeCompare(b.started_at)),
    [patient],
  );
  const exercisesDone = useMemo(() => [...new Set(sessions.map((s) => s.exercise_id))], [sessions]);
  const [exerciseFilter, setExerciseFilter] = useState<string>('');
  useEffect(() => {
    if (!exerciseFilter && exercisesDone.length) setExerciseFilter(exercisesDone[0]);
  }, [exercisesDone, exerciseFilter]);

  if (loading && !patient) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!patient) {
    return (
      <Empty title={t('pd.not_found')}>
        <Link className="text-teal underline" to="/clinician">
          {t('pd.back_to_portal')}
        </Link>
      </Empty>
    );
  }

  const filtered = sessions.filter((s) => s.exercise_id === exerciseFilter);
  const point = (v: number | null, s: (typeof sessions)[number]) => ({ label: formatDate(s.started_at, lang), value: v });
  const scoreData = filtered.filter((s) => s.movement_score !== null).map((s) => point(s.movement_score, s));
  const angleData = filtered.filter((s) => s.avg_top_angle !== null).map((s) => point(s.avg_top_angle, s));
  const painData = filtered.filter((s) => s.pain_after !== null).map((s) => point(s.pain_after, s));
  const ex = getExercise(exerciseFilter);
  const angleTitle = ex && isLive(ex) && ex.targetAngle < ex.startAngle ? t('pd.angle_knee') : t('pd.angle_top');
  const patientAlerts = (alerts.data ?? []).filter((a) => a.patient_id === patient.id);

  const startEdit = () => {
    setDraft(patient.programs.filter((p) => p.active).map((p: Program) => ({
      exercise_id: p.exercise_id, sets: p.sets, reps: p.reps, target_angle: p.target_angle,
    })));
    setEditing(true);
  };

  const saveProgram = async () => {
    setSaving(true);
    try {
      await put(`/patients/${patient.id}/programs`, { programs: draft });
      await refresh();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link to="/clinician" className="mb-3 inline-flex min-h-11 items-center gap-1 text-navy-soft hover:text-navy">
        <ArrowLeft size={18} /> {t('nav.clinician')}
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar initials={patient.initials} alert={patient.unresolved_alerts > 0} />
        <div>
          <h1 className="text-3xl font-semibold">{patient.name}</h1>
          <p className="text-navy-soft">
            {patient.condition} · {patient.contact || t('pd.no_contact')}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t('pd.latest_score')} value={round(patient.latest_score)} />
        <Stat label={t('pd.adherence')} value={`${Math.round(patient.adherence)}%`} />
        <Stat label={t('pd.sessions')} value={patient.session_count} />
        <Stat label={t('pd.last_session')} value={<span className="text-lg">{formatDate(patient.last_session_at, lang)}</span>} />
      </div>

      {patientAlerts.length > 0 && (
        <Card className="mt-6">
          <CardTitle>{t('pd.open_alerts')}</CardTitle>
          <AlertsList alerts={patientAlerts} showPatient={false} onResolved={() => void Promise.all([alerts.refresh(), refresh()])} />
        </Card>
      )}

      <Card className="mt-6">
        <CardTitle
          icon={<TrendingUp size={20} />}
          action={
            exercisesDone.length > 1 && (
              <select
                aria-label={t('pd.exercise')}
                className="min-h-10 rounded-lg border border-line bg-white px-2 text-sm"
                value={exerciseFilter}
                onChange={(e) => setExerciseFilter(e.target.value)}
              >
                {exercisesDone.map((id) => (
                  <option key={id} value={id}>
                    {exerciseName(t, id)}
                  </option>
                ))}
              </select>
            )
          }
        >
          {exerciseFilter ? t('pd.trends_for', { exercise: exerciseName(t, exerciseFilter) }) : t('pd.trends')}
        </CardTitle>
        {filtered.length === 0 ? (
          <Empty title={t('pd.awaiting')}>{t('pd.trends_hint')}</Empty>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="text-sm font-medium text-navy-soft">{t('pd.movement_score')}</h3>
              {scoreData.length ? (
                <TrendChart data={scoreData} name={t('pd.movement_score')} domain={[0, 100]} />
              ) : (
                <Empty title={t('pd.no_scored')} />
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-navy-soft">{angleTitle}</h3>
              {angleData.length ? (
                <TrendChart data={angleData} name={angleTitle} unit="°" color="#2F6FB5" />
              ) : (
                <Empty title={t('pd.not_measured')} />
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-navy-soft">{t('pd.pain_after')}</h3>
              {painData.length ? (
                <TrendChart data={painData} name={t('pd.pain')} domain={[0, 10]} color="#B5532F" />
              ) : (
                <Empty title={t('pd.no_pain')} />
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle icon={<ClipboardList size={20} />}>{t('pd.sessions')}</CardTitle>
          {sessions.length === 0 ? (
            <Empty title={t('pd.awaiting')} />
          ) : (
            <div className="-mx-4 overflow-x-auto sm:-mx-5">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-navy-soft">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2 font-medium">{t('pd.col_date')}</th>
                    <th className="py-2 font-medium">{t('pd.col_exercise')}</th>
                    <th className="py-2 pl-4 text-right font-medium">{t('pd.col_reps')}</th>
                    <th className="py-2 pl-4 text-right font-medium">{t('pd.col_correct')}</th>
                    <th className="py-2 pl-4 text-right font-medium">{t('pd.col_score')}</th>
                    <th className="py-2 pl-4 text-right font-medium">{t('pd.col_pain')}</th>
                    <th className="px-5 py-2 font-medium">{t('pd.col_note')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sessions].reverse().map((s) => (
                    <tr key={s.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-2.5 whitespace-nowrap">{formatDate(s.started_at, lang)}</td>
                      <td className="py-2.5">
                        {exerciseName(t, s.exercise_id)}
                        {s.mode === 'caregiver' && <Badge tone="care">{t('pd.caregiver')}</Badge>}
                      </td>
                      <td className="py-2.5 pl-4 text-right tabular-nums">{s.reps}</td>
                      <td className="py-2.5 pl-4 text-right tabular-nums">{s.correct_reps}</td>
                      <td className="py-2.5 pl-4 text-right tabular-nums">{round(s.movement_score)}</td>
                      <td className={cn('py-2.5 pl-4 text-right tabular-nums', (s.pain_after ?? 0) >= 6 && 'font-semibold text-alert')}>
                        {s.pain_before ?? '—'} → {s.pain_after ?? '—'}
                      </td>
                      <td className="px-5 py-2.5 text-navy-soft">
                        {s.manual ? t('pd.manual') : s.top_fault ? faultLabel(t, s.top_fault) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle
            action={
              !editing && (
                <Button variant="secondary" size="sm" onClick={startEdit}>
                  <Pencil size={14} /> {t('common.edit')}
                </Button>
              )
            }
          >
            {t('pd.program')}
          </CardTitle>
          {editing ? (
            <>
              <ProgramEditor value={draft} onChange={setDraft} />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={saveProgram} disabled={saving}>
                  {saving ? t('common.saving') : t('pd.save_program')}
                </Button>
              </div>
            </>
          ) : patient.programs.filter((p) => p.active).length === 0 ? (
            <p className="text-navy-soft">{t('prog.none')}</p>
          ) : (
            <ul className="space-y-2">
              {patient.programs
                .filter((p) => p.active)
                .map((p) => (
                  <li key={p.id} className="rounded-xl bg-page p-3">
                    <div className="font-medium">{exerciseName(t, p.exercise_id)}</div>
                    <div className="text-sm text-navy-soft">
                      {planText(t, getExercise(p.exercise_id), p.sets, p.reps)}
                      {p.target_angle ? ` · ${t('plan.target', { angle: p.target_angle })}` : ''}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
