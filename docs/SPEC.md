# RecoverLens — Build Specification

Version 2.0 (Claude Code rebuild) · Team CodeMed · CEAS Hack4Africa 2026

This document tells you exactly what to build, how each piece should behave, and how to check it works. It replaces the earlier Replit prompts. Sections are numbered so CLAUDE.md and commit messages can reference them (e.g. "SPEC §5.3").

---

## 0. What went wrong in the Replit build (do not repeat)

| Problem seen in testing | Root cause | Fix in this spec |
|---|---|---|
| Rep counter stuck at `00/10` while score was 90 and status was HOLD | Rep only counted on a path the state machine never reached; no tests | §5.4 explicit rep state machine + §12 unit tests |
| "Live Instruction" banner covered the top third of the camera, hiding the face/body | Overlay positioned over the frame centre | §7.2 bottom-anchored HUD, compact instruction pill |
| Skeleton only drew shoulders/nose (a triangle), not the full body | Person too close; no calibration step; low-visibility landmarks dropped | §5.1 calibration gate ("step back until your whole body is visible") |
| Start buttons said "Pilot demo"; banners said sessions were "blocked" | Agent added compliance gating | CLAUDE.md rule 2; §8.1 |
| Clinician/Coach portals stuck on "Reconnecting", all zeros | Initial data depended on a WebSocket that never connected | §9.4 fetch on load + polling; seed data |
| Sports screening showed results while history said "none" | Hard-coded demo summary | §8.4 summary is derived from the latest real result only |
| No working nav on phones | Sidebar never collapsed | §7.1 bottom tab bar under 768px |
| Generic voice lines, no rep announcement | Cues not tied to exercise config or rep events | §6 voice engine |

---

## 1. Product summary

Three user types, one pose engine.

- **Patient** (or caregiver helping them): picks an exercise → calibrates → does reps in front of the camera → gets live skeleton colour, score, rep count, voice cues → sees a session summary.
- **Clinician**: sees all patients, scores, adherence, alerts; opens a patient's history; adds patients; assigns exercises.
- **Athlete / Coach**: picks a sport → does a short movement screen → gets observations (e.g. "left knee drifts inward") → coach sees squad overview.

The **AI Rehab Mirror** (live camera screen) is the product. Everything else supports it.

---

## 2. Tech stack

Keep it simple and demo-proof.

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React 18 + TypeScript | Fast dev, static deploy |
| Styling | Tailwind CSS | Responsive utilities |
| Routing | React Router | |
| Pose | `@mediapipe/tasks-vision` `PoseLandmarker` (lite model, GPU delegate, `runningMode: "VIDEO"`) | Runs in browser, 33 landmarks, works offline once loaded |
| Charts | Recharts | Clinician trend charts |
| Local storage | IndexedDB via `idb-keyval` | Offline session queue |
| Voice | Web Speech API `speechSynthesis` | No API key, works offline on most devices |
| Backend | FastAPI + SQLite (SQLModel) | One file DB, easy to seed; swap to Postgres later |
| Tests | Vitest (frontend logic), pytest (API) | |
| Deploy | Frontend: Vercel or Netlify. Backend: Render or Railway. **Camera requires HTTPS** (localhost is fine for dev). | |

Self-host the MediaPipe model file (`public/models/pose_landmarker_lite.task`) and WASM files (`public/mediapipe/`) so the demo does not depend on a CDN at the venue.

No LLM is required for the MVP. If time remains after Milestone 8, an optional clinician summary can be added (§11), behind a feature flag, never on the camera screen.

---

## 3. Folder structure

```
recoverlens/
  CLAUDE.md
  docs/
    SPEC.md
    exercise_library.json        # clinical reference data (Physiopedia, FIFA 11+)
  frontend/
    public/
      models/pose_landmarker_lite.task
      mediapipe/                 # wasm files
    src/
      pose/                      # PURE TypeScript, no React
        landmarks.ts             # landmark indices + visibility helpers
        geometry.ts              # angle, distance, lean, aspect-ratio correction
        smoothing.ts             # EMA / One-Euro filter
        calibration.ts           # full-body-visible checks
        repCounter.ts            # rep state machine (§5.4)
        holdTimer.ts             # for hold/balance exercises
        formRules.ts             # fault detection (§5.5)
        scoring.ts               # movement score (§5.6)
        screening.ts             # sports screen analysis (§8.4)
        __tests__/               # Vitest unit tests
      exercises/
        types.ts                 # ExerciseConfig type
        shoulder.ts
        knee.ts
        screening.ts
        index.ts                 # registry
      voice/
        voiceEngine.ts           # queue, priority, cooldown (§6)
        phrases.ts               # i18n phrase tables (en, sn, nd)
      hooks/
        usePoseLandmarker.ts     # loads model, runs per-frame detection
        useCamera.ts             # getUserMedia, facing mode, errors
        useSession.ts            # ties pose → rep counter → voice → UI state
      components/
        mirror/
          CameraView.tsx         # <video> + <canvas> aligned
          SkeletonCanvas.tsx
          HudStatusPanel.tsx     # bottom-left
          HudMetricsPanel.tsx    # bottom-right
          InstructionPill.tsx    # compact live instruction
          CalibrationOverlay.tsx
          SessionSummary.tsx
        layout/
          AppShell.tsx           # sidebar (desktop) / bottom tabs (mobile)
          Disclaimer.tsx
        dashboard/ ...
      pages/
        Home.tsx
        Mirror.tsx               # /mirror/:exerciseId?mode=caregiver
        Caregiver.tsx
        SportsScreening.tsx
        ClinicianPortal.tsx
        PatientDetail.tsx
        CoachPortal.tsx
      api/
        client.ts                # fetch wrapper with timeout
        offlineQueue.ts          # IndexedDB queue + sync
      i18n/ en.json sn.json nd.json
  backend/
    app/
      main.py
      models.py
      routes/ patients.py sessions.py screenings.py alerts.py
      alerts.py                  # regression detection (§9.3)
      seed.py
    tests/
```

---

## 4. Exercise configuration

Every exercise is one config object. The pose engine reads it; components never hard-code exercise logic.

```ts
type ExerciseKind = "reps" | "hold";

interface ExerciseConfig {
  id: string;                        // "shoulder_abduction"
  name: string;                      // display name
  region: "shoulder" | "knee" | "full_body";
  kind: ExerciseKind;
  cameraView: "front" | "side";      // tells calibration what to expect
  requiredLandmarks: number[];       // must be visible to start
  primaryAngle: AngleSpec;           // the angle that drives reps
  side: "left" | "right" | "both";   // "both" = track both, use the lower for reps
  startAngle: number;                // degrees: rest position
  targetAngle: number;               // degrees: top of rep
  holdSeconds?: number;              // pause at top (reps) or total hold (hold)
  defaultSets: number;
  defaultReps: number;
  minRepSeconds: number;             // reject reps faster than this (noise)
  faultRules: FaultRuleId[];         // see §5.5
  cues: CueSet;                      // see §6.2
}
```

### 4.1 MVP exercise set

Build and test these. Other exercises from `exercise_library.json` can appear in the library as "Coming soon" or as timer-guided only.

| id | Name | Kind | View | Primary angle | start → target | Fault rules |
|---|---|---|---|---|---|---|
| `shoulder_abduction` | Shoulder Abduction | reps | front | shoulder: hip–shoulder–elbow, both sides | 20° → 90° | torso_lean, asymmetry, elbow_bend |
| `shoulder_flexion` | Shoulder Flexion | reps | side | shoulder: hip–shoulder–elbow | 20° → 150° | back_arch, elbow_bend |
| `mini_squat` | Mini Squat | reps | front | knee: hip–knee–ankle (180° = straight) | 170° → 135° | knee_valgus, weight_shift, torso_lean |
| `sit_to_stand` | Sit to Stand | reps | side | knee | 95° → 165° (reversed direction) | torso_lean |
| `single_leg_balance` | Single-Leg Balance | hold | front | — (stance detection) | hold 30 s | pelvis_drop, knee_valgus |
| `squat_screen` | Bodyweight Squat Screen | reps (5) | front | knee | 170° → 100° | knee_valgus, heel_rise, asymmetry, torso_lean |

Shoulder internal/external rotation and pendulum swings cannot be measured reliably from a single 2D front camera. Show them as **guided timer mode** (on-screen steps + voice + timer, no scoring) and say so honestly if asked.

### 4.2 Landmark indices (MediaPipe Pose)

```
0 nose · 11 L shoulder · 12 R shoulder · 13 L elbow · 14 R elbow
15 L wrist · 16 R wrist · 23 L hip · 24 R hip · 25 L knee · 26 R knee
27 L ankle · 28 R ankle · 29 L heel · 30 R heel · 31 L foot index · 32 R foot index
```

"Left" means the patient's left. With a mirrored selfie view, the patient's left appears on the right of the screen. Label metrics by the patient's side, never by screen side.

---

## 5. Pose engine (pure TypeScript)

### 5.1 Calibration gate

Before counting starts, the Mirror shows `CalibrationOverlay` and checks every frame:

1. **Person detected**: at least one pose returned.
2. **Required landmarks visible**: every index in `requiredLandmarks` has `visibility ≥ 0.6`. For front-view shoulder and knee exercises this includes shoulders, hips, knees and ankles, i.e. the **whole body**.
3. **Fully in frame**: all required landmarks have normalized `x` and `y` between 0.03 and 0.97.
4. **Distance**: body height (nose to mid-ankle, in normalized y) between 0.55 and 0.92 of frame height.

Show one clear instruction at a time, spoken and on screen:

- Nobody detected → "Stand in front of the camera"
- Ankles/knees missing or body height > 0.92 → **"Step back until your whole body is visible"**
- Body height < 0.55 → "Move a little closer"
- Off-centre → "Move to the centre"

When all checks pass for 1.0 s continuously → "Great, you're ready" → 3-2-1 countdown → counting starts.

If required landmarks drop out for > 1.5 s during a set, pause counting, show "Step back into view", and resume automatically (without a new countdown) once visible again.

### 5.2 Geometry

MediaPipe returns normalized coordinates (0–1 on each axis). **Convert to pixels before computing angles**, otherwise angles are distorted on non-square video:

```ts
const px = (lm) => ({ x: lm.x * videoWidth, y: lm.y * videoHeight });

// Angle at B formed by A-B-C, in degrees, 0..180
function angle(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  return mag === 0 ? 0 : (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}
```

Derived metrics:

| Metric | Formula |
|---|---|
| Shoulder angle (L) | `angle(L_hip, L_shoulder, L_elbow)` |
| Elbow angle (L) | `angle(L_shoulder, L_elbow, L_wrist)` |
| Knee angle (L) | `angle(L_hip, L_knee, L_ankle)` (180 = straight) |
| Torso lean | angle between vector midHip→midShoulder and straight up `(0, -1)`, in degrees |
| Torso alignment % | `clamp(100 - torsoLean * 5, 0, 100)` (0° = 100 %, 20° = 0 %) |
| Symmetry % | `100 - (abs(L - R) / max(L, R, 1)) * 100`, using the primary angle |
| Knee valgus ratio (L) | horizontal distance of knee from the hip–ankle line, divided by hip width. Positive = knee inside the line |
| Hip drop | vertical difference between hips divided by hip width |
| Heel rise | heel y above its calibration baseline by more than 2 % of body height |

### 5.3 Smoothing

Raw landmarks jitter. Smooth **angles** (not raw landmarks) with an exponential moving average, `alpha = 0.35`, or a One-Euro filter (`minCutoff 1.0, beta 0.02`). Ignore a frame's angle if any of its three landmarks has `visibility < 0.5`; keep the previous smoothed value instead.

Target 20–30 FPS detection. If the device is slow, detect every second frame but keep drawing the video at full rate.

### 5.4 Rep state machine (this is what was broken)

One state machine per exercise session. Drive it with the smoothed primary angle. For `side: "both"`, use the **lower** of the two sides so both arms must rise.

Works for both directions: compute `progress = (angle - startAngle) / (targetAngle - startAngle)`, clamped to 0..1.2. This makes "up" mean progress → 1 whether the angle increases (abduction) or decreases (squat).

```
States: READY → RAISING → AT_TOP → LOWERING → (rep complete) → READY

READY     : progress < 0.25
            → RAISING when progress ≥ 0.25

RAISING   : → AT_TOP   when progress ≥ 0.90          (reached target, 10% tolerance)
            → READY    when progress < 0.15          (abandoned, no rep)

AT_TOP    : holdTimer runs while progress ≥ 0.85
            when hold satisfied (holdSeconds, default 0): topReached = true
            → LOWERING when progress < 0.80

LOWERING  : → REP_COMPLETE when progress < 0.20 AND topReached
            → AT_TOP when progress ≥ 0.90 (went back up)

REP_COMPLETE (instant):
            if repDuration ≥ minRepSeconds:
                reps += 1
                if faultFramesInRep / framesInRep < 0.25: correctReps += 1
                emit "rep" event { repNumber, quality, faults }
            reset per-rep counters → READY
```

Rules:

- **Hysteresis** is built in (enter top at 0.90, leave at 0.80; finish at 0.20, start at 0.25). This stops one movement counting twice.
- Count **every completed rep** in `reps`. Track `correctReps` separately for the summary. Never refuse to count a completed rep because form was imperfect. Patients need to see effort recorded.
- When `reps === targetReps`, emit `"setComplete"`. After the last set, emit `"sessionComplete"` and show the summary.
- `HOLD` status shown on screen = state AT_TOP with a hold timer running. It must lead to a count when the patient lowers. In the Replit build it did not. Unit tests in §12 cover exactly this.

Hold-type exercises (`kind: "hold"`) use `holdTimer.ts` instead: timer runs while the stance is valid, pauses (does not reset) when it breaks, completes at `holdSeconds`.

### 5.5 Form fault rules

Each rule returns `{ id, active: boolean, severity: 0..1 }` per frame. A rule is "active" only after it has been true for 300 ms (debounce) to avoid flicker.

| id | Active when | Cue key |
|---|---|---|
| `torso_lean` | torso lean > 10° | `keep_torso_upright` |
| `asymmetry` | symmetry < 85 % while RAISING/AT_TOP | `raise_both_evenly` |
| `elbow_bend` | elbow angle < 150° | `keep_arms_straight` |
| `back_arch` | (side view) shoulder behind hip by > 8 % body height | `dont_arch_back` |
| `knee_valgus` | valgus ratio > 0.15 on either knee | `knees_over_toes` |
| `weight_shift` | mid-hip x moves > 8 % of hip width from calibration centre | `weight_even` |
| `heel_rise` | see §5.2 | `keep_heels_down` |
| `pelvis_drop` | hip drop > 0.12 | `keep_hips_level` |
| `not_high_enough` | state LOWERING started but max progress this rep < 0.90 | `raise_higher` |

Thresholds are starting values. Mark them `// TUNE:` and adjust after testing on 3–5 people.

### 5.6 Movement score (0–100)

Per frame, during an active rep:

```
rangeScore    = min(progress, 1) * 100
alignScore    = torsoAlignment%
symmetryScore = symmetry%            (use 100 for single-side exercises)
faultPenalty  = 15 * number of active faults

frameScore = clamp(0.4*rangeScore + 0.3*alignScore + 0.3*symmetryScore - faultPenalty, 0, 100)
```

Displayed score = EMA of frameScore (`alpha 0.2`) so it doesn't flicker. Rep quality = mean frameScore over the rep. Session score = mean rep quality.

**Skeleton colour**: green (`#4ADE80`) when no fault is active, amber (`#F5B83D`) when any fault is active, grey (`#9CA3AF`) during calibration or when landmarks are lost. Colour changes must be instant (no smoothing). This is the main visual moment of the demo.

---

## 6. Voice engine

### 6.1 Behaviour

`voiceEngine.ts` wraps `speechSynthesis` with a queue:

- **Priority 1 (interrupts everything):** rep announcements, "set complete", "session complete", safety ("Stop if you feel sharp pain").
- **Priority 2:** form corrections.
- **Priority 3:** encouragement and phase cues ("Hold", "Lower slowly").
- A cue of priority 2–3 is skipped if any speech is already playing.
- **Cooldown:** at most one priority-2/3 cue every 2.5 s, and never the same cue twice within 6 s.
- Rep announcements are never skipped.
- **Mute toggle** on the Mirror screen (top-right). Remember the choice in localStorage.
- iOS/Safari only allows speech after a user gesture. Call `speechSynthesis.speak` with an empty utterance inside the **Start** button click handler to unlock it.
- Pick a voice matching the UI language if available, else default English. Rate 1.0, pitch 1.0.

### 6.2 Cue set per exercise

Each `ExerciseConfig.cues` maps events to phrase keys:

```ts
interface CueSet {
  intro: string;          // spoken after countdown
  onRaising: string;
  onTop: string;
  onLowering: string;
  onRep: string;          // template with {n} and {total}
  faults: Partial<Record<FaultRuleId, string>>;
  onSetComplete: string;
  onSessionComplete: string;
}
```

Shoulder Abduction example (English):

| Event | Phrase |
|---|---|
| intro | "Stand tall, arms by your sides. Raise both arms out to the side, up to shoulder height." |
| onRaising | "Raise your arms slowly out to the side." |
| onTop | "Hold at shoulder height." |
| onLowering | "Now lower slowly." |
| onRep | "Rep {n} of {total}." (on the last rep: "Rep {n}. Set complete.") |
| torso_lean | "Keep your torso upright." |
| asymmetry | "Raise both arms evenly." |
| elbow_bend | "Keep your elbows straight." |
| not_high_enough | "Try to reach shoulder height." |
| onSessionComplete | "Session complete. Well done." |

Mini Squat example: intro "Feet hip-width apart. Bend your knees slightly, then stand back up." · onTop "Hold." · knee_valgus "Push your knees out over your toes." · torso_lean "Keep your chest up."

Write equivalents for every MVP exercise. Shona (`sn`) and Ndebele (`nd`) tables: translate the intro, rep announcement and the five most common fault cues as a proof of concept. Get a native speaker to check them. Fall back to English for missing keys.

The **InstructionPill** on screen always shows the text of the most recent cue (or the current phase instruction), so the patient can read what was said.

---

## 7. UI layout

### 7.1 App shell and navigation

- ≥ 768 px: left sidebar with Home, Caregiver Assist, Sports Screening, Clinician Portal, Coach Portal, plus user and language switcher at the bottom.
- < 768 px: **fixed bottom tab bar** with 5 icons + short labels (Home, Caregiver, Sports, Clinician, Coach). Safe-area padding for notched phones (`env(safe-area-inset-bottom)`).
- The Mirror page is full-screen: hide the sidebar and tab bar; show a back button (top-left) and mute button (top-right).

### 7.2 AI Rehab Mirror screen (most important)

```
┌───────────────────────────────────────────────┐
│ ←                                    🔊  Stop  │  small, top edge, translucent
│                                               │
│                                               │
│          camera feed + skeleton               │
│          (full body visible, nothing          │
│           covering the middle)                │
│                                               │
│ ┌───────────────────────┐                     │
│ │ ● Keep torso upright  │  ← InstructionPill  │
│ └───────────────────────┘                     │
│ ┌──────────────────┐        ┌────────────────┐│
│ │AI REHAB MIRROR   │        │LIVE METRICS    ││
│ │Shoulder Abduction│        │L Sh 88° R Sh 91││
│ │STATUS  RAISING   │        │Torso 96% Sym 97││
│ │Score 92 Rep 03/10│        │                ││
│ └──────────────────┘        └────────────────┘│
└───────────────────────────────────────────────┘
```

Rules:

- Video uses `object-fit: contain` on a black background so the **whole frame is visible** (no cropping of feet/head). The skeleton canvas is sized and positioned to the **rendered video rectangle**, not the container, so lines sit exactly on the body.
- Front camera is mirrored (`transform: scaleX(-1)` on both video and canvas). Text is never mirrored.
- **InstructionPill**: one line, max ~40 characters, font 16–18 px (14 px on phones), sits directly above the status panel, coloured dot matches skeleton colour. No large banner anywhere.
- **Status panel** (bottom-left) and **Metrics panel** (bottom-right): translucent dark (`rgba(10,12,16,0.72)`, backdrop blur), each max 22 % of viewport height.
- Under 640 px wide: merge both panels into **one bottom bar** showing Status, Rep, Score, Symmetry only; the pill sits above it. Total HUD height ≤ 25 % of screen.
- Portrait phones: show a one-time hint "Turn your phone sideways or step back so your whole body fits". Do not force landscape.
- Show a rep "pop" animation (counter scales up briefly) each time a rep is counted.
- Session summary card replaces the camera at the end: Exercise, Total reps, Correct reps, Average angle at top, Movement score, Most common fault → recommendation, Pain after session (0–10 slider), Save button (saves automatically if user leaves).

### 7.3 Visual style

Dark camera screen (as in the reference video). App pages: light background, navy `#1F2A44` text, teal `#159A82` primary, red/orange `#C0392B` for alerts. Caregiver mode uses an amber accent `#E07A10` and a persistent "CAREGIVER MODE" badge. Font: Outfit or Inter. Large tap targets (≥ 44 px; ≥ 56 px in caregiver mode).

---

## 8. Screens

### 8.1 Home
- Greeting + condition ("Welcome back, Tariro · Shoulder rehabilitation").
- **Today's program** card: assigned exercises with sets × reps and a **Start Exercise** button each.
- **Recovery progress**: overall score, adherence %, small sparkline of last 7 sessions.
- **Pain check-in** before starting (0–10 slider + "Any swelling, numbness or sharp pain?" yes/no). If pain ≥ 8 or yes: show "We recommend contacting your physiotherapist before exercising today" with Continue anyway / Skip today. This is the only allowed interruption and it is about safety, not gating.
- **Exercise library** with tabs (Shoulder, Knee). Measured exercises show a "Live tracking" tag; guided ones show "Guided timer".
- One muted disclaimer line at the bottom: "Demonstration build. Exercise targets are illustrative and not yet clinically validated."

### 8.2 Mirror (`/mirror/:exerciseId`)
As §5–7. Query `?mode=caregiver` switches cue text and styling (§8.3).

### 8.3 Caregiver Assist
- Same Mirror and engine.
- Cues addressed to the helper: "Ask them to keep their back straight", "Help them raise their arm a little higher", "That's a rep. Three of ten."
- Setup screen with 3 large picture cards: "Place the phone at waist height", "Stand 2–3 metres back", "Make sure their whole body is visible".
- Caregiver can log pain on the patient's behalf with a "confirmed by patient" checkbox.
- Summary has a **Share** button (Web Share API, fallback copy-to-clipboard) producing a short text summary for WhatsApp.
- Optional **manual session log** for exercises done without the camera.

### 8.4 Sports Screening
1. Choose sport: Football/Soccer, Basketball, Running/Athletics, General Fitness.
2. Each sport maps to a test battery (run in sequence, each with its own calibration):

| Sport | Tests | Key observations |
|---|---|---|
| Football | Bodyweight squat ×5, single-leg balance 20 s each leg | Knee valgus, asymmetry, pelvis drop |
| Basketball | Bodyweight squat ×5, vertical jump landing ×3 | Knee valgus on landing, stiff landing (knee angle at landing > 160°) |
| Running | Single-leg squat ×5 each leg, single-leg balance | Pelvis drop, knee valgus, asymmetry |
| General | Bodyweight squat ×5 | Depth, torso lean, symmetry |

3. Result card shows **observations, not diagnoses**: each item is Good / Review (amber), e.g. "Left knee drifted inward on 4 of 5 reps — Review". Recommendations come from `exercise_library.json → sports_screening.risk_flag_recommendations`; for football, reference FIFA 11+ exercises by name.
4. Recent Screenings list and the Summary panel both read from the **same stored results**. Empty state: "Run a screening to see results here." Never show hard-coded results.
5. Save to backend (or offline queue), tagged with sport.

### 8.5 Clinician Portal
- Header with **Add Patient** button.
- Alerts column: unresolved alerts with "Mark reviewed".
- Patient roster: initials avatar, name, condition, latest score, adherence %, alert dot. Search box.
- **Add Patient** modal: name, phone or email, condition, assign exercises (multi-select from registry with sets/reps). On save the patient appears immediately with "Awaiting first session".
- **Patient detail** page: score trend line, angle-at-top trend, pain trend, adherence %, session table (date, exercise, reps, correct reps, score, pain), edit program.

### 8.6 Coach Portal
- Squad stats: total screened, Good, Needs review.
- Table: athlete, sport, last screening date, flags. Filter by sport.
- Seeded with 6 athletes across sports.

### 8.7 Connection indicator
Small dot in the header: green "Synced", grey "Offline — 2 sessions waiting to sync". Never "Reconnecting" with empty data.

---

## 9. Data and backend

### 9.1 Models

```
Patient       id, name, contact, condition, clinician_id, created_at
Program       id, patient_id, exercise_id, sets, reps, target_angle, active
Session       id (client UUID), patient_id, exercise_id, mode (self|caregiver),
              started_at, duration_s, reps, correct_reps, avg_top_angle,
              movement_score, torso_alignment_avg, symmetry_avg,
              top_fault, pain_before, pain_after, pain_confirmed_by_patient
Screening     id (client UUID), athlete_id, sport, created_at, results_json, overall (good|review)
Athlete       id, name, sport, team
Alert         id, patient_id, session_id, type, message, created_at, resolved
```

Session IDs are generated on the client so offline retries don't create duplicates (backend upserts by id).

### 9.2 API

```
GET  /api/health
GET  /api/patients                 list with latest score, adherence, unresolved alert count
POST /api/patients
GET  /api/patients/{id}            detail + programs + sessions
PUT  /api/patients/{id}/programs
POST /api/sessions                 upsert; runs alert check; returns alerts created
GET  /api/alerts?resolved=false
POST /api/alerts/{id}/resolve
GET  /api/athletes
POST /api/screenings
GET  /api/screenings?sport=
POST /api/seed                     dev only, resets demo data
```

CORS: allow the frontend origin. Every frontend request has a 5 s timeout.

### 9.3 Recovery intelligence (alerts)

On each new session, compare with the mean of that patient's previous 3 sessions of the same exercise:

- `movement_score` dropped by > 8 points → alert "Movement score dropped from X to Y."
- `avg_top_angle` dropped by > 8 % → alert "Range of motion decreased N %."
- `pain_after` increased by ≥ 2 → alert "Pain increased to P/10 compared with recent baseline."
- No session in the last 3 days while a program is active → adherence alert (checked when the roster loads).

Adherence % = sessions completed in last 14 days ÷ sessions prescribed in last 14 days.

### 9.4 Loading and live updates

- Dashboards fetch data **on mount** via normal GET. Show skeleton loaders, then data.
- Refresh by **polling every 5 s** while the page is visible (`document.visibilityState`). This is reliable on venue Wi-Fi; WebSockets are not needed.
- If the API fails, show the last cached data with the grey "Offline" dot, not an empty screen.

### 9.5 Offline queue
- Every finished session/screening is written to IndexedDB first, then POSTed.
- On success, mark synced. On failure, keep it and retry on `online` event and every 30 s.
- The Home screen and patient's own history read local data merged with server data, so the patient sees their session instantly.

### 9.6 Seed data
`seed.py` creates: clinician "Dr. Demo"; patients Tariro Moyo (shoulder, improving, 12 sessions), Liam Ncube (knee, pain went up in latest session → 1 alert), Amina Dube (sports return-to-play, high adherence); 6 athletes across 4 sports with screenings (4 Good, 2 Review). Sessions spread over the last 21 days with realistic upward trends.

---

## 10. Privacy and safety basics

- Video never leaves the device. Only numbers are stored and sent. Say this on the camera permission screen: "Your video stays on this phone. Only your exercise scores are shared with your physiotherapist."
- Safety line in every exercise intro screen: "Stop if you feel sharp pain, dizziness or numbness."
- Disclaimer as in §8.1. No diagnostic language anywhere ("observation", "review", not "injury risk detected").

---

## 11. Optional (only after Milestone 8 is solid)

- LLM-written plain-language progress summary on Patient Detail, generated server-side from session numbers, behind `ENABLE_AI_SUMMARY=false` by default. Never on the Mirror screen.
- SMS reminder stub.
- PWA install + offline caching of the app shell and model files.

---

## 12. Tests (must exist and pass)

`frontend/src/pose/__tests__/`:

1. **geometry.test.ts**: right angle returns 90 ± 0.5; straight line returns 180; aspect-ratio conversion changes a known angle correctly.
2. **repCounter.test.ts** (feed synthetic angle sequences at 30 fps):
   - Clean rep 20→95→20 over 2 s → `reps = 1`.
   - 10 clean reps → `reps = 10`, `setComplete` emitted once.
   - Rise to 95, **hold 3 s**, lower to 20 → `reps = 1` (the Replit bug).
   - Partial rise 20→60→20 → `reps = 0`.
   - Jitter around the top (88↔92 repeatedly) then lower → `reps = 1`, not more.
   - Rep in 0.3 s (noise) → `reps = 0`.
   - Rep with torso lean fault for 50 % of frames → `reps = 1`, `correctReps = 0`.
   - Decreasing-angle exercise (squat 170→130→170) → `reps = 1`.
3. **formRules.test.ts**: each rule activates above and stays inactive below its threshold; debounce works.
4. **scoring.test.ts**: perfect frame ≈ 100; two active faults reduce by 30.
5. **voiceEngine.test.ts** (mock speechSynthesis): rep announcement interrupts a correction; same cue not repeated within 6 s.

Backend `tests/`: session upsert idempotent; alert created when pain rises by 2; patients endpoint returns seeded data.

Also keep a **recorded-landmarks fixture**: record ~20 s of real landmark JSON from the dev tool (§13 M3) for shoulder abduction (10 reps) and replay it in a test, asserting `reps === 10 ± 0`.

---

## 13. Milestones (build in this order)

Each milestone ends with its "Done when" checks passing on a phone **and** a laptop.

**M1 — Skeleton project.** Vite/React/TS/Tailwind, router, app shell with sidebar + mobile bottom tabs, all pages as placeholders, Vitest set up, FastAPI hello-world, `npm run dev` works.
*Done when:* every page reachable at 360 px and 1440 px.

**M2 — Camera + pose.** `useCamera`, `usePoseLandmarker` with self-hosted model, `CameraView` with correctly aligned skeleton (full body: shoulders, elbows, wrists, hips, knees, ankles), mirrored front camera, FPS shown in a debug corner (`?debug=1`).
*Done when:* standing 2–3 m back, all 12 body joints are drawn on top of the right body parts on a phone.

**M3 — Geometry + debug panel.** `geometry.ts`, smoothing, live angle readouts. `?debug=1` panel shows raw/smoothed primary angle, progress, state, visibility, and a "Record landmarks" button that downloads JSON for test fixtures.
*Done when:* raising an arm to horizontal reads 85–95°.

**M4 — Rep counter + tests.** `repCounter.ts` and all tests in §12.2. Wire to the Mirror: status label and rep counter update.
*Done when:* 10 real reps of shoulder abduction → counter shows 10/10, including reps where you pause at the top.

**M5 — Calibration, form rules, scoring, skeleton colour.** §5.1, 5.5, 5.6.
*Done when:* standing too close shows "Step back…"; leaning turns the skeleton amber within 0.5 s; straightening turns it green.

**M6 — Voice.** §6 engine and cue tables for all MVP exercises.
*Done when:* during a set you hear a correction when leaning and "Rep N of 10" for every rep, on iPhone Safari and Android Chrome.

**M7 — HUD layout + summary.** §7.2 exactly, including the < 640 px merged bar and the summary card with pain-after.
*Done when:* on a phone held in landscape at 2.5 m, the whole body is visible and no overlay covers the torso.

**M8 — Backend, offline queue, dashboards, seed.** §9 fully; Clinician Portal, Patient Detail, Add Patient, alerts, Coach Portal.
*Done when:* finish a session on the phone → within 5 s it appears on the clinician laptop; with Wi-Fi off, the session is queued and syncs when Wi-Fi returns.

**M9 — Caregiver mode + Sports Screening.** §8.3, §8.4.
*Done when:* caregiver mode looks clearly different and speaks helper-addressed cues; a football screening produces a result that matches what you did (deliberately cave a knee → "Review").

**M10 — Polish + demo hardening.** i18n proof (Shona/Ndebele cues), disclaimers, loading states, error states (camera denied → clear instructions), PWA caching of model files, run the full demo script 5 times.

---

## 14. Acceptance checklist (run before the final)

- [ ] Start Exercise opens the camera directly (after pain check-in). No "pilot"/"restricted" wording anywhere.
- [ ] Calibration tells me to step back when my legs are out of frame.
- [ ] Skeleton covers the full body and is aligned on phone and laptop.
- [ ] Leaning → amber within 0.5 s, plus spoken "Keep your torso upright" (not repeated every second).
- [ ] 10 reps with pauses at the top → counter reads 10/10 and I heard 10 announcements.
- [ ] Instruction pill is small and sits above the status panel; my face and torso are never covered.
- [ ] Phone portrait, phone landscape, tablet, laptop all usable; bottom tabs work on phone.
- [ ] Summary saves; clinician dashboard shows it within 5 s.
- [ ] Wi-Fi off mid-demo: exercise still works; session syncs later.
- [ ] Clinician Portal and Coach Portal show seeded data immediately after refresh.
- [ ] Add Patient works and the new patient appears instantly.
- [ ] Caregiver mode visibly different, helper-style cues, Share works.
- [ ] Sports screening result matches what I actually did; empty state is honest.
- [ ] Camera permission denied → clear message on how to enable it.
- [ ] Mute button works and is remembered.
- [ ] `npm test` and `pytest` pass.

---

## 15. Demo script (for the presenter)

1. Home → pain check-in 2/10 → **Start Exercise: Shoulder Abduction**.
2. Calibration: start too close → "Step back until your whole body is visible" → step back → countdown.
3. Three clean reps: green skeleton, "Rep 1 of 10", score in the 90s.
4. Lean sideways on rep 4: skeleton turns amber, "Keep your torso upright". Straighten: green.
5. Finish a short set (set target to 5 for the demo via `?reps=5`).
6. Summary card → pain after 2 → save.
7. Switch to the laptop: Clinician Portal shows Tariro's new session; open Liam Ncube's alert to show recovery intelligence.
8. Caregiver mode, 1–2 reps to show the different look and helper cues.
9. Sports Screening → Football → squat with one knee caving in → "Review: left knee drifted inward" + FIFA 11+ recommendation.
10. Close: "Video never leaves the phone. Works offline. Built for clinics with limited physiotherapists."

Backup: a 60-second screen recording of steps 1–7, in case venue Wi-Fi or lighting fails.

---

## 16. Known pitfalls

- **Camera needs HTTPS** on phones. Test the deployed URL, not just localhost.
- **iOS Safari**: needs `playsinline` and `muted` on `<video>`; speech must be unlocked by a tap; GPU delegate can fail, so fall back to CPU automatically.
- **Lighting**: backlight from a window kills landmark visibility. Face the light. Mention this in the calibration hints if visibility is low but a person is detected.
- **Baggy clothing** hides elbows and knees. Demo in fitted clothes.
- **Aspect ratio**: always compute angles in pixel space (§5.2).
- **Mirroring**: patient left = screen right in selfie view. Label by patient side.
- **Model load time**: preload the model on the Home page so the Mirror opens fast.
- **One state machine instance per set.** Don't recreate it on every React render; keep it in a `useRef`.
- **Don't run detection in React state.** Per-frame data goes through refs; update React state for the HUD at most ~10 times per second.
