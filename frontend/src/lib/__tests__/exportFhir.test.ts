import { describe, expect, it } from 'vitest';
import type { PatientDetail, SessionRecord } from '../../api/types';
import { patientBundle } from '../exportFhir';

const session = (over: Partial<SessionRecord>): SessionRecord =>
  ({ id: 's1', patient_id: 'tendai', exercise_id: 'sit_to_stand', mode: 'self', started_at: '2026-11-04T18:00:00Z', duration_s: 64, reps: 16, correct_reps: 14, avg_top_angle: 158, movement_score: 81, torso_alignment_avg: null, symmetry_avg: null, top_fault: null, pain_before: 2, pain_after: 3, pain_confirmed_by_patient: true, manual: false, ...over }) as SessionRecord;

describe('FHIR export', () => {
  const patient = { id: 'tendai', name: 'Tendai Sibanda', sessions: [session({ id: 's2', started_at: '2026-11-05T18:00:00Z', top_fault: 'knee_valgus', load_kg: null }), session({})] } as unknown as PatientDetail;
  const b = patientBundle(patient, (id) => (id === 'sit_to_stand' ? 'Sit to Stand' : id), new Date('2026-11-08T00:00:00Z'));

  it('is a collection Bundle with the patient first and sessions oldest first', () => {
    expect(b).toMatchObject({ resourceType: 'Bundle', type: 'collection', timestamp: '2026-11-08T00:00:00.000Z' });
    expect(b.entry.map((e) => e.fullUrl)).toEqual(['Patient/tendai', 'Observation/s1', 'Observation/s2']);
  });

  it('writes each session as a final activity Observation with units and LOINC pain scores', () => {
    const obs = b.entry[1].resource as ReturnType<typeof import('../exportFhir').sessionObservation>;
    expect(obs).toMatchObject({ resourceType: 'Observation', status: 'final', subject: { reference: 'Patient/tendai' }, effectiveDateTime: '2026-11-04T18:00:00Z' });
    expect(obs.code.text).toBe('Sit to Stand session');
    const byDisplay = Object.fromEntries(obs.component.map((c) => [c.code.text, c.valueQuantity]));
    expect(byDisplay['Average top joint angle']).toMatchObject({ value: 158, code: 'deg', system: 'http://unitsofmeasure.org' });
    expect(obs.component.filter((c) => c.code.coding[0].code === '72514-3').map((c) => c.valueQuantity.value)).toEqual([2, 3]);
    expect(byDisplay['Weight held']).toBeUndefined(); // missing values are left out, not written as null
  });

  it('keeps form observations as a note, in observation wording', () => {
    const obs = b.entry[2].resource as { note?: Array<{ text: string }> };
    expect(obs.note?.[0].text).toBe('Most frequent form observation: knee_valgus');
  });
});
