# RecoverLens — rules for Claude Code

The spec is `docs/SPEC.md`. Reference sections in commits (e.g. "SPEC §5.4").

## Rules

1. **The Mirror is the product.** Nothing may cover the patient's face or torso on the camera screen. HUD is bottom-anchored (SPEC §7.2).
2. **No compliance gating.** Never add "pilot", "restricted", "blocked", "not approved" wording or flows that stop a patient starting an exercise. The only allowed interruption is the pain check-in (SPEC §8.1). One muted disclaimer line is enough.
3. **Pose logic is pure TypeScript** in `frontend/src/pose/` (no React, no DOM). Exercise behaviour lives in `ExerciseConfig` objects in `frontend/src/exercises/`; components never hard-code exercise logic.
4. **Every completed rep counts.** `correctReps` is tracked separately. Rep counter changes need tests in `frontend/src/pose/__tests__/repCounter.test.ts`.
5. **Per-frame data goes through refs**, never React state. The HUD re-renders at most ~10×/s. One state machine per set, kept in a `useRef`.
6. **Angles in pixel space** (SPEC §5.2). Label left/right by the patient's side, not screen side.
7. **Dashboards fetch on mount and poll every 5 s.** No WebSockets. On API failure show cached data with an "Offline" dot, never an empty "Reconnecting" screen.
8. **Never show hard-coded results** as if they were real (screenings, sessions). Empty states are honest.
9. **No diagnostic language** — "observation", "review", not "injury risk detected".
10. Thresholds that need real-world tuning are marked `// TUNE:`.

## Commands

```sh
# frontend (from frontend/)
npm install
npm run dev          # http://localhost:5173, proxies /api to :8000
npm test             # Vitest
npm run build        # typecheck + production build

# backend (from backend/)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
pytest
```

Before committing: `npm test`, `npm run build` (frontend) and `pytest` (backend) must pass.
