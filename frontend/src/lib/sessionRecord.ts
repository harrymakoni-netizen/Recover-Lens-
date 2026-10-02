import type { SessionMode, SessionRecord } from '../api/types';
import type { FaultRuleId } from '../pose/formRules';
import type { SessionSummary } from '../pose/sessionEngine';

export const FAULT_LABELS: Record<FaultRuleId, string> = {
  torso_lean: 'Torso leaning',
  asymmetry: 'Uneven sides',
  elbow_bend: 'Bent elbows',
  back_arch: 'Arched back',
  knee_valgus: 'Knees drifting inward',
  weight_shift: 'Weight shifting',
  heel_rise: 'Heels lifting',
  pelvis_drop: 'Hip dropping',
  not_high_enough: 'Partial range',
};

export const FAULT_RECOMMENDATIONS: Record<FaultRuleId, string> = {
  torso_lean: 'Keep your torso upright. Try the movement standing with your back near a wall.',
  asymmetry: 'Slow down so both sides move together.',
  elbow_bend: 'Keep your elbows straight through the whole movement.',
  back_arch: 'Tighten your stomach muscles to stop your back arching.',
  knee_valgus: 'Keep your knees in line with your toes.',
  weight_shift: 'Spread your weight evenly over both feet.',
  heel_rise: 'Keep your heels on the floor; ankle mobility work may help.',
  pelvis_drop: 'Keep your hips level; hip strengthening may help.',
  not_high_enough: 'Work towards the full range, staying within a pain-free range.',
};

export function recommendationFor(fault: string | null | undefined): string {
  if (!fault) return 'Good form. Keep it up.';
  return FAULT_RECOMMENDATIONS[fault as FaultRuleId] ?? 'Keep practising with control.';
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
  };
}

/** Short plain-text summary for WhatsApp (caregiver Share, SPEC §8.3). */
export function shareText(record: SessionRecord, exerciseName: string, patientName?: string): string {
  const lines = [
    `RecoverLens session${patientName ? ` — ${patientName}` : ''}`,
    `${exerciseName}: ${record.reps} reps (${record.correct_reps} with good form)`,
  ];
  if (record.movement_score !== null) lines.push(`Movement score: ${Math.round(record.movement_score)}/100`);
  if (record.avg_top_angle !== null) lines.push(`Average angle at top: ${Math.round(record.avg_top_angle)}°`);
  if (record.pain_after !== null) {
    lines.push(`Pain after: ${record.pain_after}/10${record.pain_confirmed_by_patient ? '' : ' (logged by caregiver)'}`);
  }
  if (record.top_fault) lines.push(`Focus: ${FAULT_LABELS[record.top_fault as FaultRuleId] ?? record.top_fault}`);
  return lines.join('\n');
}
