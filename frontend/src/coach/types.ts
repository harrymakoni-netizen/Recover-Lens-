// Adaptive coach types (SPEC §17). Pure TypeScript: no React, no DOM.
//
// The model (Gemini) only ever produces data in these shapes. Plain code decides what a patient is
// allowed to do: red flags are checked before any model call, and every plan passes the validator.

export type BodyArea = 'neck' | 'shoulder' | 'elbow' | 'wrist' | 'back' | 'hip' | 'knee' | 'ankle' | 'other';
export type Energy = 'low' | 'ok' | 'high';
export type Barrier = 'pain' | 'time' | 'motivation' | 'forgot' | 'space' | 'other';
export type RedFlag = 'severe_pain' | 'chest_pain' | 'numbness' | 'swelling' | 'fall' | 'dizziness' | 'breathless';
/** Behaviour-change techniques the coach may name; the "why" panel shows the one used. */
export type Technique = 'goal_setting' | 'self_monitoring' | 'graded_tasks' | 'action_planning' | 'social_support';

export const BODY_AREAS: readonly BodyArea[] = ['neck', 'shoulder', 'elbow', 'wrist', 'back', 'hip', 'knee', 'ankle', 'other'];
export const ENERGIES: readonly Energy[] = ['low', 'ok', 'high'];
export const BARRIERS: readonly Barrier[] = ['pain', 'time', 'motivation', 'forgot', 'space', 'other'];
export const RED_FLAGS: readonly RedFlag[] = ['severe_pain', 'chest_pain', 'numbness', 'swelling', 'fall', 'dizziness', 'breathless'];
export const TECHNIQUES: readonly Technique[] = ['goal_setting', 'self_monitoring', 'graded_tasks', 'action_planning', 'social_support'];

/** What the person entered: free text plus the one-tap answers. */
export interface CheckIn {
  text: string;
  /** 0–10 from the pain slider, if answered. */
  pain: number | null;
  /** Red flags ticked directly. */
  redFlags: RedFlag[];
  minutes: number | null;
  energy: Energy | null;
}

/** Structured facts from the check-in text (model output after parseExtraction). */
export interface Extraction {
  painLevel: number | null;
  bodyAreas: BodyArea[];
  symptoms: string[];
  energy: Energy | null;
  minutesAvailable: number | null;
  barriers: Barrier[];
  redFlags: RedFlag[];
}

export interface PlanItem {
  exerciseId: string;
  sets: number;
  reps: number;
  /** Seconds per hold, for hold exercises. */
  holdSeconds?: number;
}

export interface Plan {
  items: PlanItem[];
  technique: Technique;
  /** Plain-language reason from the model, in the person's language. Empty for rules-only plans. */
  why: string;
  /** i18n key for the reason when the plan came from the rules (no model). */
  whyKey?: string;
  source: 'model' | 'rules';
}

export const EMPTY_EXTRACTION: Extraction = {
  painLevel: null,
  bodyAreas: [],
  symptoms: [],
  energy: null,
  minutesAvailable: null,
  barriers: [],
  redFlags: [],
};
