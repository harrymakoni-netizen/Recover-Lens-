// Red-flag rules (SPEC §8.1, §17.2). Plain code, checked before any model call. The model can add a
// red flag (it reads wording these patterns miss) but can never clear one.
import type { CheckIn, Extraction, RedFlag } from './types';
import { RED_FLAGS } from './types';

/** Same threshold as the pain check-in advice. */
export const SEVERE_PAIN = 8;

// English, plus the clearest chiShona and isiNdebele words, so a red flag is still caught when the
// model is busy or turned off. Matched whatever language is selected (people mix languages).
const PATTERNS: Array<[RedFlag, RegExp]> = [
  ['chest_pain', /\bchest\b[^.,;!?]{0,25}\b(pain|ache|aches|hurts?|tight|tightness|pressure|heavy)\b|\bpain\s+in\s+(my\s+)?chest\b/i],
  ['numbness', /\bnumb(ness)?\b|\btingl(e|es|ing|y)\b|\bpins and needles\b|\bcan'?t feel\b/i],
  ['swelling', /\bswell(ing|ed|s)?\b|\bswollen\b/i],
  ['fall', /\bi\s+fell\b|\bfell\s+(over|down|off)\b|\b(had|took)\s+a\s+fall\b|\bfallen\b/i],
  ['dizziness', /\bdizz(y|iness)\b|\bfaint(ed|ing)?\b|\blight-?headed\b|\bpassed out\b/i],
  ['breathless', /\bshort(ness)? of breath\b|\bbreathless\b|\bcan'?t breathe\b/i],
  ['severe_pain', /\b(severe|unbearable|excruciating|worst)\s+pain\b|\bpain\s+is\s+(severe|unbearable)\b/i],
  // TUNE: chiShona and isiNdebele word stems; a native speaker and a physiotherapist should review them.
  // chiShona: chipfuva (chest), zvimba (swell), wira/donha (fall), dzungu (dizziness).
  // isiNdebele: isifuba (chest), vuvuk- (swell), ngiwe/ngawa/ukuwa (fell), (i)siyezi/inzululwane (dizziness).
  ['chest_pain', /chipfuva|\b(i|e)sifub(a|eni)\b/i],
  ['swelling', /zvimba|vuvuk/i],
  ['fall', /wira\b|wirwa\b|donha|\bngiwe\b|\bngawa\b|\bukuwa\b/i],
  ['dizziness', /dzungu|siyezi|nzululwane/i],
];

export function redFlagsFromText(text: string): RedFlag[] {
  return PATTERNS.filter(([, re]) => re.test(text)).map(([flag]) => flag);
}

/** Every red flag from the ticked boxes, the pain slider, the text patterns and the model, in a stable order. */
export function collectRedFlags(checkIn: CheckIn, extraction?: Extraction | null): RedFlag[] {
  const found = new Set<RedFlag>(checkIn.redFlags);
  if (checkIn.pain !== null && checkIn.pain >= SEVERE_PAIN) found.add('severe_pain');
  for (const f of redFlagsFromText(checkIn.text)) found.add(f);
  if (extraction) {
    for (const f of extraction.redFlags) found.add(f);
    if (extraction.painLevel !== null && extraction.painLevel >= SEVERE_PAIN) found.add('severe_pain');
  }
  return RED_FLAGS.filter((f) => found.has(f));
}
