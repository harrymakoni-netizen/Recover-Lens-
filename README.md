# RecoverLens

AI rehab mirror in the browser. A phone camera, MediaPipe pose tracking and voice coaching guide patients through rehab exercises. Clinicians and coaches see the results. Harry James Makoni · TENT Gig 2026.

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
cd frontend && npm test     # 87 Vitest tests
cd backend && pytest        # 18 API tests (TEST_DATABASE_URL=postgresql://… runs them on Postgres)
```

The frontend tests cover every rep-counter case in SPEC §12.2, including holding 3 s at the top. They also cover form rules, scoring, geometry, the voice queue, cue mapping and sports screening analysis. End-to-end engine tests run on a synthetic body: calibration "step back", 10/10 reps with pauses, amber within 0.5 s of leaning, squats, single-leg balance, single-arm abduction, visibility flicker, and counting at 4 fps.

### Recorded-landmarks fixtures

`frontend/src/pose/__tests__/replay.test.ts` replays every `fixtures/*_<N>reps.json` file through the full engine and requires exactly N reps (files named `*leaning*` must also flag the lean on every rep). Bundled now:

- `synthetic_…`: made by the test simulator.
- `realperson_…` and `realperson-leaning_…`: real MediaPipe output on the reference photos of a real person (`docs/reference`), stitched into a video. Real landmarks, but the movement between poses is instant.

Neither is a real person moving. Add real recordings (next section) before the final.

## Testing the computer vision on real people

Three ways, all running the same counting engine as the app:

1. **In the app, from a video file:** open `/mirror/<exercise>?source=file&reps=5&debug=1` and pick a clip. The live pipeline (skeleton, HUD, voice, counting) runs on it, with no countdown. Also a demo backup if the venue camera or lighting fails.
2. **In the app, live:** add `&debug=1`, tap **Record landmarks**, do the set, then tap **Stop & download**.
3. **From any phone video, offline:**
   ```sh
   pip install mediapipe opencv-python-headless
   python tools/extract_landmarks.py clip.mp4 --exercise mini_squat --reps 5
   cd frontend && npm run eval -- ../recorded_mini_squat_5reps.json
   ```
   `npm run eval` prints every rep (time, top angle, quality, form faults), calibration problems and pauses.

Save good recordings as `frontend/src/pose/__tests__/fixtures/recorded_<exercise>_<N>reps.json` so they become regression tests.

**What to record** (phone on a stand at waist height, 2–3 m away, whole body in frame, about 5 s standing still first):

| Clip | Exercise id | What to do |
|---|---|---|
| 1 | `shoulder_abduction` | 10 reps, pause at the top on some |
| 2 | `shoulder_abduction` | 5 reps leaning sideways (should be flagged) |
| 3 | `shoulder_abduction` | 5 reps with one arm only (run with `--side left`/`right`) |
| 4 | `mini_squat` | 10 small squats |
| 5 | `squat_screen` | 5 deep squats, knees caving in on 3 of them |
| 6 | `sit_to_stand` | 5 reps, side-on to the camera |
| 7 | `single_leg_balance` | 30 s on each leg |

Record each with 2–3 different people, in normal and dim light, and in fitted and baggy clothes if you can.

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
frontend/scripts/eval-recording.ts   replay a recording and print what the engine saw (npm run eval)
tools/extract_landmarks.py           phone video → landmark recording, using the app's pose model
backend/app/          FastAPI + SQLModel (SQLite), alerts.py (recovery intelligence), seed.py
```

## Deploy to Vercel

The repo deploys as **one Vercel project**: the React app is served as static files and the FastAPI backend runs as a Python function at `/api` (`vercel.json`, `api/index.py`). The frontend calls `/api` on the same domain, so no API URL or CORS setup is needed.

1. Go to https://vercel.com/new and import the `Recover-Lens-` GitHub repository. Leave the framework preset as **Other** and the root directory as the repo root; `vercel.json` sets the build.
2. Click **Deploy**. The app works immediately with seeded demo data.
3. **Add a database before demoing across devices.** Without one, the API stores data in `/tmp` on each serverless instance, so a session saved on a phone may not show on the laptop. In the project, open **Storage → Create Database → Neon (Postgres)** and connect it to the project. This sets `DATABASE_URL`/`POSTGRES_URL`; then **redeploy**. The tables are created and seeded on first request.
4. Open the HTTPS URL on a phone: the camera needs HTTPS, which Vercel provides.

To reset the demo data: `curl -X POST https://<your-app>.vercel.app/api/seed` (set `ENABLE_SEED_ENDPOINT=false` to disable this).

Other hosts: the frontend also works on Netlify (`public/_redirects`, with `VITE_API_URL` pointing at the API) and the backend on Render (`render.yaml`).

## Where this build differs from the spec

- **Front-view knee angles are 3D.** From the front, a squat bends the knee towards the camera, so the flat 2D hip–knee–ankle angle barely changes. Mini squat, the squat screen and single-leg squat use MediaPipe world landmarks. Shoulder and side-view angles stay 2D in pixel space (§5.2).
- **Smoothing is time-based.** The §5.3/§5.6 alphas apply at 30 fps and are rescaled for slower frame rates. Without this, a slow phone lagged behind the body and missed reps.
- **Compact HUD also on short screens.** The merged bottom bar is used under 640 px wide *or* under 520 px tall (landscape phones), so the panels never cover the torso.
- **Countdown shows in the instruction pill**, not over the body.
- **Side-view exercises track whichever side faces the camera** (`side: 'auto'`).
- **Guided timer mode** covers shoulder rotations, pendulum, quad set, straight leg raise, heel slide and step-up.
- **Range-of-motion alerts know direction:** a deeper squat (smaller angle) is progress, not a drop.
- **Squat depth is measured from each person's own standing angle.** Real 3D knee angles read about 157–164° on a straight leg, not 180°, so a fixed 170°→135° range never let a rep finish. The resting angle is captured at the end of the countdown (`relativeRange`).
- **Thresholds retuned on real MediaPipe output** (reference photos of a real person): abduction counts at 80° (arms held level read 83° and 98°), symmetry warns below 78% (level arms read 84%), elbow warns below 145°.
- **Counting continues down to 40% landmark visibility** once a set has started; calibration still needs 60%.
- **Abduction can be done with one arm** (arm choice in the check-in, or `?side=left|right`), as most shoulder rehab is.

## Still to do before the final

- Record the clips in "Testing the computer vision on real people" and tune the `// TUNE:` thresholds on 3–5 people. Squats are the least proven: their thresholds have not yet been checked on a real person squatting.
- Have native speakers check the Shona and Ndebele phrases (`frontend/src/voice/phrases.ts`, `src/i18n/`).
- Test on iPhone Safari and Android Chrome over HTTPS (camera, speech unlock, GPU→CPU fallback).
