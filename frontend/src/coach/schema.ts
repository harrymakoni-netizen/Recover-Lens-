// Turn untrusted model JSON into typed data (SPEC §17.2). Anything malformed becomes null or empty,
// never an exception, so a bad model reply falls back to the rules-only plan.
import type { Barrier, BodyArea, Energy, Extraction, Plan, PlanItem, RedFlag, Technique } from './types';
import { BARRIERS, BODY_AREAS, ENERGIES, RED_FLAGS, TECHNIQUES } from './types';

const MAX_SYMPTOMS = 8;
const MAX_ITEMS = 12;
const MAX_WHY_CHARS = 400;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function num(v: unknown, lo: number, hi: number): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

function listOf<T extends string>(v: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(v)) return [];
  const set = new Set(v.filter((x): x is T => oneOf(x, allowed) !== null));
  return allowed.filter((a) => set.has(a));
}

export function parseExtraction(raw: unknown): Extraction | null {
  if (!isObj(raw)) return null;
  const symptoms = Array.isArray(raw.symptoms)
    ? raw.symptoms.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim().slice(0, 60)).slice(0, MAX_SYMPTOMS)
    : [];
  return {
    painLevel: num(raw.painLevel, 0, 10),
    bodyAreas: listOf<BodyArea>(raw.bodyAreas, BODY_AREAS),
    symptoms,
    energy: oneOf<Energy>(raw.energy, ENERGIES),
    minutesAvailable: num(raw.minutesAvailable, 1, 180),
    barriers: listOf<Barrier>(raw.barriers, BARRIERS),
    redFlags: listOf<RedFlag>(raw.redFlags, RED_FLAGS),
  };
}

export function parsePlan(raw: unknown): Plan | null {
  if (!isObj(raw) || !Array.isArray(raw.items)) return null;
  const items: PlanItem[] = [];
  for (const it of raw.items.slice(0, MAX_ITEMS)) {
    if (!isObj(it) || typeof it.exerciseId !== 'string') continue;
    const sets = num(it.sets, 1, 20);
    const reps = num(it.reps, 1, 100);
    if (sets === null || reps === null) continue;
    const hold = num(it.holdSeconds, 1, 600);
    items.push({ exerciseId: it.exerciseId, sets, reps, ...(hold !== null ? { holdSeconds: hold } : {}) });
  }
  return {
    items,
    technique: oneOf<Technique>(raw.technique, TECHNIQUES) ?? 'graded_tasks',
    why: typeof raw.why === 'string' ? raw.why.trim().slice(0, MAX_WHY_CHARS) : '',
    source: 'model',
  };
}
