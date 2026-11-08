// The check-in flow (SPEC §17.1): red flags → extraction → red flags again → plan → validator.
// Pure TypeScript: the API calls are passed in, so every branch can be tested without a network.
import type { LibraryEntry } from './library';
import { collectRedFlags } from './redFlags';
import { redact } from './redact';
import { rulesPlan } from './rulesPlan';
import { parseExtraction, parsePlan } from './schema';
import type { BodyArea, CheckIn, Extraction, RedFlag } from './types';
import { EMPTY_EXTRACTION } from './types';
import { validatePlan, type Validated } from './validator';

export type CoachLanguage = 'en' | 'sn' | 'nd';

export interface CoachDeps {
  extract(text: string, language: CoachLanguage): Promise<{ extraction: unknown; model: string }>;
  plan(body: PlanRequest): Promise<{ plan: unknown; model: string }>;
}

export interface PlanRequest {
  language: CoachLanguage;
  extraction: Extraction;
  library: Array<Pick<LibraryEntry, 'id' | 'name' | 'region' | 'kind' | 'sets' | 'reps' | 'holdSeconds'>>;
  minutes_available: number | null;
}

export type CoachOutcome =
  | { kind: 'red_flag'; flags: RedFlag[] }
  | {
      kind: 'plan';
      result: Validated;
      extraction: Extraction;
      /** 'model' when the plan came from the AI coach; 'rules' otherwise. */
      source: 'model' | 'rules';
      model: string | null;
      /** True when the AI coach was on but did not answer, so the rules made the plan. */
      fallback: boolean;
    };

/** What the one-tap answers already say, before any model call. */
export function chipExtraction(c: CheckIn): Extraction {
  return { ...EMPTY_EXTRACTION, painLevel: c.pain, energy: c.energy, minutesAvailable: c.minutes };
}

/**
 * Combine the model's reading with the one-tap answers. The safer value wins: the higher pain,
 * every body area and red flag either source names. Minutes and energy the person tapped win.
 */
export function mergeExtraction(chips: Extraction, model: Extraction): Extraction {
  const union = <T>(a: T[], b: T[]) => [...new Set([...a, ...b])];
  const pains = [chips.painLevel, model.painLevel].filter((p): p is number => p !== null);
  return {
    painLevel: pains.length ? Math.max(...pains) : null,
    bodyAreas: union<BodyArea>(chips.bodyAreas, model.bodyAreas),
    symptoms: model.symptoms,
    energy: chips.energy ?? model.energy,
    minutesAvailable: chips.minutesAvailable ?? model.minutesAvailable,
    barriers: union(chips.barriers, model.barriers),
    redFlags: union(chips.redFlags, model.redFlags),
  };
}

export async function runCheckIn(
  checkIn: CheckIn,
  opts: { library: readonly LibraryEntry[]; language: CoachLanguage; useAi: boolean; deps: CoachDeps },
): Promise<CoachOutcome> {
  const first = collectRedFlags(checkIn);
  if (first.length) return { kind: 'red_flag', flags: first };

  const chips = chipExtraction(checkIn);
  const rules = (extraction: Extraction, fallback: boolean): CoachOutcome => ({
    kind: 'plan',
    result: rulesPlan(opts.library, extraction, [], checkIn.minutes),
    extraction,
    source: 'rules',
    model: null,
    fallback,
  });
  if (!opts.useAi || opts.library.length === 0) return rules(chips, false);

  let extraction = chips;
  const text = redact(checkIn.text).text;
  if (text) {
    try {
      const parsed = parseExtraction((await opts.deps.extract(text, opts.language)).extraction);
      if (!parsed) return rules(chips, true);
      extraction = mergeExtraction(chips, parsed);
    } catch {
      return rules(chips, true);
    }
    const flags = collectRedFlags(checkIn, extraction);
    if (flags.length) return { kind: 'red_flag', flags };
  }

  try {
    const res = await opts.deps.plan({
      language: opts.language,
      extraction,
      library: opts.library.map(({ id, name, region, kind, sets, reps, holdSeconds }) => ({ id, name, region, kind, sets, reps, holdSeconds })),
      minutes_available: checkIn.minutes ?? extraction.minutesAvailable,
    });
    const proposed = parsePlan(res.plan);
    if (!proposed) return rules(extraction, true);
    const result = validatePlan(proposed, { library: opts.library, extraction, redFlags: [], minutesAvailable: checkIn.minutes });
    // A model plan the validator emptied for reasons other than pain is no use: the rules try instead.
    if (result.plan.items.length === 0 && !result.changes.some((c) => c.reason === 'area_pain')) return rules(extraction, true);
    return { kind: 'plan', result, extraction, source: 'model', model: res.model, fallback: false };
  } catch {
    return rules(extraction, true);
  }
}
