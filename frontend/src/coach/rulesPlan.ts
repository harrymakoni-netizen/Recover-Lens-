// Rules-only plan (SPEC §17.2): used offline, when the model is unavailable, or when the person has
// turned the AI off. Same validator, so the same limits apply.
import type { LibraryEntry } from './library';
import type { Extraction, Plan, RedFlag } from './types';
import { LIMITS, validatePlan, type Validated } from './validator';

const LOW_ENERGY_FACTOR = 0.8; // TUNE: a lighter session on a tired or unmotivated day

export function rulesPlan(
  library: readonly LibraryEntry[],
  extraction: Extraction,
  redFlags: readonly RedFlag[],
  minutesAvailable?: number | null,
): Validated {
  const lighter = extraction.energy === 'low' || extraction.barriers.includes('motivation');
  const plan: Plan = {
    items: library.slice(0, LIMITS.maxItems).map((e) => ({
      exerciseId: e.id,
      sets: lighter ? Math.max(1, e.sets - 1) : e.sets,
      reps: lighter ? Math.max(Math.min(LIMITS.minReps, e.reps), Math.round(e.reps * LOW_ENERGY_FACTOR)) : e.reps,
      ...(e.holdSeconds !== undefined ? { holdSeconds: e.holdSeconds } : {}),
    })),
    technique: 'graded_tasks',
    why: '',
    whyKey: lighter ? 'coach.why_rules_lighter' : 'coach.why_rules',
    source: 'rules',
  };
  return validatePlan(plan, { library, extraction, redFlags, minutesAvailable });
}
