# RecoverLens

AI rehab mirror in the browser. A phone camera, MediaPipe pose tracking and voice coaching guide patients through rehab exercises. Clinicians and coaches see the results. Team CodeMed · CEAS Hack4Africa 2026.

The full specification is in [`docs/SPEC.md`](docs/SPEC.md). Rules for working on the code are in [`CLAUDE.md`](CLAUDE.md).

> Demonstration build. Exercise targets are illustrative and not yet clinically validated.

## Quick start

Requirements: Node 20+ and Python 3.11+.

```sh
# Backend (http://localhost:8000). Creates and seeds recoverlens.db on first start.
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (http://localhost:5173). /api is proxied to :8000.
cd frontend
npm install          # also copies the MediaPipe WASM into public/mediapipe
npm run dev
```

Open http://localhost:5173 on a laptop. On a phone, the camera only works over **HTTPS**, so use the deployed URL or an HTTPS tunnel.

Useful URLs:
- `/mirror/shoulder_abduction?reps=5`: short demo set (SPEC §15)
- add `&debug=1` for the debug panel: FPS, raw and smoothed angle, state, and a **Record landmarks** button
- `/mirror/shoulder_abduction?mode=caregiver`: caregiver mode
- `POST /api/seed`: reset the demo data

## Tests

```sh
cd frontend && npm test     # 78 Vitest tests
cd backend && pytest        # 18 API tests
```

The frontend tests cover every rep-counter case in SPEC §12.2, including holding 3 s at the top. They also cover form rules, scoring, geometry, the voice queue, cue mapping and sports screening analysis. End-to-end engine tests run on a synthetic body: calibration "step back", 10/10 reps with pauses, amber within 0.5 s of leaning, squats, single-leg balance, and counting at 4 fps.

### Recorded-landmarks fixture

`frontend/src/pose/__tests__/replay.test.ts` replays every `fixtures/*_<N>reps.json` file through the full engine and requires exactly N reps. The bundled fixture is **synthetic** (made by the test simulator), not a real recording. Before the final:

1. Open `/mirror/shoulder_abduction?reps=10&debug=1` on a phone.
2. Tap **Record landmarks**, do 10 reps, then tap **Stop & download**.
3. Save the file as `frontend/src/pose/__tests__/fixtures/recorded_shoulder_abduction_10reps.json` and run `npm test`.

## Layout

```
docs/                 SPEC.md, exercise_library.json, reference images
frontend/src/pose/    pure TypeScript pose engine (no React): geometry, smoothing, calibration,
                      repCounter, holdTimer, formRules, scoring, screening, sessionEngine
frontend/src/exercises/  one ExerciseConfig per exercise
frontend/src/voice/   voiceEngine (priorities and cooldowns), phrases (en/sn/nd), cue mapping
frontend/src/hooks/   useCamera, usePoseLandmarker, useSession, useApi
frontend/src/api/     fetch client (5 s timeout), IndexedDB offline queue, sync status
frontend/public/models/pose_landmarker_lite.task   self-hosted model
backend/app/          FastAPI + SQLModel (SQLite), alerts.py (recovery intelligence), seed.py
```

## Deploy

- **Frontend:** Vercel (`frontend/vercel.json`) or Netlify (`public/_redirects`). Build with `npm run build` and set `VITE_API_URL=https://<backend>/api`.
- **Backend:** Render (`render.yaml`). Set `FRONTEND_ORIGINS` to the frontend URL. SQLite is reseeded on a fresh instance; set `DATABASE_URL` to Postgres to keep data.
- A service worker caches the app shell and pose model, so the app reopens offline after the first visit.

## Where this build differs from the spec

- **Front-view knee angles are 3D.** From the front, a squat bends the knee towards the camera, so the flat 2D hip–knee–ankle angle barely changes. Mini squat, the squat screen and single-leg squat use MediaPipe world landmarks. Shoulder and side-view angles stay 2D in pixel space (§5.2).
- **Smoothing is time-based.** The §5.3/§5.6 alphas apply at 30 fps and are rescaled for slower frame rates. Without this, a slow phone lagged behind the body and missed reps.
- **Compact HUD also on short screens.** The merged bottom bar is used under 640 px wide *or* under 520 px tall (landscape phones), so the panels never cover the torso.
- **Countdown shows in the instruction pill**, not over the body.
- **Side-view exercises track whichever side faces the camera** (`side: 'auto'`).
- **Guided timer mode** covers shoulder rotations, pendulum, quad set, straight leg raise, heel slide and step-up.
- **Range-of-motion alerts know direction:** a deeper squat (smaller angle) is progress, not a drop.

## Still to do before the final

- Record a real landmark fixture (above) and tune the `// TUNE:` thresholds on 3–5 people.
- Have native speakers check the Shona and Ndebele phrases (`frontend/src/voice/phrases.ts`, `src/i18n/`).
- Test on iPhone Safari and Android Chrome over HTTPS (camera, speech unlock, GPU→CPU fallback).
