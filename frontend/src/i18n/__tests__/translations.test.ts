import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Alert, Observation } from '../../api/types';
import { BATTERIES, type BatteryStep, type Sport, type StepResult, analyzeScreening } from '../../pose/screening';
import type { HoldRecord, RepRecord, SessionSummary } from '../../pose/sessionEngine';
import { PHRASES, PILLS } from '../../voice/phrases';
import { TABLES, formatDate, translate } from '../index';
import { alertMessage, alertType, describeObservation, stepLabel } from '../records';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const t = (key: string, vars?: Record<string, string | number>) => translate('sn', key, vars);

describe('UI text (SPEC §8.1 languages)', () => {
  for (const lang of ['sn', 'nd'] as const) {
    it(`${lang} has every English key, with the same placeholders`, () => {
      for (const [key, english] of Object.entries(TABLES.en)) {
        const text = TABLES[lang][key];
        expect(text, `${lang} ${key}`).toBeTruthy();
        expect(placeholders(text), `${lang} ${key}`).toEqual(placeholders(english));
      }
      expect(Object.keys(TABLES[lang]).filter((k) => !(k in TABLES.en))).toEqual([]);
    });
  }

  it('every key written in the code exists in English', () => {
    const root = join(__dirname, '..', '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (name !== '__tests__') walk(p);
        } else if (/\.tsx?$/.test(name)) files.push(p);
      }
    };
    walk(root);
    const missing: string[] = [];
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\btr?\('([^']+)'/g)) {
        if (!(m[1] in TABLES.en)) missing.push(`${f.slice(root.length)}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('English battery labels match the step labels stored with screenings', () => {
    for (const steps of Object.values(BATTERIES)) {
      for (const step of steps) {
        expect(stepLabel((k, v) => translate('en', k, v), step)).toBe(step.label);
        expect(stepLabel(t, step)).not.toBe(step.label);
      }
    }
  });

  it('formats dates with Shona and Ndebele month names', () => {
    const iso = new Date(2026, 9, 17, 9, 5).toISOString();
    expect(formatDate(iso, 'sn')).toBe('17 Gum');
    expect(formatDate(iso, 'nd')).toBe('17 Mfu');
  });
});

describe('voice cues', () => {
  const NUMBERS = ['n', 'total', 'set', 'sets', 'seconds', 'test'];
  const sideFree = (ph: string[]) => ph.filter((p) => !p.startsWith('side'));

  for (const lang of ['sn', 'nd'] as const) {
    it(`${lang} has every cue and pill, with the same numbers and a side word where English has one`, () => {
      for (const table of [PHRASES, PILLS]) {
        for (const [key, english] of Object.entries(table.en)) {
          if (!english) continue;
          const text = table[lang][key];
          expect(text, `${lang} ${key}`).toBeTruthy();
          const en = placeholders(english);
          const tr = placeholders(text);
          expect(sideFree(tr), `${lang} ${key}`).toEqual(sideFree(en));
          expect(tr.every((p) => NUMBERS.includes(p) || p === 'side_arm' || p === 'side_leg'), `${lang} ${key}`).toBe(true);
          expect(tr.some((p) => p.startsWith('side')), `${lang} ${key}`).toBe(en.includes('side'));
        }
      }
    });
  }
});

// --- Stored records -------------------------------------------------------------------------

function rep(overrides: Partial<RepRecord> = {}): RepRecord {
  return {
    maxValgusL: 0, maxValgusR: 0, maxTorsoLean: 0, maxHeelRise: 0, minSymmetry: 100,
    minKneeL: 100, minKneeR: 100, maxHipDrop: 0, landingKneeMin: 120,
    ...overrides,
  } as RepRecord;
}

function result(step: BatteryStep, reps: RepRecord[], holds: Partial<HoldRecord>[] = []): StepResult {
  const summary = {
    kind: holds.length ? 'hold' : 'reps',
    reps: reps.length,
    repRecords: reps,
    holdRecords: holds as HoldRecord[],
    movementScore: 80,
  } as SessionSummary;
  return { step, summary };
}

function observations(sport: Sport, bad: boolean): Observation[] {
  const out: StepResult[] = [];
  for (const step of BATTERIES[sport]) {
    const r = bad
      ? rep({ maxValgusL: 0.3, maxValgusR: 0.3, maxTorsoLean: 20, maxHeelRise: 0.05, minSymmetry: 50, maxHipDrop: 0.3, landingKneeMin: 170, minKneeL: 150, minKneeR: 150 })
      : rep();
    if (step.exerciseId === 'single_leg_balance') {
      out.push(result(step, [], bad ? [] : [{ maxHipDrop: 0, maxValgus: 0, seconds: 20 }]));
      if (bad) out.push(result(step, [], [{ maxHipDrop: 0.3, maxValgus: 0.3, seconds: 20 }]));
    } else {
      out.push(result(step, [r, r, r, rep(), rep()]));
    }
  }
  return analyzeScreening(sport, out).observations;
}

describe('stored screening observations', () => {
  const sports: Sport[] = ['football', 'basketball', 'running', 'general'];

  it('every observation the analysis can write is shown in Shona, never left in English', () => {
    let seen = 0;
    for (const sport of sports) {
      for (const bad of [false, true]) {
        for (const o of observations(sport, bad)) {
          const text = describeObservation(t, o);
          expect(text.label, o.id).not.toBe(o.label);
          expect(text.detail, `${o.id}: ${o.detail}`).not.toBe(o.detail);
          expect(text.detail).not.toMatch(/\{/);
          if (o.recommendation) expect(text.recommendation, `${o.id}: ${o.recommendation}`).not.toBe(o.recommendation);
          seen += 1;
        }
      }
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('reads the numbers back out of older English records', () => {
    const o: Observation = {
      id: 'squat_valgus_left',
      label: 'Left knee alignment',
      status: 'review',
      detail: 'Left knee drifted inward on 3 of 5 reps',
      recommendation:
        'Consider hip abductor and gluteal strengthening (e.g. FIFA 11+ single-leg stance and squat exercises). FIFA 11+: Squats (With Toe Raise → One-Leg Squats) and Single-Leg Stance.',
    };
    const text = describeObservation(t, o);
    expect(text.detail).toBe('Ibvi reruboshwe rakapinda mukati pakudzokorora 3 pa5');
    expect(text.recommendation).toBe(`${t('obsrec.valgus')} ${t('obsrec.fifa_valgus')}`);
    const depth = describeObservation(t, { id: 'squat_depth', label: 'Squat depth', status: 'good', detail: 'Knees bent to about 98° on average', recommendation: null });
    expect(depth.detail).toBe('Mabvi akakotama kusvika pa98° paavhareji');
  });

  it('leaves unknown text as it was stored', () => {
    const o: Observation = { id: 'something_new', label: 'New check', status: 'good', detail: 'Looked fine', recommendation: 'Keep going.' };
    expect(describeObservation(t, o)).toEqual({ label: 'New check', detail: 'Looked fine', recommendation: 'Keep going.' });
  });
});

describe('clinician alerts', () => {
  const alert = (type: string, message: string) => ({ type, message }) as Alert;

  it('translates every message the backend writes (backend/app/alerts.py)', () => {
    const cases: Array<[Alert, string]> = [
      [alert('Score drop', 'Movement score dropped from 82 to 70.'), 'Mamaki ekufamba adonha kubva pa82 kusvika pa70.'],
      [alert('Range of motion', 'Range of motion decreased 12%.'), 'Kufamba kwenhengo kwaderera ne12%.'],
      [alert('Pain increase', 'Pain increased to 6/10 compared with recent baseline.'), 'Marwadzo awedzera kusvika pa6/10 kana zvichienzaniswa nenguva dzapfuura.'],
      [alert('Adherence', 'No session in the last 4 days.'), 'Hapana kurovedza mumazuva 4 apfuura.'],
      [alert('Adherence', 'No sessions since being added 5 days ago.'), 'Hapana kurovedza kubva pavakawedzerwa mazuva 5 apfuura.'],
    ];
    for (const [a, expected] of cases) {
      expect(alertMessage(t, a)).toBe(expected);
      expect(alertType(t, a)).not.toBe(a.type);
    }
    expect(alertMessage(t, alert('Other', 'Something else.'))).toBe('Something else.');
  });
});
