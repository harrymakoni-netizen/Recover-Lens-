# RecoverLens Exercise Library — Source Notes

`recoverlens_exercise_library.json` is ready to feed into the RecoverLens backend to seed `ExerciseProgram` records and drive the Sports Screening module.

## What's inside

| Section | Content |
|---|---|
| `shoulder_rehabilitation` | 5 exercises (abduction, flexion, external/internal rotation, pendulum swing) with target angles, sets/reps, common compensations, and coaching cues — matches the shoulder abduction exercise already in your demo video. |
| `knee_rehabilitation` | 6 exercises (quad sets, straight leg raise, heel slides, mini squat, single-leg balance, step-up) with the same structure. |
| `fifa_11_plus` | The complete, official FIFA 11+ program — all 15 exercises across its 3 parts, including all 3 difficulty levels for the Part 2 strength/plyometric/balance exercises, exact sets/reps/durations, and the technique cues FIFA itself specifies. |
| `sports_screening` | A squat-assessment spec: the 4 visual signals to detect (knee valgus, forward torso lean, asymmetry, heel rise), mapped to risk flags and recommendations — this is what your Sports Screening module's threshold logic should be built around. |

## Where this came from

- **Physiopedia** — ROM norms (shoulder abduction/flexion/rotation, knee flexion/extension) and general therapeutic exercise guidance. Physiopedia is a secondary/tertiary source, so the original citations it references (Norkin & White's *Measurement of Joint Motion*, etc.) are the primary sources if you need to cite this more formally later.
- **FIFA 11+ Manual** (F-MARC — FIFA's Medical Assessment and Research Centre) — the entire `fifa_11_plus` section is transcribed from the official manual almost exercise-for-exercise, since it's a free, publicly released program specifically designed to be taught verbatim.
- **OrthoInfo (AAOS)** and **NHS Sussex Community** — supplementary knee exercise detail.

Every source URL is listed in the `_meta.sources` block at the top of the JSON file itself, so it travels with the data.

## How to use it in Replit

Tell the Agent something like:

> "Load `recoverlens_exercise_library.json` and seed the database: create an `ExerciseProgram` template for each entry in `shoulder_rehabilitation.exercises` and `knee_rehabilitation.exercises`, using `target_angle_deg` as the target angle, `default_sets`/`default_reps` as defaults, and `cues` as the feedback phrases the Rehab Mirror should use for that exercise. Separately, load `fifa_11_plus` as a fixed reference program for a 'Team Warm-Up' feature, and use `sports_screening` to define the risk-flag thresholds and recommendation text for the Sports Screening squat assessment."

This gives the agent concrete field names to map directly onto the `ExerciseProgram` and `Alert`/recommendation logic already defined in the build prompt.

## Important caveat

This is real clinical reference data, but it's still being assembled by a non-clinician (me) from public sources for a hackathon MVP — not a substitute for review by a licensed physiotherapist. Before this touches a real patient, worth having someone qualified sanity-check the target angles and thresholds, especially the squat-screening risk thresholds, which I've flagged in the JSON as needing tuning against real pilot footage rather than being exact clinical cutoffs.