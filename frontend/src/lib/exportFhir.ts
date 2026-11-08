// Clinician export as a FHIR R4 Bundle (SPEC §17.7): one Observation per session, so a clinic system
// can import RecoverLens progress. Pain uses LOINC; the other measures use a RecoverLens code system.
import type { PatientDetail, SessionRecord } from '../api/types';

const CS = 'https://recover-lens.vercel.app/fhir/CodeSystem/session-measure';
const LOINC = 'http://loinc.org';
const UCUM = 'http://unitsofmeasure.org';

type Quantity = { value: number; unit: string; system: string; code: string };
const qty = (value: number, unit: string, code: string): Quantity => ({ value, unit, system: UCUM, code });

function component(system: string, code: string, display: string, value: Quantity | null) {
  return value === null ? [] : [{ code: { coding: [{ system, code, display }], text: display }, valueQuantity: value }];
}

export function sessionObservation(s: SessionRecord, patientRef: string, exerciseName: (id: string) => string) {
  const num = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const n = (v: number | null | undefined, unit: string, code: string) => (num(v) === null ? null : qty(num(v)!, unit, code));
  return {
    resourceType: 'Observation',
    id: s.id,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'activity', display: 'Activity' }] }],
    code: { coding: [{ system: CS, code: s.exercise_id, display: exerciseName(s.exercise_id) }], text: `${exerciseName(s.exercise_id)} session` },
    subject: { reference: patientRef },
    effectiveDateTime: s.started_at,
    component: [
      ...component(CS, 'reps', 'Repetitions completed', n(s.reps, '{reps}', '{reps}')),
      ...component(CS, 'correct-reps', 'Repetitions with good form', n(s.correct_reps, '{reps}', '{reps}')),
      ...component(CS, 'movement-score', 'Movement score (0-100)', n(s.movement_score, '{score}', '{score}')),
      ...component(CS, 'top-angle', 'Average top joint angle', n(s.avg_top_angle, 'deg', 'deg')),
      ...component(CS, 'duration', 'Session duration', n(s.duration_s, 's', 's')),
      ...component(CS, 'load', 'Weight held', n(s.load_kg, 'kg', 'kg')),
      ...component(CS, 'peak-torque', 'Estimated peak joint load', n(s.peak_torque_nm, 'N.m', 'N.m')),
      ...component(LOINC, '72514-3', 'Pain severity before exercise (0-10)', n(s.pain_before, '{score}', '{score}')),
      ...component(LOINC, '72514-3', 'Pain severity after exercise (0-10)', n(s.pain_after, '{score}', '{score}')),
    ],
    note: s.top_fault ? [{ text: `Most frequent form observation: ${s.top_fault}` }] : undefined,
  };
}

export function patientBundle(patient: PatientDetail, exerciseName: (id: string) => string, now = new Date()) {
  const ref = `Patient/${patient.id}`;
  const sessions = [...patient.sessions].sort((a, b) => a.started_at.localeCompare(b.started_at));
  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: now.toISOString(),
    entry: [
      { fullUrl: ref, resource: { resourceType: 'Patient', id: patient.id, name: [{ text: patient.name }] } },
      ...sessions.map((s) => ({ fullUrl: `Observation/${s.id}`, resource: sessionObservation(s, ref, exerciseName) })),
    ],
  };
}
