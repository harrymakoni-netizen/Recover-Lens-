// Clinician export: a patient's sessions as CSV, with the API's field names as column headers so
// the file works in Excel, Google Sheets or a research script.
import type { SessionRecord } from '../api/types';

const FIELDS = [
  'started_at', 'exercise_id', 'mode', 'duration_s', 'reps', 'correct_reps', 'movement_score', 'avg_top_angle',
  'torso_alignment_avg', 'symmetry_avg', 'top_fault', 'pain_before', 'pain_after', 'pain_confirmed_by_patient',
  'fatigue_level', 'fatigue_slower_pct', 'fatigue_shorter_pct', 'fatigue_form_points', 'load_kg', 'peak_torque_nm', 'manual',
] as const satisfies ReadonlyArray<keyof SessionRecord>;

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Oldest first. `exerciseName` adds a readable exercise column in the UI language. */
export function sessionsCsv(sessions: readonly SessionRecord[], exerciseName: (id: string) => string): string {
  const rows = [...sessions].sort((a, b) => a.started_at.localeCompare(b.started_at));
  const header = ['exercise', ...FIELDS].join(',');
  const lines = rows.map((s) => [exerciseName(s.exercise_id), ...FIELDS.map((f) => s[f] ?? (f === 'manual' ? false : null))].map(cell).join(','));
  return [header, ...lines].join('\r\n') + '\r\n';
}

/** Save text as a file in the browser. */
export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8'): void {
  // A byte-order mark so Excel opens the UTF-8 file with the right characters.
  const blob = new Blob(['﻿', text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
