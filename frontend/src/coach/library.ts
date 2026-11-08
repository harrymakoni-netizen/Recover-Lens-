// The exercises a plan may use, with the limits the validator enforces (SPEC §17.2).
//
// When the patient has an active programme, the library is that programme: the exercises and the
// sets and reps their physiotherapist prescribed. Without one, it is the patient library with each
// exercise's default dose. Sports screens are never part of a rehab plan.
import { LIBRARY, getExercise, isLive } from '../exercises';
import type { Region } from '../exercises';
import type { BodyArea } from './types';

export interface LibraryEntry {
  id: string;
  name: string;
  region: Region;
  kind: 'reps' | 'hold' | 'guided';
  /** The prescribed (or default) dose: the ceiling for any plan. */
  sets: number;
  reps: number;
  holdSeconds?: number;
  /** Time one rep (or one hold) takes, for the session-length estimate. */
  secondsPerRep: number;
  /** Body areas the exercise loads; pain there restricts it. */
  affects: BodyArea[];
}

export interface ProgramLike {
  exercise_id: string;
  sets: number;
  reps: number;
  active?: boolean;
}

const LIVE_SECONDS_PER_REP = 4; // TUNE: one controlled rep including the return
const AFFECTS: Record<Region, BodyArea[]> = {
  shoulder: ['shoulder', 'neck'],
  elbow: ['elbow', 'wrist'],
  knee: ['knee', 'hip', 'ankle'],
  full_body: ['knee', 'hip', 'ankle', 'back'],
};

function entryFor(id: string, sets?: number, reps?: number): LibraryEntry | null {
  const ex = getExercise(id);
  if (!ex || (isLive(ex) && ex.screeningOnly)) return null;
  const base = {
    id: ex.id,
    name: ex.name,
    region: ex.region,
    sets: sets ?? ex.defaultSets,
    reps: reps ?? ex.defaultReps,
    affects: AFFECTS[ex.region],
  };
  if (!isLive(ex)) return { ...base, kind: 'guided', secondsPerRep: ex.secondsPerRep };
  if (ex.kind === 'hold') return { ...base, kind: 'hold', holdSeconds: ex.holdSeconds ?? 30, secondsPerRep: ex.holdSeconds ?? 30 };
  return { ...base, kind: 'reps', secondsPerRep: Math.max(LIVE_SECONDS_PER_REP, ex.minRepSeconds * 2) };
}

export function libraryFor(programs?: readonly ProgramLike[] | null): LibraryEntry[] {
  const active = (programs ?? []).filter((p) => p.active !== false);
  if (active.length) {
    const seen = new Set<string>();
    return active.flatMap((p) => {
      if (seen.has(p.exercise_id)) return [];
      seen.add(p.exercise_id);
      const e = entryFor(p.exercise_id, p.sets, p.reps);
      return e ? [e] : [];
    });
  }
  return LIBRARY.flatMap((ex) => {
    const e = entryFor(ex.id);
    return e ? [e] : [];
  });
}
