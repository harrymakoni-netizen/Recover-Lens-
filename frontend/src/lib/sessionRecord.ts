import type { SessionMode, SessionRecord } from '../api/types';
import type { T } from '../i18n';
import type { SessionSummary } from '../pose/sessionEngine';

/** Short name of a form fault ("Torso leaning"), in the UI language. */
export function faultLabel(t: T, fault: string): string {
  const key = `fault.${fault}`;
  const text = t(key);
  return text === key ? fault : text;
}

/** One-line advice for the most common fault, or praise when there was none. */
export function recommendationFor(t: T, fault: string | null | undefined): string {
  if (!fault) return t('rec.good');
  const key = `rec.${fault}`;
  const text = t(key);
  return text === key ? t('rec.default') : text;
}

export function buildSessionRecord(args: {
  id: string;
  summary: SessionSummary;
  patientId: string;
  mode: SessionMode;
  startedAt: string;
  painBefore: number | null;
  painAfter: number | null;
  painConfirmed: boolean;
}): SessionRecord {
  const s = args.summary;
  const r = (v: number | null, d = 1) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);
  return {
    id: args.id,
    patient_id: args.patientId,
    exercise_id: s.exerciseId,
    mode: args.mode,
    started_at: args.startedAt,
    duration_s: Math.round(s.durationS),
    reps: s.reps,
    correct_reps: s.correctReps,
    avg_top_angle: r(s.avgTopAngle),
    movement_score: r(s.movementScore),
    torso_alignment_avg: r(s.torsoAlignmentAvg),
    symmetry_avg: r(s.symmetryAvg),
    top_fault: s.topFault,
    pain_before: args.painBefore,
    pain_after: args.painAfter,
    pain_confirmed_by_patient: args.mode === 'self' ? true : args.painConfirmed,
    fatigue_level: s.fatigue?.level ?? null,
    fatigue_slower_pct: s.fatigue?.slowerPct ?? null,
    fatigue_shorter_pct: s.fatigue?.shorterPct ?? null,
    fatigue_form_points: s.fatigue?.formPoints ?? null,
  };
}

/** Short plain-text summary for WhatsApp (caregiver Share, SPEC §8.3). */
export function shareText(t: T, record: SessionRecord, exerciseName: string, patientName?: string): string {
  const lines = [
    patientName ? t('share.header', { name: patientName }) : t('share.title'),
    t('share.reps', { exercise: exerciseName, reps: record.reps, correct: record.correct_reps }),
  ];
  if (record.movement_score !== null) lines.push(t('share.score', { score: Math.round(record.movement_score) }));
  if (record.avg_top_angle !== null) lines.push(t('share.angle', { angle: Math.round(record.avg_top_angle) }));
  if (record.pain_after !== null) {
    lines.push(t(record.pain_confirmed_by_patient ? 'share.pain' : 'share.pain_cg', { pain: record.pain_after }));
  }
  if (record.top_fault) lines.push(t('share.focus', { fault: faultLabel(t, record.top_fault) }));
  return lines.join('\n');
}
