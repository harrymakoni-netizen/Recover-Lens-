// UI text in English, chiShona and isiNdebele. English is the source; a missing key falls back to
// English. Exercise names, descriptions and steps come from the ExerciseConfig objects, so the
// English for those lives in one place and only the translations are stored here.
import { EXERCISES } from '../exercises';
import type { AnyExercise } from '../exercises/types';
import type { Lang } from '../voice/phrases';
import en from './en.json';
import nd from './nd.json';
import sn from './sn.json';

export type Vars = Record<string, string | number>;
export type T = (key: string, vars?: Vars) => string;

export const LANGUAGES: Array<{ code: Lang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'sn', label: 'chiShona' },
  { code: 'nd', label: 'isiNdebele' },
];

function exerciseEnglish(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const ex of EXERCISES) {
    out[`ex.${ex.id}.name`] = ex.name;
    out[`ex.${ex.id}.desc`] = ex.description;
    ex.steps.forEach((s, i) => {
      out[`ex.${ex.id}.step${i + 1}`] = s;
    });
  }
  return out;
}

export const TABLES: Record<Lang, Record<string, string>> = {
  en: { ...en, ...exerciseEnglish() },
  sn,
  nd,
};

export function fill(template: string, vars?: Vars): string {
  return vars ? template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : template;
}

export function translate(lang: Lang, key: string, vars?: Vars): string {
  return fill(TABLES[lang][key] ?? TABLES.en[key] ?? key, vars);
}

/**
 * Read the numbers back out of text that was stored in English from one of the en.json templates
 * (sports observations, backend alerts), so it can be shown in another language.
 */
export function parseWithTemplate(key: string, text: string): Record<string, number> | null {
  const template = TABLES.en[key];
  if (!template) return null;
  const names: string[] = [];
  const pattern = template
    .split(/(\{\w+\})/)
    .map((part) => {
      const m = /^\{(\w+)\}$/.exec(part);
      if (!m) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      names.push(m[1]);
      return '(-?\\d+(?:\\.\\d+)?)';
    })
    .join('');
  const match = new RegExp(`^${pattern}$`).exec(text.trim());
  if (!match) return null;
  return Object.fromEntries(names.map((n, i) => [n, Number(match[i + 1])]));
}

export function exerciseName(t: T, id: string): string {
  const key = `ex.${id}.name`;
  const name = t(key);
  return name === key ? id.replace(/_/g, ' ') : name;
}

export function exerciseDescription(t: T, ex: AnyExercise): string {
  return t(`ex.${ex.id}.desc`);
}

export function exerciseSteps(t: T, ex: AnyExercise): string[] {
  return ex.steps.map((_, i) => t(`ex.${ex.id}.step${i + 1}`));
}

// Month abbreviations (CLDR). Browsers often lack sn/nd locale data, so dates are built here.
const MONTHS: Record<Exclude<Lang, 'en'>, string[]> = {
  sn: ['Ndi', 'Kuk', 'Kur', 'Kub', 'Chv', 'Chk', 'Chg', 'Nya', 'Gun', 'Gum', 'Mbu', 'Zvi'],
  nd: ['Zib', 'Nhlo', 'Mbi', 'Mab', 'Nkw', 'Nhla', 'Ntu', 'Ncw', 'Mpan', 'Mfu', 'Lwe', 'Mpal'],
};

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso: string | null | undefined, lang: Lang = 'en'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (lang === 'en') return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
}

export function formatDateTime(iso: string | null | undefined, lang: Lang = 'en'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (lang === 'en') {
    return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return `${formatDate(iso, lang)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function relativeDays(t: T, iso: string | null | undefined): string {
  if (!iso) return t('time.never');
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return t('time.today');
  if (days === 1) return t('time.yesterday');
  return t('time.days_ago', { n: days });
}
