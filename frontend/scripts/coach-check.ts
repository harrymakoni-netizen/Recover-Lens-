// Live check of the adaptive coach against a running API (SPEC §17). Not part of `npm test`.
//   cd backend && GEMINI_API_KEY=... uvicorn app.main:app --port 8000
//   cd frontend && npm run coach:check -- [http://localhost:8000]
// Each check-in goes through the same steps as the app: red-flag rules, model extraction, red
// flags again (the model may add one), model plan, then the validator. Prints what changed.
import {
  collectRedFlags,
  libraryFor,
  parseExtraction,
  parsePlan,
  redact,
  rulesPlan,
  validatePlan,
  type CheckIn,
} from '../src/coach';

const API = (process.argv[2] ?? 'http://localhost:8000').replace(/\/$/, '');
const PROGRAM = [
  { exercise_id: 'mini_squat', sets: 3, reps: 10 },
  { exercise_id: 'sit_to_stand', sets: 2, reps: 8 },
  { exercise_id: 'single_leg_balance', sets: 2, reps: 1 },
  { exercise_id: 'shoulder_abduction', sets: 3, reps: 10 },
];
const CASES: Array<{ language: 'en' | 'sn' | 'nd'; checkIn: CheckIn }> = [
  { language: 'en', checkIn: { text: 'knee sore, really tired, only 10 minutes today', pain: null, redFlags: [], minutes: null, energy: null } },
  { language: 'sn', checkIn: { text: 'Ibvi rinorwadza zvishoma, ndine mineti gumi chete', pain: null, redFlags: [], minutes: null, energy: null } },
  { language: 'en', checkIn: { text: 'feeling good, 20 minutes, want to push a bit harder', pain: null, redFlags: [], minutes: null, energy: null } },
  { language: 'en', checkIn: { text: 'my shoulder is really bad today, about 8/10', pain: null, redFlags: [], minutes: 15, energy: null } },
  { language: 'en', checkIn: { text: 'I fell over this morning and my ankle is swollen', pain: null, redFlags: [], minutes: null, energy: null } },
];

async function post(path: string, body: unknown): Promise<{ status: number; json: any }> {
  const r = await fetch(`${API}/api/coach/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
}

const library = libraryFor(PROGRAM);
for (const { language, checkIn } of CASES) {
  console.log(`\n== ${checkIn.text}`);
  const before = collectRedFlags(checkIn);
  if (before.length) {
    console.log(`  red flags before any model call: ${before.join(', ')} -> advice, no plan`);
    continue;
  }
  const ex = await post('extract', { text: redact(checkIn.text).text, language });
  const extraction = ex.status === 200 ? parseExtraction(ex.json.extraction) : null;
  if (!extraction) {
    console.log(`  extraction unavailable (${ex.status}) -> rules-only plan`);
    console.log(`  ${JSON.stringify(rulesPlan(library, { painLevel: checkIn.pain, bodyAreas: [], symptoms: [], energy: checkIn.energy, minutesAvailable: checkIn.minutes, barriers: [], redFlags: [] }, []).plan.items)}`);
    continue;
  }
  console.log(`  extraction (${ex.json.model}): ${JSON.stringify(extraction)}`);
  const flags = collectRedFlags(checkIn, extraction);
  if (flags.length) {
    console.log(`  red flags from the model: ${flags.join(', ')} -> advice, no plan`);
    continue;
  }
  const minutes = checkIn.minutes ?? extraction.minutesAvailable;
  const libBody = library.map(({ id, name, region, kind, sets, reps, holdSeconds }) => ({ id, name, region, kind, sets, reps, ...(holdSeconds ? { holdSeconds } : {}) }));
  const pl = await post('plan', { language, extraction, library: libBody, minutes_available: minutes });
  const proposed = pl.status === 200 ? parsePlan(pl.json.plan) : null;
  const result = proposed ? validatePlan(proposed, { library, extraction, redFlags: flags, minutesAvailable: minutes }) : rulesPlan(library, extraction, flags, minutes);
  console.log(`  plan (${proposed ? pl.json.model : `rules, model ${pl.status}`}): ${JSON.stringify(proposed?.items ?? null)}`);
  console.log(`  validated (${result.minutes} min): ${JSON.stringify(result.plan.items)}`);
  console.log(`  changes: ${result.changes.length ? JSON.stringify(result.changes) : 'none'}`);
  console.log(`  technique: ${result.plan.technique}; why: ${result.plan.why || result.plan.whyKey}`);
}
