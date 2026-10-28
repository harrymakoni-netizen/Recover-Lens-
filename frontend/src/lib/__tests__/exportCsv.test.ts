import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '../../api/types';
import { sessionsCsv } from '../exportCsv';

const base: SessionRecord = {
  id: 'a', patient_id: 'p', exercise_id: 'mini_squat', mode: 'self', started_at: '2026-10-02T09:00:00Z', duration_s: 120,
  reps: 30, correct_reps: 26, avg_top_angle: 134, movement_score: 82.1, torso_alignment_avg: 86, symmetry_avg: 88,
  top_fault: 'knee_valgus', pain_before: 3, pain_after: 6, pain_confirmed_by_patient: true, fatigue_level: 'clear',
};

describe('clinician CSV export', () => {
  it('has one header row and one row per session, oldest first', () => {
    const later = { ...base, id: 'b', started_at: '2026-10-05T09:00:00Z', reps: 10 };
    const csv = sessionsCsv([later, base], () => 'Mini Squat').trim().split('\r\n');
    expect(csv).toHaveLength(3);
    expect(csv[0].startsWith('exercise,started_at,exercise_id,mode')).toBe(true);
    expect(csv[1]).toContain('2026-10-02T09:00:00Z');
    expect(csv[2]).toContain(',10,');
  });

  it('quotes text with commas or quotes and leaves missing values empty', () => {
    const row = sessionsCsv([{ ...base, movement_score: null }], () => 'Squat, "mini"').trim().split('\r\n')[1];
    expect(row.startsWith('"Squat, ""mini""",')).toBe(true);
    expect(row).toContain(',,'); // missing score
    expect(row.endsWith(',false')).toBe(true); // manual defaults to false
  });
});
