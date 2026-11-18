# Lower-body rehab exercises trackable live with one camera (MediaPipe Pose)

Scope: exercises beyond the ones RecoverLens already tracks (mini squat, sit-to-stand, single-leg balance, squat screen, single-leg squat, jump landing). Researched 2026-11-18. Limits on what I could check: `www.ncbi.nlm.nih.gov` was blocked in this session, and GitHub access to third-party repos was not enabled. The one open-source rehab tracker I could read in full was the `physiocore` PyPI wheel (source of github.com/pankajmaurya/PhysioPlus), so most numeric thresholds below are either taken from that code or are **proposed starting values marked as inference** (treat as `// TUNE:`).

Landmark indices (MediaPipe Pose 33): 11/12 shoulders, 23/24 hips, 25/26 knees, 27/28 ankles, 29/30 heels, 31/32 foot index (toe). Odd = patient's left.

## Which joint angle(s) / signals drive the rep counter, per exercise

### Takeaway
Nearly every candidate reduces to one of four signals: knee angle (hip-knee-ankle), hip angle (shoulder-hip-knee or shoulder-hip-ankle), a vertical displacement normalised to a body length (heel or hip height vs a calibrated baseline), or a lateral/sagittal leg-to-trunk angle. The only open-source rehab code I could read (physiocore) uses state-band logic (angle must sit inside a [min,max] band for "rest" and for "raise") plus a hold timer, rather than single thresholds.

### Cited Findings
- **Glute bridge (physiocore `bridging.py`)**: knee angle = hip-knee-ankle; "raise angle" = shoulder-hip-knee in 2D. Rest pose = knee angle in [10°, 90°] (code default 40-90) **and** shoulder-hip-knee in [100°, 130°]; raised pose = shoulder-hip-knee in [155°, 180°] with knees still bent 10-90°. Also requires `upper_body_is_lying_down()` (shoulder-mid and hip-mid roughly level, i.e. torso parallel to image x-axis) and ankles within 0.1 (normalised y) of a computed ground level. Hold 2 s (JSON) / 5 s (code default) with an `AdaptiveHoldTimer` whose max hold = 3x initial. Accepts either side if both aren't visible (OR-branch). — [physiocore on PyPI / PhysioPlus](https://pypi.org/project/physiocore/0.2.6/) (code read from the published wheel; repo [github.com/pankajmaurya/PhysioPlus](https://github.com/pankajmaurya/PhysioPlus))
- **Straight leg raise, supine (physiocore `any_straight_leg_raise.py`)**: knee must stay straight, hip-knee-ankle in [150°, 180°]; raise angle = signed angle shoulder-midpoint – hip – ankle. Rest = [160°, 180°] (leg flat, in line with trunk); raised = [90°, 158°] (i.e. leg lifted ~22-90° above the bed line). Separate left/right hold timers, hold 3 s. Uses shoulder z (`lshld.z < rshld.z`) to sign the angle, and a side-lying detector `|lshoulder.y - rshoulder.y| > 0.15`. Also ships a prone SLR (hip extension) variant. — [physiocore](https://pypi.org/project/physiocore/0.2.6/)
- **Ankle pumps / toe movement (physiocore `ankle_toe_movement.py`)**: ankle angle bands relax [80°, 110°] vs stretch (plantarflexed) [130°, 180°], hold 0.5 s. — [physiocore](https://pypi.org/project/physiocore/0.2.6/)
- Knee-bend counters with MediaPipe use hip-knee-ankle < 140° as the "bent" stage, with a hold requirement (8 s in tknishh's version). — [knee-bent-counter-mediapipe](https://awesome.ecosyste.ms/projects/github.com%2Ftknishh%2Fknee-bent-counter-mediapipe); [Jeevesh28 Knee-Bend-Counter](https://github.imc.re/Jeevesh28/Knee-Bend-Counter-Mediapipe)
- Hugging Face squat trackers use knee angle > 170° = "up", < 90° = "down"; one uses a 60-130° acceptable-depth window. These are the typical "two threshold" pattern most hobby lunge/squat code copies. — [khelverse live-train squat.py](https://huggingface.co/spaces/khelverse/live-train/blob/main/exercises/squat.py); [pjxcharya liveTrain squat.py](https://huggingface.co/spaces/pjxcharya/liveTrain/blob/main/exercises/squat.py)
- A lunge module exists (amitesh11/pose `lunge.py`) computing knee angle at the bottom plus an ML knee-over-toe classifier; thresholds not visible in search snippet. — [amitesh11/pose lunge.py](https://huggingface.co/spaces/amitesh11/pose/blob/main/web/server/detection/lunge.py)
- Fixed absolute angle thresholds (e.g. 90° knee) do not generalise across limb proportions; normalising to the skeleton/bounding box is recommended. — [aconf 2026 paper (search abstract)](https://submission-hk.aconf.org/hk/2026/05/paper_1197002_jnvlsqhftlnddshh_v1.pdf)
- ML Kit's pose-classification guide recommends k-NN on normalised landmark embeddings with enter/exit hysteresis thresholds for rep counting as an alternative to hand-written angles. — [Google ML Kit: classifying poses](https://developers.google.com/ml-kit/vision/pose-detection/classifying-poses?authuser=4)

### Inferences
Proposed profiles (signals + start/target values). Numbers not attributed above are **my starting proposals**, derived from the physiocore bands, typical clinical ROM and the existing squat code; all need `// TUNE:` and field testing.

| Exercise | View / facing | Sides | Driver signal (landmarks) | Start → target (proposal) | Hold / min rep | Key 2D form checks |
|---|---|---|---|---|---|---|
| **Glute bridge** | Side, lying, head to either side (camera at floor/low height, ~2 m) | Both legs together; use the more visible side | Hip extension = shoulder-hip-knee (11/12-23/24-25/26), 2D | Rest 100-130° → top ≥ 155-165° (physiocore); hysteresis: count on ≥160, re-arm ≤135 | Hold 2-5 s at top (physiocore) ; min rep ~1.5 s | Knee angle stays 60-100° (feet not sliding); hips not over-extended (>185° = lumbar hyperextension); top reached = shoulder-hip-knee ~ straight line |
| **Single-leg bridge** | Side, lying | One side at a time; working leg = foot-on-floor leg nearest camera | Same as bridge on stance side; non-stance knee extended (hip-knee-ankle >150°) | Same as bridge, lower target (≥150°) | Hold 2-3 s | Pelvic drop not visible from side; from front/foot-end view, hip-height difference (23.y-24.y)/hip width |
| **Straight leg raise (supine)** | Side, lying | One leg at a time (physiocore tracks L and R independently) | Shoulder-mid – hip – ankle angle (signed); knee hip-knee-ankle | Rest 160-180° → raised 90-158° (physiocore); clinical cue "8-10 inches off the bed" (~30-45°) | Hold 3 s (physiocore) | **Extension lag**: knee angle < 165-170° while lifted → fault (MGH protocol uses "SLR without lag" as a progression criterion) |
| **Heel slides (supine)** | Side, lying | One leg | Knee flexion = 180° − hip-knee-ankle | Start knee ≥ 165° → target ≤ 90° (early post-op target per protocol; personalise from calibration) | No hold; min rep ~2 s | Heel lifted off surface (heel y rising above ankle baseline); hip rotation hard to see |
| **Standing calf / heel raise** | Side (best) or front; can hold chair/wall | Both feet (bilateral) or single | Heel lift = baseline heel y (29/30) − current heel y, normalised by shank length (knee-ankle) or leg length; alt: ankle angle knee-ankle-foot index (25-27-31) | Rise ≥ 0.08-0.12 of shank length above calibrated standing baseline; return within 0.03 | Optional 1-2 s top hold; min rep ~1.5 s | Knees bending (knee angle < 165° = cheating with knees); trunk sway; uneven heels (front view, L vs R heel lift) |
| **Toe raise (dorsiflexion)** | Side | Bilateral | Toe (31/32) lift vs baseline, or ankle angle | Toe lift ≥ ~0.06 shank length | — | Hips sticking back (hip angle < 165°) |
| **Standing hip abduction** | Front, facing camera; hold chair | One side at a time | Leg-to-trunk lateral angle: angle between (hip-mid→shoulder-mid) and (hip→ankle) of moving leg, 2D frontal; or ankle horizontal offset / hip width | Rest ≤ 8° → target ≥ 20-30° | 1-2 s hold optional | **Trunk lean** to stance side: shoulder-mid vs hip-mid line angle > 10°; hip hike (moving hip y rises vs other hip); toes turned up/hip flexion (needs side view, mostly undetectable) |
| **Side-lying hip abduction** | Front (camera at foot or facing the patient's front) lying on side | Top leg | Same lateral angle hip→ankle vs trunk line | Rest ~0-10° → 30-45° | Hold 1-2 s | Leg drifting forward (hip flexion) is out-of-plane from front view → needs camera above/at feet; frequent occlusion of bottom leg |
| **Clamshell** | Front (patient faces camera, side-lying) | Top leg | Knee separation: distance top knee–bottom knee normalised by thigh length, or angle knee-hip-knee | Closed ≤ 0.1 → open ≥ 0.4-0.5 of thigh length (proposal) | 1-2 s | Pelvis rolling back: shoulder/hip line rotation (top hip moves toward camera; z or apparent hip width change) |
| **Standing hip extension** | Side; hold chair | One side | Hip angle shoulder-hip-knee on moving leg (past vertical) or thigh-from-vertical angle | 0° (vertical thigh) → 10-20° behind vertical | 1-2 s | **Lumbar compensation / trunk lean forward**: trunk-from-vertical > 10-15°; knee bending |
| **Standing knee flexion (hamstring curl)** — Otago "knee flexor" | Side; hold chair | One side | Knee angle hip-knee-ankle on moving leg | ≥ 165° → ≤ 90° (heel toward buttock) | Optional 1 s | Hip flexing forward (thigh-from-vertical > 15°); trunk lean |
| **Seated knee extension (long arc quad)** — Otago "knee extensor" | Side; chair | One side | Knee angle hip-knee-ankle | ≤ 100° (foot down) → ≥ 160-170° | Hold 1-3 s at top | Leaning back (trunk angle increases); thigh lifting off chair (hip y / knee y change) |
| **Terminal knee extension (standing, band or none)** | Side | One side | Knee angle | 150-160° → ≥ 172-175° | Hold 2-3 s | Small ROM → very sensitive to landmark jitter; questionable in 2D (see reliability) |
| **Forward / reverse lunge, split squat** | Side (knee angles), or diagonal | Lead leg per set; alternate set per side | Lead knee angle hip-knee-ankle (+ rear knee) | ≥ 160-170° → ≤ 100-110° (rehab depth; 90° athletic) | Min rep ~1.5-2 s | Knee past toe (knee x beyond foot index x by > ~0.25 shank length, side view); trunk lean > 20°; front view: valgus (knee medial to hip-ankle line) |
| **Step-up** | Side (or front for valgus) | Leading leg per set | Lead hip/knee angle + hip-mid vertical rise vs baseline (normalised by leg length) | Rise ≥ step height ratio; knee ≥ 165° at top | Min rep ~2 s | Valgus (front); pushing off rear leg (rear ankle leaving ground early); trunk lean |
| **Wall sit (hold)** | Side | Both | Knee angle; hip angle; trunk vertical | Knee 90-130° (shallow for OA/PFP) | Hold timer only; break when knee > 140° | Knees past toes; asymmetric (front view) |
| **Marching in place** | Front or side | Alternating | Knee y above hip-relative baseline or hip flexion (thigh-from-vertical) per side; count alternating peaks | Thigh ≥ 45-60° from vertical (proposal) | Min 0.5 s between same-side peaks | Trunk lean, loss of balance (hip-mid sway) |
| **Tandem stance (hold)** | Front | — | Heel-to-toe alignment: one heel (29/30) x ~ other toe (31/32) x; hold timer; sway of hip-mid | Feet aligned within ~0.25 foot length | Hold 10-30 s (Otago progression) | Stepping out = feet separate; arm grab (wrist to wall) |
| **Sumo / box squat** | Front (sumo; 3D knee angle like existing front squat) or side (box) | Both | Knee angle (depth=true front); hip-mid vertical drop | Same as existing squat; box squat end = hip y reaches calibrated box height | — | Valgus (front), trunk lean (side) |

- The existing `AngleSpec` (joint triplet + optional `depth`) covers knee and hip angles directly; new signal types needed are (a) **normalised vertical displacement vs calibrated baseline** (heel raise, toe raise, step-up, marching, box squat), (b) **segment-to-trunk lateral angle** (hip abduction), (c) **inter-landmark distance normalised by segment length** (clamshell, tandem stance), and (d) **lying-posture gate** (bridge, SLR, heel slides) like physiocore's `upper_body_is_lying_down`.
- physiocore's band design (rest band + raise band + hold timer) maps cleanly onto a hysteresis state machine: rest band = re-arm condition, raise band = count condition. RecoverLens rule 4 ("every completed rep counts") suggests counting on reaching the band and using the hold only to grade `correctReps`.

### Gaps
- Could not read the actual lunge thresholds in amitesh11/pose or any published rehab-specific lunge/step-up thresholds; values in the table are proposals.
- No source found with tested thresholds for hip abduction, clamshell, hamstring curl, long-arc quad, marching or tandem stance in a camera system.

## Best camera view, facing direction, sides tracked

### Takeaway
Sagittal-plane exercises (bridge, SLR, heel slide, calf raise, curls, LAQ, lunge, step-up, wall sit, hip extension) want a side view; frontal-plane ones (hip abduction, clamshell, tandem stance, valgus checks) want a front view. Evidence on phone placement says ~1.8-2.0 m, diagonal or frontal, gives the best detection, while a close side view can fail badly.

### Cited Findings
- JMIR mHealth 2026 (Oliosi et al., 22 participants, 12 phone set-ups): diagonal and frontal views at 180-200 cm gave the highest detection accuracy and counting precision; squats best from a diagonal at 200 cm (95.5% detection, MAE 0.05 reps), worst from the side at 90 cm (0%, MAE 5). — [JMIR mHealth 2026;e82412](https://mhealth.jmir.org/2026/1/e82412/)
- Chalmers 2026 thesis (single RGB camera + MediaPipe Pose on single-leg stance, sit-to-stand, mini-squat): trunk orientation and normalised displacement metrics were more stable than 2D knee-flexion estimates. — [Chalmers ODR thesis](https://odr.chalmers.se/bitstreams/6e3607e0-8e8c-4f7f-b33e-c92bfab18210/download)
- physiocore's supine trackers assume the person lies parallel to the image x-axis (side view of a lying patient) and track left and right legs independently with separate timers. — [physiocore](https://pypi.org/project/physiocore/0.2.6/)

### Inferences
- The side-view failures in Oliosi et al. were at 90 cm (body cut off); for side-view exercises in RecoverLens, enforce full-body framing (ankles and shoulders visible with visibility > 0.5) rather than avoiding side views.
- For one-leg-at-a-time exercises in side view, the leg nearest the camera is the reliable one; ask the patient to turn so the working leg faces the camera, and label by MediaPipe's left/right (patient side, per CLAUDE.md rule 6), not by screen position.
- Diagonal (~45°) view could be a reasonable default for lunges/step-ups as it shows both knee flexion and some valgus, but it biases both 2D angles; prefer pure side for angle thresholds.

### Gaps
- No study found comparing views specifically for lying exercises or hip abduction.

## Form faults detectable in 2D and how to compute them

### Takeaway
Knee valgus (frontal plane projection angle), trunk lean, pelvic drop/hip hike, knee-past-toe and incomplete ROM / extension lag are all computable from 2D landmarks, but frontal-plane measures from 2D video are only moderately accurate; use them as soft "observations", not scores.

### Cited Findings
- OpenPose on frontal-plane video during drop vertical jump correlated strongly with 3D motion analysis for knee valgus excursion, MAE 2.4°. — [JSSM 2024 23(3):515](https://www.jssm.org/jssm-23-515.xml-Fulltext)
- A computer-vision smartphone app for knee valgus angle (42 handball players) showed excellent test-retest and inter-rater reliability and strong concurrent validity vs Kinovea (a 2D reference, not 3D). — [Beta app knee valgus validity (PMC10177945)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10177945/)
- BMC Musculoskeletal Disorders 2026 (Janisch et al.): current evidence does not support 2D video for lower-extremity frontal-plane kinematics where high accuracy is required; agreement low to moderate. — [Janisch et al. 2026](https://www.medicalschool-hamburg.de/files/inhalte/News/2026/2026-janisch_et_al-bmc_musculoskeletal_disorders.pdf)
- 2D single-leg-squat analysis reported high reliability for peak contralateral pelvic drop and hip adduction (reliability only, not validity vs 3D). — [IJSPT article 35706](https://ijspt.scholasticahq.com/article/35706-the-concurrent-validity-and-reliability-of-single-leg-squat-among-physically-active-females-with-and-without-dynamic-knee-valgus)
- MGH ACL protocol: do not do SLR if there is an extension lag; progression criterion is SLR without lag. — [Mass General ACL protocol](https://www.massgeneral.org/assets/MGH/pdf/orthopaedics/sports-medicine/physical-therapy/rehabilitation-protocol-for-ACL.pdf)

### Inferences
Suggested computations (pixel space, per SPEC §5.2):
- **Knee valgus (FPPA)**: front view, angle between hip→knee and knee→ankle vectors in 2D; or knee x offset medial to hip-ankle line / hip width. Flag only on sustained frames (e.g. > 10-15° for > 200 ms). `// TUNE:`
- **Trunk lean**: angle of hip-mid→shoulder-mid vs vertical; side view = forward lean, front view = lateral lean (hip abduction, step-up, marching).
- **Pelvic drop / hip hike**: front view, (left hip y − right hip y) / hip width, relative to the standing calibration.
- **Knee past toes**: side view, knee x beyond foot-index x by a fraction of shank length; contested as a fault clinically, so present as observation only.
- **Extension lag (SLR, LAQ, TKE)**: knee angle below ~165-170° during the lift phase.
- **Incomplete ROM**: rep reached count threshold but not the personal calibrated target → counted but not `correctReps`.
- **Bridge hyperextension / feet slide**: shoulder-hip-knee > ~185°; knee angle drifting outside 60-100°.

### Gaps
- No camera-based validity data found for Trendelenburg in standing hip abduction, or for clamshell pelvic roll-back.

## Rehab relevance and guideline backing

### Takeaway
Strength exercises for quads, hip abductors/extensors and calves are core to OA, PFP, ACL and falls programmes; the Otago programme's strength set (knee extensor, knee flexor, hip abductor, calf raise, toe raise) is entirely chair-supported and fits low-resource settings.

### Cited Findings
- NICE NG226 (2022) osteoarthritis: tailored therapeutic exercise (local muscle strengthening and general aerobic fitness) as core treatment; consider supervised exercise; combine with education/behaviour change. — [NICE NG226 recommendations](https://www.nice.org.uk/guidance/ng226/chapter/Recommendations)
- JOSPT 2019 patellofemoral pain CPG (Willy et al.): combined hip- and knee-targeted exercise to reduce pain and improve function; posterolateral hip exercises preferred early, adding knee musculature later. — [AAFP summary 2020](https://www.aafp.org/pubs/afp/issues/2020/1001/p442.pdf); [PubMed 31475628](https://www.pubmed.gov/31475628/)
- Otago Exercise Programme strength exercises: knee extensor, knee flexor, hip abductor, calf raises, toe raises (with balance exercises incl. tandem stance, done 3x/week); shown to reduce falls and fall injuries. — [UNC Otago strength videos](https://www.med.unc.edu/aging/cgwep/courses/otago-exercise-program/otago-videos/strength-exercises/); [Physiopedia Otago](https://Www.physio-Pedia.com/Otago_Exercise_Programme) (lists "hip adductor", likely an error vs other sources); [OUH Otago booklet](https://www.ouh.nhs.uk/media/5xydterh/85619otago.pdf)
- ACL reconstruction protocols: heel slides, quad sets, SLR in week 1 / phase 1; bridging and step-ups in phase 2 (~2-6 weeks); mini-squats/wall squats for quads. — [Mass General ACL protocol](https://www.massgeneral.org/assets/MGH/pdf/orthopaedics/sports-medicine/physical-therapy/rehabilitation-protocol-for-ACL.pdf); [TCO ACL protocol 2023](https://tcomn.com/wp-content/uploads/2020/08/ACL-Reconstruction-Rehab-Protocol_11-2023.pdf); [OIPT ACL protocol](https://orthopedicinstitutesf.com/wp-content/uploads/2024/02/Knee-ACL-Reconstruction-Protocol-OIPT.05.27.22.ver1.pdf)
- SLR described as raising the leg 8-10 inches off the table in a hip (gluteus medius repair) protocol. — [American Hip Institute PT protocol](https://www.benjamindombmd.com/pdf/gluteus-medius-repair-pt-protocol.pdf)
- UI-PRMD benchmark dataset of rehab movements includes deep squat, hurdle step, inline lunge, side lunge, sit-to-stand, standing active SLR (10 healthy subjects, correct and incorrect versions, Vicon + Kinect, PDDL licence) — usable for offline testing of a counter. — [UI-PRMD](https://webpages.uidaho.edu/ui-prmd/)

### Inferences
Condition mapping (synthesised from the above; condition-specific claims not individually sourced should be checked by a physio):
- Knee OA: LAQ, SLR, heel raise, step-up, wall sit (shallow), hamstring curl.
- ACL reconstruction: heel slides, SLR, bridge, TKE early; step-up, split squat/lunge, wall sit later.
- PFP: side-lying/standing hip abduction, clamshell, bridge, hip extension early; step-up, shallow split squat later.
- Hip OA / replacement: bridge, standing hip abduction/extension, heel slides, SLR (often avoided early after posterior-approach THR — check surgeon protocol).
- Ankle sprain: calf/heel raise, toe raise, tandem stance.
- Older adults / falls: full Otago set + tandem stance + marching.
- All are equipment-free or need only a chair/wall/step — fits the Zimbabwe constraint; band-based TKE is the exception (can be done without a band).

### Gaps
- Could not retrieve full-text guideline exercise lists for hip replacement or ankle sprain (JOSPT ankle CPG) in budget.

## Reliability of a single 2D camera; known problems

### Takeaway
Standing sagittal exercises with large ROM (curls, LAQ, lunges, step-ups, calf raise with normalised heel lift) should be reliable; lying exercises work but need floor-level framing and a lying-posture gate; small-ROM (TKE) and frontal/transverse measures (valgus, clamshell, pelvic rotation) are least reliable.

### Cited Findings
- 2D knee-flexion estimates were less stable than trunk orientation and normalised displacement in a MediaPipe home-exercise study. — [Chalmers thesis](https://odr.chalmers.se/bitstreams/6e3607e0-8e8c-4f7f-b33e-c92bfab18210/download)
- 2D analysis may be inaccurate for transverse-plane motion (relevant to valgus and rotation). — [JSSM 2024](https://www.jssm.org/jssm-23-515.xml-Fulltext)
- A BlazePose-based system covering bridge training and side-lying "opening/closing" (clamshell-like) reported exercise-recognition accuracy 94.76-100% (recognition, not angle accuracy; year unclear). — [ResearchGate: Towards Automating Personal Exercise Assessment...](https://www.researchgate.net/publication/379181282_Towards_Automating_Personal_Exercise_Assessment_and_Guidance_with_Affordable_Mobile_Technology)
- Side-lying hip abduction classification in a 2024 PeerJ paper reached 0.96-0.98 accuracy but from inertial/wearable sensor data, not video. — [PeerJ CS 2854](https://peerj.com/articles/cs-2854/)
- A 2024 Sensors smartphone app estimated knee flexion and gait speed in knee OA, validated against marker and wearable systems (gait, not exercises). — [Sensors 24(23):7625](https://mdpi.com/1424-8220/24/23/7625)
- OpenPose knee ROM after TKA was compared to radiography and goniometry (Bone & Joint Research 2023). — [BJR 2023](https://boneandjoint.org.uk/Article/10.1302/2046-3758.125.BJR-2022-0257.R1/pdf)
- physiocore needs heuristics for lying: torso-level check, ankle-near-ground check, shoulder z to determine which side faces the camera, and a side-lying detector. — [physiocore](https://pypi.org/project/physiocore/0.2.6/)

### Inferences
- **Lying exercises**: phone must be at floor level ~2 m away, side-on; the far leg is occluded so only the near leg is trustworthy; MediaPipe is trained mostly on upright people, so expect lower landmark visibility — gate on visibility and add a "lying detected" state.
- **Depth ambiguity**: front-view knee flexion (e.g., marching, sumo squat) needs 3D/`depth` angles, as RecoverLens already does for front knee exercises.
- **Small ROM (TKE, toe raise)**: 5-10° changes are near landmark jitter; use EMA smoothing and longer holds, or demote to "guided, not counted".
- **Rotation**: clamshell and pelvic roll-back are partly transverse-plane; use as soft observations.
- Priority order for implementation (best evidence × reliability × no equipment): (1) seated knee extension (LAQ), (2) standing hamstring curl, (3) standing heel raise, (4) glute bridge, (5) standing hip abduction, (6) step-up, (7) split squat / reverse lunge, (8) wall sit hold, (9) SLR, (10) heel slides, (11) tandem stance, (12) marching; defer clamshell, side-lying abduction, TKE.

### Gaps
- No peer-reviewed validation found of MediaPipe angle accuracy specifically for bridge, SLR, heel slide, or heel raise.

## Links to implementations

### Takeaway
Rehab-specific open code is scarce; physiocore/PhysioPlus is the most directly reusable (bridge, SLR, prone SLR, ankle pumps, with tunable JSON bands and hold timers). Most other repos are gym squat/lunge counters.

### Cited Findings
- physiocore / PhysioPlus (MediaPipe + OpenCV; bridging, SLR, prone SLR, ankle-toe, cobra, neck rotation; JSON-configurable bands; adaptive hold timer). — [PyPI](https://pypi.org/project/physiocore/0.2.6/); [GitHub](https://github.com/pankajmaurya/PhysioPlus)
- Knee bend counters (hip-knee-ankle < 140°, hold). — [tknishh](https://awesome.ecosyste.ms/projects/github.com%2Ftknishh%2Fknee-bent-counter-mediapipe)
- Lunge detection with knee-over-toe classifier. — [amitesh11/pose](https://huggingface.co/spaces/amitesh11/pose/blob/main/web/server/detection/lunge.py)
- Rep counting from skeletal joints on rehab datasets (segmentation + counting). — [arXiv 2304.09735](https://arxiv.org/pdf/2304.09735)
- On-device smartphone rep counting system (Pūioio). — [arXiv 2308.02420](https://arxiv.org/pdf/2308.02420)
- Exercise_Recognition_AI (MediaPipe + LSTM). — [GitHub chrisprasanna](https://github.com/chrisprasanna/Exercise_Recognition_AI)
- UI-PRMD dataset (inline lunge, side lunge, standing SLR). — [UI-PRMD](https://webpages.uidaho.edu/ui-prmd/)
- Stroke rehab frame-level assessment with MediaPipe (2025). — [arXiv 2506.03752](https://arxiv.org/pdf/2506.03752)

### Inferences
- Port physiocore's band config shape into `ExerciseConfig` (`restBand`, `targetBand`, `holdMs`, `postureGate: 'lying' | 'standing' | 'seated'`).

### Gaps
- Could not inspect GitHub repos directly (access not enabled); repo contents beyond physiocore were seen only through search snippets.
