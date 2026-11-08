// Adaptive coach API (SPEC §17). Answers are proposals: coach/flow.ts validates them.
import type { CoachDeps, CoachLanguage, PlanRequest } from '../coach';
import { api } from './client';

// The server tries several models within 9 s; allow for the network on top of that.
const COACH_TIMEOUT_MS = 12_000;

export function coachDeps(patientId?: string): CoachDeps {
  return {
    extract: (text: string, language: CoachLanguage) =>
      api('/coach/extract', { method: 'POST', body: JSON.stringify({ text, language, patient_id: patientId }) }, COACH_TIMEOUT_MS),
    plan: (body: PlanRequest) =>
      api(
        '/coach/plan',
        {
          method: 'POST',
          body: JSON.stringify({
            ...body,
            patient_id: patientId,
            // The API takes holdSeconds only for hold exercises.
            library: body.library.map(({ holdSeconds, ...rest }) => (holdSeconds ? { ...rest, holdSeconds } : rest)),
          }),
        },
        COACH_TIMEOUT_MS,
      ),
  };
}
