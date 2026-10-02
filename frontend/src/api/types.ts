// Shapes returned by the FastAPI backend (SPEC §9).

export interface Program {
  id: string;
  patient_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  target_angle: number | null;
  active: boolean;
}

export interface Patient {
  id: string;
  name: string;
  initials: string;
  contact: string;
  condition: string;
  clinician_id: string;
  clinician_name: string | null;
  created_at: string;
  latest_score: number | null;
  adherence: number;
  unresolved_alerts: number;
  last_session_at: string | null;
  session_count: number;
  programs: Program[];
}

export type SessionMode = 'self' | 'caregiver';

export interface SessionRecord {
  id: string;
  patient_id: string;
  exercise_id: string;
  mode: SessionMode;
  started_at: string;
  duration_s: number;
  reps: number;
  correct_reps: number;
  avg_top_angle: number | null;
  movement_score: number | null;
  torso_alignment_avg: number | null;
  symmetry_avg: number | null;
  top_fault: string | null;
  pain_before: number | null;
  pain_after: number | null;
  pain_confirmed_by_patient: boolean;
  /** Logged by hand without the camera (caregiver manual log). */
  manual?: boolean;
}

export interface PatientDetail extends Patient {
  sessions: SessionRecord[];
}

export interface Alert {
  id: string;
  patient_id: string;
  patient_name: string | null;
  session_id: string | null;
  type: string;
  message: string;
  created_at: string;
  resolved: boolean;
}

export type Sport = 'football' | 'basketball' | 'running' | 'general';

export interface Athlete {
  id: string;
  name: string;
  sport: Sport;
  team: string | null;
}

export type ObservationStatus = 'good' | 'review';

export interface Observation {
  id: string;
  label: string;
  status: ObservationStatus;
  detail: string;
  recommendation: string | null;
}

export interface ScreeningResults {
  observations: Observation[];
  tests: Array<{ id: string; name: string; reps?: number; holdSeconds?: number; score: number | null }>;
}

export interface Screening {
  id: string;
  athlete_id: string;
  athlete_name: string | null;
  sport: Sport;
  created_at: string;
  results_json: ScreeningResults;
  overall: ObservationStatus;
}
