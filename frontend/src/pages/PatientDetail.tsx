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
import { exerciseName, getExercise, isLive } from '../exercises';
import { useApi } from '../hooks/useApi';
import { cn, formatDate, round } from '../lib/format';
import { FAULT_LABELS } from '../lib/sessionRecord';
import type { FaultRuleId } from '../pose/formRules';
import { AlertsList, Avatar } from './ClinicianPortal';

export default function PatientDetail() {
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
    return <Empty title="Patient not found">Go back to the <Link className="text-teal underline" to="/clinician">Clinician Portal</Link>.</Empty>;
  }

  const filtered = sessions.filter((s) => s.exercise_id === exerciseFilter);
  const point = (v: number | null, s: (typeof sessions)[number]) => ({ label: formatDate(s.started_at), value: v });
  const scoreData = filtered.filter((s) => s.movement_score !== null).map((s) => point(s.movement_score, s));
  const angleData = filtered.filter((s) => s.avg_top_angle !== null).map((s) => point(s.avg_top_angle, s));
  const painData = filtered.filter((s) => s.pain_after !== null).map((s) => point(s.pain_after, s));
  const ex = getExercise(exerciseFilter);
  const angleTitle =
    ex && isLive(ex) && ex.targetAngle < ex.startAngle ? 'Knee angle at deepest point (lower = deeper)' : 'Angle at top';
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
        <ArrowLeft size={18} /> Clinician Portal
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar initials={patient.initials} alert={patient.unresolved_alerts > 0} />
        <div>
          <h1 className="text-3xl font-semibold">{patient.name}</h1>
          <p className="text-navy-soft">
            {patient.condition} · {patient.contact || 'No contact'}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Latest score" value={round(patient.latest_score)} />
        <Stat label="Adherence (14 days)" value={`${Math.round(patient.adherence)}%`} />
        <Stat label="Sessions" value={patient.session_count} />
        <Stat label="Last session" value={<span className="text-lg">{formatDate(patient.last_session_at)}</span>} />
      </div>

      {patientAlerts.length > 0 && (
        <Card className="mt-6">
          <CardTitle>Open alerts</CardTitle>
          <AlertsList alerts={patientAlerts} showPatient={false} onResolved={() => void Promise.all([alerts.refresh(), refresh()])} />
        </Card>
      )}

      <Card className="mt-6">
        <CardTitle
          icon={<TrendingUp size={20} />}
          action={
            exercisesDone.length > 1 && (
              <select
                aria-label="Exercise"
                className="min-h-10 rounded-lg border border-line bg-white px-2 text-sm"
                value={exerciseFilter}
                onChange={(e) => setExerciseFilter(e.target.value)}
              >
                {exercisesDone.map((id) => (
                  <option key={id} value={id}>
                    {exerciseName(id)}
                  </option>
                ))}
              </select>
            )
          }
        >
          Trends{exerciseFilter && ` · ${exerciseName(exerciseFilter)}`}
        </CardTitle>
        {filtered.length === 0 ? (
          <Empty title="Awaiting first session">Trends appear after the first recorded session.</Empty>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="text-sm font-medium text-navy-soft">Movement score</h3>
              {scoreData.length ? <TrendChart data={scoreData} name="Movement score" domain={[0, 100]} /> : <Empty title="No scored sessions" />}
            </div>
            <div>
              <h3 className="text-sm font-medium text-navy-soft">{angleTitle}</h3>
              {angleData.length ? <TrendChart data={angleData} name="Angle at top" unit="°" color="#2F6FB5" /> : <Empty title="Not measured for this exercise" />}
            </div>
            <div>
              <h3 className="text-sm font-medium text-navy-soft">Pain after session</h3>
              {painData.length ? <TrendChart data={painData} name="Pain" domain={[0, 10]} color="#B5532F" /> : <Empty title="No pain recorded" />}
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle icon={<ClipboardList size={20} />}>Sessions</CardTitle>
          {sessions.length === 0 ? (
            <Empty title="Awaiting first session" />
          ) : (
            <div className="-mx-4 overflow-x-auto sm:-mx-5">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-navy-soft">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="py-2 font-medium">Exercise</th>
                    <th className="py-2 text-right font-medium">Reps</th>
                    <th className="py-2 text-right font-medium">Correct</th>
                    <th className="py-2 text-right font-medium">Score</th>
                    <th className="py-2 text-right font-medium">Pain</th>
                    <th className="px-5 py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sessions].reverse().map((s) => (
                    <tr key={s.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-2.5 whitespace-nowrap">{formatDate(s.started_at)}</td>
                      <td className="py-2.5">
                        {exerciseName(s.exercise_id)}
                        {s.mode === 'caregiver' && <Badge tone="care">caregiver</Badge>}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{s.reps}</td>
                      <td className="py-2.5 text-right tabular-nums">{s.correct_reps}</td>
                      <td className="py-2.5 text-right tabular-nums">{round(s.movement_score)}</td>
                      <td className={cn('py-2.5 text-right tabular-nums', (s.pain_after ?? 0) >= 6 && 'font-semibold text-alert')}>
                        {s.pain_before ?? '—'} → {s.pain_after ?? '—'}
                      </td>
                      <td className="px-5 py-2.5 text-navy-soft">
                        {s.manual ? 'Manual log' : s.top_fault ? FAULT_LABELS[s.top_fault as FaultRuleId] ?? s.top_fault : ''}
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
                  <Pencil size={14} /> Edit
                </Button>
              )
            }
          >
            Program
          </CardTitle>
          {editing ? (
            <>
              <ProgramEditor value={draft} onChange={setDraft} />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={saveProgram} disabled={saving}>
                  {saving ? 'Saving…' : 'Save program'}
                </Button>
              </div>
            </>
          ) : patient.programs.filter((p) => p.active).length === 0 ? (
            <p className="text-navy-soft">No exercises assigned.</p>
          ) : (
            <ul className="space-y-2">
              {patient.programs
                .filter((p) => p.active)
                .map((p) => (
                  <li key={p.id} className="rounded-xl bg-page p-3">
                    <div className="font-medium">{exerciseName(p.exercise_id)}</div>
                    <div className="text-sm text-navy-soft">
                      {p.sets} sets × {p.reps} reps{p.target_angle ? ` · target ${p.target_angle}°` : ''}
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
