// Caregiver Assist (SPEC §8.3): same Mirror and engine, helper-addressed cues, amber styling,
// pain logged on the patient's behalf, manual log for sessions done without the camera.
import { ClipboardPen, Play, Ruler, ScanLine, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { enqueue } from '../api/offlineQueue';
import type { PatientDetail, SessionRecord } from '../api/types';
import { Disclaimer } from '../components/layout/Disclaimer';
import { Button, Card, CardTitle, Field, PainSlider, inputClass } from '../components/ui';
import { LIBRARY, getExercise } from '../exercises';
import { useApi } from '../hooks/useApi';
import { exerciseName } from '../i18n';
import { useApp } from '../lib/appContext';
import { uuid } from '../lib/format';
import { ExerciseLibrary, planText, useStartExercise } from './Home';

const SETUP = [
  { icon: Smartphone, key: 'cg.setup1' },
  { icon: Ruler, key: 'cg.setup2' },
  { icon: ScanLine, key: 'cg.setup3' },
];

function ManualLog({ patientId }: { patientId: string }) {
  const { t } = useApp();
  const [exerciseId, setExerciseId] = useState(LIBRARY[0].id);
  const [reps, setReps] = useState(10);
  const [sets, setSets] = useState(3);
  const [pain, setPain] = useState(2);
  const [confirmed, setConfirmed] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const save = async () => {
    const id = uuid();
    const record: SessionRecord = {
      id,
      patient_id: patientId,
      exercise_id: exerciseId,
      mode: 'caregiver',
      started_at: new Date().toISOString(),
      duration_s: 0,
      reps: reps * sets,
      correct_reps: reps * sets,
      avg_top_angle: null,
      movement_score: null,
      torso_alignment_avg: null,
      symmetry_avg: null,
      top_fault: null,
      pain_before: null,
      pain_after: pain,
      pain_confirmed_by_patient: confirmed,
      manual: true,
    };
    await enqueue('session', id, record);
    setSaved(t('cg.log_saved', { n: reps * sets, exercise: exerciseName(t, exerciseId) }));
  };

  return (
    <Card className="mt-6">
      <CardTitle icon={<ClipboardPen size={20} className="text-care" />}>{t('cg.log_title')}</CardTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('cg.log_exercise')}>
          <select className={inputClass} value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            {LIBRARY.map((e) => (
              <option key={e.id} value={e.id}>
                {exerciseName(t, e.id)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('cg.log_reps')}>
          <input className={inputClass} type="number" min={1} max={50} value={reps} onChange={(e) => setReps(Number(e.target.value))} />
        </Field>
        <Field label={t('cg.log_sets')}>
          <input className={inputClass} type="number" min={1} max={10} value={sets} onChange={(e) => setSets(Number(e.target.value))} />
        </Field>
      </div>
      <div className="mt-4">
        <PainSlider value={pain} onChange={setPain} label={t('cg.log_pain')} />
      </div>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-[#E07A10]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        {t('common.confirmed_by_patient')}
      </label>
      <Button variant="care" size="lg" className="mt-3 w-full sm:w-auto" onClick={save}>
        {t('cg.log_save')}
      </Button>
      {saved && <p className="mt-2 text-sm text-navy-soft">{saved}</p>}
    </Card>
  );
}

export default function Caregiver() {
  const { t, patientId } = useApp();
  const { data: patient } = useApi<PatientDetail>(`/patients/${patientId}`);
  const { start, checkIn } = useStartExercise(true);
  const programs = patient?.programs.filter((p) => p.active) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">{t('cg.title')}</h1>
        <span className="rounded-full bg-care px-3 py-1 text-xs font-bold tracking-wider text-white">{t('common.caregiver_mode')}</span>
      </div>
      <p className="mt-1 text-navy-soft">{t('cg.helping', { name: patient?.name ?? t('cg.the_patient') })}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {SETUP.map(({ icon: Icon, key }, i) => (
          <div key={key} className="rounded-2xl border-2 border-care/30 bg-care-soft p-5">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-care">
              <Icon size={34} />
            </div>
            <div className="text-xs font-bold text-care">{t('cg.step', { n: i + 1 })}</div>
            <h2 className="text-lg font-semibold">{t(`${key}_title`)}</h2>
            <p className="mt-1 text-sm text-navy-soft">{t(`${key}_body`)}</p>
          </div>
        ))}
      </div>

      <Card className="mt-6 border-care/30">
        <CardTitle icon={<Play size={20} className="text-care" />}>{t('cg.their_program')}</CardTitle>
        {programs.length === 0 ? (
          <p className="text-navy-soft">{t('cg.no_program')}</p>
        ) : (
          <ul className="space-y-3">
            {programs.map((p) => {
              const ex = getExercise(p.exercise_id);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-care-soft/60 p-4">
                  <div>
                    <div className="text-lg font-semibold">{exerciseName(t, p.exercise_id)}</div>
                    <div className="text-sm text-navy-soft">{planText(t, ex, p.sets, p.reps)}</div>
                  </div>
                  <Button variant="care" size="lg" className="min-h-14" onClick={() => start(p.exercise_id)}>
                    <Play size={18} /> {t('cg.start_with_helper')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ManualLog patientId={patientId} />
      <ExerciseLibrary onStart={start} caregiver />
      <Disclaimer />
      {checkIn}
    </div>
  );
}
