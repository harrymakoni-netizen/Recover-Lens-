// Text for stored records in the UI language. Screenings and alerts are saved in English (the
// backend and older records know nothing about languages); these helpers read the numbers back
// out with the English templates and fill in the translation. Unknown text is shown as stored.
import type { Alert, Observation } from '../api/types';
import type { BatteryStep } from '../pose/screening';
import { type T, TABLES, parseWithTemplate } from './index';

export function sportName(t: T, sport: string): string {
  const key = `sport.${sport}`;
  const name = t(key);
  return name === key ? sport : name;
}

export function sportBlurb(t: T, sport: string): string {
  return t(`sport.${sport}_blurb`);
}

export function stepLabel(t: T, step: BatteryStep): string {
  const key = `step.${step.id}`;
  return key in TABLES.en ? t(key, { seconds: step.holdSeconds ?? 0 }) : step.label;
}

// Recommendation sentences an observation can combine (pose/screening.ts → REC and FIFA).
const REC_KEYS = Object.keys(TABLES.en).filter((k) => k.startsWith('obsrec.'));

function recommendationText(t: T, text: string): string {
  const found = REC_KEYS.map((key) => ({ key, at: text.indexOf(TABLES.en[key]) }))
    .filter((r) => r.at >= 0)
    .sort((a, b) => a.at - b.at);
  const covered = found.reduce((n, r) => n + TABLES.en[r.key].length, 0) + Math.max(0, found.length - 1);
  // Only translate when the whole text is made of known sentences.
  if (!found.length || covered !== text.trim().length) return text;
  return found.map((r) => t(r.key)).join(' ');
}

export function describeObservation(t: T, o: Observation): { label: string; detail: string; recommendation: string | null } {
  const labelKey = `obs.${o.id}`;
  const label = labelKey in TABLES.en ? t(labelKey) : o.label;
  let detail = o.detail;
  for (const variant of ['bad', 'good']) {
    const key = `${labelKey}.${variant}`;
    const vars = parseWithTemplate(key, o.detail);
    if (vars) {
      detail = t(key, vars);
      break;
    }
  }
  return { label, detail, recommendation: o.recommendation && recommendationText(t, o.recommendation) };
}

const ALERT_TEMPLATES = ['alert.score_drop', 'alert.rom', 'alert.pain', 'alert.no_session', 'alert.no_session_new'];

export function alertType(t: T, a: Alert): string {
  const key = `alert.type.${a.type}`;
  return key in TABLES.en ? t(key) : a.type;
}

export function alertMessage(t: T, a: Alert): string {
  for (const key of ALERT_TEMPLATES) {
    const vars = parseWithTemplate(key, a.message);
    if (vars) return t(key, vars);
  }
  return a.message;
}
