// Plan validator (SPEC §17.2): the only gate between the model and the patient. Plain code. It
// never adds an exercise; it removes or clamps anything outside the limits and says why, so the
// "Why am I seeing this?" panel and the audit log can show every change.
import type { LibraryEntry } from './library';
import type { Extraction, Plan, PlanItem, RedFlag } from './types';

export const LIMITS = {
  maxRepIncrease: 0.1, // TUNE: a plan may add at most 10% to the prescribed reps
  painReduceFrom: 4, // TUNE: pain 4–6 where the exercise loads → at most 70% of the prescribed reps
  painReduceFactor: 0.7, // TUNE:
  painExcludeFrom: 7, // TUNE: pain 7+ in a named area → exercises that load it are left out
  minReps: 3, // TUNE: fewer reps than this is not worth a set
  maxItems: 6,
  maxMinutes: 30, // TUNE: longest session the coach plans
  restBetweenSetsS: 30, // TUNE:
  setupPerExerciseS: 30, // TUNE: getting into position and the countdown
} as const;

export type ChangeReason =
  | 'red_flag'
  | 'not_allowed'
  | 'duplicate'
  | 'area_pain'
  | 'too_many'
  | 'sets_capped'
  | 'reps_capped'
  | 'reps_raised'
  | 'hold_capped'
  | 'pain_reduced'
  | 'time_trimmed';

export interface Change {
  exerciseId: string | null;
  reason: ChangeReason;
  from?: number;
  to?: number;
}

export interface ValidationContext {
  library: readonly LibraryEntry[];
  extraction: Extraction;
  /** From collectRedFlags: any red flag means no plan at all. */
  redFlags: readonly RedFlag[];
  /** Minutes the person said they have (the one-tap answer wins over the extracted one). */
  minutesAvailable?: number | null;
}

export interface Validated {
  plan: Plan;
  changes: Change[];
  /** Estimated session length, whole minutes. */
  minutes: number;
}

/** Pain that applies to this exercise: pain with no named area applies everywhere. */
export function painFor(entry: LibraryEntry, ex: Extraction): number {
  if (ex.painLevel === null) return 0;
  if (ex.bodyAreas.length === 0) return ex.painLevel;
  return entry.affects.some((a) => ex.bodyAreas.includes(a)) ? ex.painLevel : 0;
}

export function estimateSeconds(item: PlanItem, entry: LibraryEntry): number {
  const perRep = entry.kind === 'hold' ? (item.holdSeconds ?? entry.holdSeconds ?? entry.secondsPerRep) : entry.secondsPerRep;
  return LIMITS.setupPerExerciseS + item.sets * item.reps * perRep + (item.sets - 1) * LIMITS.restBetweenSetsS;
}

const minRepsFor = (e: LibraryEntry) => Math.min(LIMITS.minReps, e.reps);

export function validatePlan(plan: Plan, ctx: ValidationContext): Validated {
  if (ctx.redFlags.length) {
    return { plan: { ...plan, items: [] }, changes: [{ exerciseId: null, reason: 'red_flag' }], minutes: 0 };
  }
  const byId = new Map(ctx.library.map((e) => [e.id, e]));
  const changes: Change[] = [];
  const seen = new Set<string>();
  let items: PlanItem[] = [];

  for (const raw of plan.items) {
    const e = byId.get(raw.exerciseId);
    if (!e) {
      changes.push({ exerciseId: raw.exerciseId, reason: 'not_allowed' });
      continue;
    }
    if (seen.has(e.id)) {
      changes.push({ exerciseId: e.id, reason: 'duplicate' });
      continue;
    }
    seen.add(e.id);
    const pain = painFor(e, ctx.extraction);
    if (ctx.extraction.bodyAreas.length > 0 && pain >= LIMITS.painExcludeFrom) {
      changes.push({ exerciseId: e.id, reason: 'area_pain' });
      continue;
    }

    const it: PlanItem = { exerciseId: e.id, sets: raw.sets, reps: raw.reps };
    if (it.sets > e.sets) {
      changes.push({ exerciseId: e.id, reason: 'sets_capped', from: it.sets, to: e.sets });
      it.sets = e.sets;
    }
    const minReps = minRepsFor(e);
    let maxReps = Math.max(minReps, Math.floor(e.reps * (1 + LIMITS.maxRepIncrease)));
    if (pain >= LIMITS.painReduceFrom) {
      maxReps = Math.max(minReps, Math.floor(e.reps * LIMITS.painReduceFactor));
      if (it.reps > maxReps) {
        changes.push({ exerciseId: e.id, reason: 'pain_reduced', from: it.reps, to: maxReps });
        it.reps = maxReps;
      }
    }
    if (it.reps > maxReps) {
      changes.push({ exerciseId: e.id, reason: 'reps_capped', from: it.reps, to: maxReps });
      it.reps = maxReps;
    }
    if (it.reps < minReps) {
      changes.push({ exerciseId: e.id, reason: 'reps_raised', from: it.reps, to: minReps });
      it.reps = minReps;
    }
    if (e.kind === 'hold' && e.holdSeconds !== undefined) {
      const hold = raw.holdSeconds ?? e.holdSeconds;
      if (hold > e.holdSeconds) changes.push({ exerciseId: e.id, reason: 'hold_capped', from: hold, to: e.holdSeconds });
      it.holdSeconds = Math.min(hold, e.holdSeconds);
    }
    items.push(it);
  }

  if (items.length > LIMITS.maxItems) {
    for (const it of items.slice(LIMITS.maxItems)) changes.push({ exerciseId: it.exerciseId, reason: 'too_many' });
    items = items.slice(0, LIMITS.maxItems);
  }

  // Fit the time available: fewer sets first, then fewer reps, then drop exercises from the end.
  const minutes = Math.min(ctx.minutesAvailable ?? ctx.extraction.minutesAvailable ?? LIMITS.maxMinutes, LIMITS.maxMinutes);
  const budget = minutes * 60;
  const total = () => items.reduce((s, it) => s + estimateSeconds(it, byId.get(it.exerciseId)!), 0);
  const before = new Map(items.map((it) => [it.exerciseId, `${it.sets}x${it.reps}`]));
  while (items.length && total() > budget) {
    const multi = [...items].reverse().reduce<PlanItem | null>((best, it) => (it.sets > 1 && (!best || it.sets > best.sets) ? it : best), null);
    if (multi) {
      multi.sets--;
      continue;
    }
    const long = [...items].reverse().find((it) => it.reps > minRepsFor(byId.get(it.exerciseId)!));
    if (long) {
      long.reps = Math.max(minRepsFor(byId.get(long.exerciseId)!), Math.floor(long.reps * 0.75));
      continue;
    }
    if (items.length === 1) break;
    items = items.slice(0, -1);
  }
  for (const [id, dose] of before) {
    const now = items.find((it) => it.exerciseId === id);
    if (!now || `${now.sets}x${now.reps}` !== dose) changes.push({ exerciseId: id, reason: 'time_trimmed' });
  }

  return { plan: { ...plan, items }, changes, minutes: Math.ceil(total() / 60) };
}
