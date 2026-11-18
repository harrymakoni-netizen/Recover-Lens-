# Upper-body, core and balance rehab exercises trackable live with single-camera MediaPipe Pose

Scope note: the session's web-fetch network blocked ncbi.nlm.nih.gov, pmc.ncbi.nlm.nih.gov and huggingface.co, so several primary papers were read only through search-result abstracts and snippets. Those findings are flagged where it matters. Where no published threshold could be found, the value is listed under **Inferences** as a design proposal to mark `// TUNE:`. It is never presented as a sourced value.

MediaPipe landmark indices used below: nose 0, ears 7/8, shoulders L11/R12, elbows 13/14, wrists 15/16, hips 23/24, knees 25/26, ankles 27/28, heels 29/30, foot index 31/32. "Patient's left" is index 11/13/15/23/25/27.

## 1. Which joint angles and landmarks drive each counter or hold, and which camera view works best?

### Takeaway
Almost every candidate reduces to one of five primitives: (a) a 3-point joint angle (elbow S-E-W, shoulder H-S-E, knee H-K-A); (b) a body-line angle (S-H-A or S-H-K) used as a hold or form gate; (c) the segment angle of a limb or trunk to vertical or horizontal; (d) a displacement such as wrist forward travel, hip height or head yaw proxy; and (e) a timer with a pose-validity gate. Side view suits sagittal-plane movers (push-ups, plank, row, extension, chair stand, functional reach). Front view suits frontal-plane ones (scaption, wall slides, neck side bend, marching, tandem stance).

### Cited Findings
- Push-up counters built on MediaPipe almost all use the elbow angle shoulder-elbow-wrist (landmarks 11/13/15 or 12/14/16). HassanRasheed91/Pushup-Detection: up > 160°, transition 90–160°, down < 90°. The code increments on reaching "down" after "up", although its README prose says the count happens on return to top. It has no hip or body-line check, and its angle uses `abs(atan2 diff)` without wrapping to 0–180°. — [GitHub: HassanRasheed91/Pushup-Detection](https://github.com/HassanRasheed91/Pushup-Detection)
- A common tutorial pattern: UP stage at elbow > 160°, DOWN at < 90°, and a rep registers only on the UP→DOWN→UP sequence. Another Hugging Face implementation uses 150°/70° with a 1 s debounce between counts. One implementation starts counting only when elbow > 160°, shoulder > 40° and hip > 160°, which enforces a plank before reps begin (search-snippet summary; the HF source could not be fetched). — [Labellerr push-up counter](https://www.labellerr.com/blog/ai-powered-pushup-counter-form-corrector/); [HF khelverse/live-train push_up.py](https://huggingface.co/spaces/khelverse/live-train/blob/main/exercises/push_up.py); [Medium: aryanvij02 push-ups](https://aryanvij02.medium.com/push-ups-with-python-mediapipe-open-a544bd9b4351)
- Body alignment for push-up and plank is commonly the shoulder-hip-ankle angle, with 170–180° treated as straight and < 170° flagged as hip sag. One demo instead uses hip-knee-ankle (169°/90°), showing the conventions vary. — [Labellerr](https://www.labellerr.com/blog/ai-powered-pushup-counter-form-corrector/); [niharpalem substack: push-up form analysis](https://niharpalem.substack.com/p/push-up-form-analysis-using-mediapipe)
- Open-source push-up counters on GitHub are small and immature. The top `pushup-counter` topic repo is vietanhdev/pushup-counter-app-v2 (MoveNet, ~28 stars). MediaPipe ones (04092000f/pushup-counter, HassanRasheed91/Pushup-Detection) have about 2 stars each. baoanh1310/pose_demo is a browser BlazePose counter. — [GitHub topic: pushup-counter](https://github.com/topics/pushup-counter)
- Other references for rep-counter structure: MediaPipe's pose-classification docs (k-NN on landmark embeddings with enter/exit hysteresis for push-ups and squats) — [MediaPipe pose_classification.md](https://cdn.jsdelivr.net/npm/@subhajit-gorai/react-native-mediapipe-llm@1.0.3/mediapipe/docs/solutions/pose_classification.md); Raspberry Pi push-up counter — [CircuitDigest](https://circuitdigest.com/microcontroller-projects/push-up-counter-using-raspberry-pi-4-and-mediapipe)
- 30-second chair stand protocol (CDC STEADI): straight-backed armless chair, arms crossed at the wrists against the chest, as many full stands as possible in 30 s. If the person needs their arms to stand, the test stops and scores 0. A stand more than halfway up at 30 s counts. — [NJ/CDC STEADI 30-Second Chair Stand form](https://www.nj.gov/humanservices/doas/forms/STEADI-Assessment-30Sec-508.pdf); [Oregon OHA Chair Stand Test](https://oregon.gov/oha/ph/PreventionWellness/SafeLiving/FallPrevention/Documents/ChairStandTest.pdf); [bpac NZ](https://bpac.org.nz/falls/docs/The_30-Second_Chair_Stand_Test.pdf)

### Inferences (implementation proposals, all `// TUNE:`)
Per-exercise profiles. Where a value has no source, it is a design proposal.

**Push-up family (floor, knee, incline, wall push-up)**
- Driver: elbow angle S-E-W on the side nearest the camera (pick the side with higher mean landmark visibility). Side view, phone at floor or hip height, 2–3 m away.
- Thresholds: top > 155–160°, bottom < 90° for floor and knee push-ups (sourced pattern above). Wall and incline push-ups rarely reach 90° in older or rehab users, so a bottom of < 110–120° is a reasonable rehab default. A relative-ROM threshold (a rep reaches at least 60–70% of the calibrated first-rep depth) would avoid failing weak patients.
- Body-line gate: S-H-A for full push-ups, S-H-K for knee push-ups (ankle is irrelevant once knees are down). For wall push-ups, also S-H-A, because the line should stay straight while leaning.
- Minimum rep duration of about 1.0–1.5 s. The 1 s debounce in the HF code is the only sourced timing value.
- The wall push-up "plus" (scapular protraction at the end) cannot be seen reliably in 2D. Count only the elbow phase.

**Wall slides and wall angels**
- Driver: arm elevation angle hip-shoulder-elbow (23-11-13), as with existing shoulder flexion, but the patient faces the wall. Front view of the patient's back works if the camera is behind them. A side view shows elevation better. Wall angels (back to wall, facing the camera) are fully front-view: track H-S-E elevation plus elbow S-E-W of about 90° held.
- Bottom about 60–90° elevation, top > 140–150°. Track both arms and require left-right symmetry within ~15°.
- Fault: shoulder hiking, measured as the vertical shoulder-to-ear distance (11→7) shrinking by more than ~20% of the calibrated baseline, normalised by shoulder width.

**Shoulder scaption** (variant of the existing abduction and flexion trackers)
- Driver: H-S-E elevation with the arm 30–45° anterior to the frontal plane. Front view, or a 30° oblique view. Reuse the abduction config. In 2D, the scaption plane itself is checked only loosely: in front view the wrist's x-position should sit between the shoulder line and the midline.
- Target about 90° (rotator-cuff-friendly "full can" to shoulder height), start < 30°.

**Shoulder extension** (standing, arm moves backward)
- Driver: H-S-E angle in side view, signed by whether the elbow is behind the trunk line. Normal shoulder extension is about 45–60°. A target of 30–40° behind the trunk suits rehab.
- Fault: trunk flexing forward, measured as the S-H segment angle to vertical changing more than ~10° from baseline.

**Overhead press** (no equipment needed; bottles or bands optional)
- Driver: elbow S-E-W plus wrist above the shoulder. Front view, both arms. Bottom: elbow about 70–90°, wrist near shoulder height. Top: elbow > 160°, wrist above the nose.
- Faults: lumbar arch or trunk lean, measured as the S-H line to vertical in side view or as the shoulder-midpoint x-drift relative to the hip-midpoint in front view; asymmetry between arms.

**Bent-over or band row**
- Driver: elbow S-E-W (extended about 160° to flexed < 90°), or the elbow passing behind the torso line. Side view.
- Gate: hip hinge held, with the S-H segment about 30–60° from horizontal for a bent-over row. Band row is usually seated or standing upright: gate the trunk as upright (< 15° lean).
- Faults: trunk swinging (trunk-angle change > 10° during a rep), shrugging.

**Elbow extension (triceps)**
- Overhead triceps extension: elbow S-E-W from < 70° to > 150° with the upper arm near vertical (H-S-E > 150°). Kickback in side view: upper arm parallel to the trunk, elbow 90° → 160°. This is a mirror of the existing elbow curl config, so it is low effort to build.

**Bicep curl variants** (already tracked): hammer, alternating, seated. These are configuration variants only. Mention them, do not build them again.

**Shoulder external rotation (ER)**
- 2D is a weak fit; see section 4. If attempted, use side-lying or standing ER at 0° abduction, with the elbow at 90° by the side and the camera *overhead* or front view. In front view the forearm rotates outward, so track forearm segment angle (elbow→wrist vector) in the image plane: wrist x moving lateral from the elbow. This works only when the forearm moves in the frontal plane, as with ER at 90° abduction ("cactus" position) viewed from the front. At 90°/90° the forearm rotation happens in the frontal plane, so the forearm angle to vertical is measurable in front view. Prefer the 90/90 variant for camera tracking.

**Plank (hold)**
- Driver: hold timer gated on body line S-H-A of 165–185° (sourced 170–180° pattern) **and** forearms or hands on the floor (wrist or elbow y close to floor level, below the shoulder). Side view at floor height.
- Faults: sag (hip below the S-A line, angle < 165°); pike (hip above the line by > 15°). Using the *signed* perpendicular distance of the hip from the S-A line, normalised by torso length, separates sag from pike, which a bare angle cannot. Neck: ear→shoulder line drooping below the S-H line.
- Pause the timer (do not reset) when the line breaks for > 1 s. Allow a tolerance window.

**Side plank**
- The body faces the camera, so this is a front view. Driver: line S-H-A (or S-H-K for the knee version) of about 165–185°, plus lateral hip height (hip-midpoint y relative to the shoulder-ankle line). Fault: hip dropping toward the floor. Landmarks on the down side are occluded, so use the upper side only.

**Bird-dog** (quadruped, side view)
- Per rep: the contralateral arm raised (H-S-E elevation about 150–180°, arm roughly horizontal) and the leg extended (S-H-K about 170–180°, knee-ankle level with the hip). Count alternating sides with a 2–3 s hold at the top.
- Faults: trunk rotation or hip hike, which is mostly depth-direction and only weakly visible in side view (the far hip shows a y-shift); lumbar sag (S-H line vs horizontal).
- The far-side limbs are occluded in side view. The arm or leg nearest the camera is clear; the far one is noisier. Accept a hold when the near limb plus a coarse far-limb visibility check passes.

**Dead bug** (supine, side view)
- Per rep: arm overhead (S-E line beyond vertical) with the contralateral leg extending (hip-knee-ankle > 150°, knee lowering toward the floor), then return to tabletop (hip about 90°, knee about 90°). Supine pose is out of distribution for BlazePose (section 4). Treat it as experimental with a large tolerance.

**Cat-camel** (quadruped, side view)
- No limb joint moves. Track spinal curvature as the vertical offset of the hip and shoulder midpoint against the mid-trunk. MediaPipe has no spine landmarks, so the proxy is weak. Options: the angle of the shoulder-to-hip line plus head position (nose y relative to shoulders: head down in cat, up in camel). Count head and neck down→up cycles gated on a quadruped posture. Low fidelity; best as guided timing ("follow along") rather than graded reps.

**Pelvic tilt** (supine or standing)
- MediaPipe has no landmark for lumbar curve or the ASIS/PSIS, so posterior pelvic tilt is not observable in 2D beyond hip-landmark micro-motion. Recommend a timer-guided "hold 5 s × 10" with no grading. Do not claim to measure it.

**Neck ROM**
- *Side bend (lateral flexion):* front view; angle of the ear-to-ear line (7→8) to horizontal, or head tilt angle relative to the shoulder line (11→12). Normal about 45°; a rehab target is 20–35° each way. Fault: shoulder hiking toward the ear (shoulder line tilt > 5–8°).
- *Rotation:* front view. Yaw is out-of-plane, so use a 2D proxy: the nose x-position relative to the ear midpoint, normalised by inter-ear distance, or the ratio of the two ears' visibility. The proxy is monotonic but not linear in degrees; report "% of your baseline turn", not degrees.
- *Flexion and extension:* side view; ear-to-shoulder vector angle to vertical (also a "forward head" posture measure, the craniovertebral angle proxy).

**Trunk rotation** (seated)
- Out-of-plane rotation. Front-view proxy: the shoulder-width ratio (projected 11↔12 distance shrinks as the shoulders turn) relative to a static hip width. Alternatively, the sign of the world-landmark z-difference between the shoulders gives direction only. Report as relative range; no degrees.

**Standing reach and the functional reach test (FRT)**
- Side view. Driver: horizontal displacement of the wrist (or third metacarpal; MediaPipe's index 19/20 or Hands) from the start position with the arm at 90° flexion, normalised to a body-height scale, e.g. shoulder-to-ankle length. The clinical FRT is scored in cm, so converting needs a calibration scale (patient height entered once).
- Gate: feet stay planted (ankle and heel x unchanged within a small tolerance); a step ends the trial.

**Tandem stance and heel-to-toe walk**
- Tandem stance is a hold. Front or side view; the gate is one heel (29/30) directly in front of the other toe (31/32): in side view the x-gap is small, in front view the heels are aligned in x. Timer up to 30 s. Stop when a foot moves (ankle displacement > threshold) or the hands grab support (wrist leaving the trunk band can be ignored if arms are allowed).
- Heel-to-toe walk: count steps in a side or front view where each heel lands within a small distance of the previous toe. This needs walking space toward or across the camera, and the person leaves the frame quickly. Low reliability on a phone.

**Marching (standing or seated)**
- Front or side view; driver: hip flexion angle S-H-K (or knee y rising above a threshold relative to the hip), alternating. Target hip about 90° (thigh horizontal) for standing marching; lower in frail users. Count each leg lift; a minimum time per step of ~0.5 s.

**30-second chair stand (30CST)**
- Side view (best) or front view. Driver: knee angle H-K-A (sitting ~90°, standing > 160–165°) plus hip angle S-H-K (> 160° standing). A stand counts on the sit→stand transition. Stop the timer at 30 s and apply the "more than halfway counts" rule (knee angle past the midpoint between calibrated sit and stand at t = 30 s).
- Arms crossed on chest is part of the protocol: check that the wrists stay near the opposite shoulder or chest (wrist inside the shoulder box). If the arms are used, the score is 0 per CDC; per CLAUDE.md, the app should *record* this as an observation rather than block the test.

**Timed Up and Go (TUG)**
- Needs about 3 m of walking toward or away from the camera plus a turn. Feasible on a phone placed 4–5 m away, side-on to the walk path. Start: hip angle leaves sitting. End: return to a sitting knee angle. The total time is robust; sub-phase segmentation is research-grade.

**Stroke upper-limb tasks**
- Reach to target: front or side view. Driver: shoulder flexion H-S-E plus elbow extension S-E-W, with wrist reaching a displayed on-screen target zone (image coordinates). Compensation: trunk lean (shoulder-midpoint displacement forward or sideways > ~5–10% of torso length) and shoulder hiking.
- Hand to mouth: front view; elbow flexion < 60° and wrist within a normalised distance of the mouth (landmarks 9/10). Compensation: head moving down to the hand (nose y travelling more than threshold) or trunk flexion.

### Gaps
- No primary source found for plank-hold duration thresholds, side plank, bird-dog, dead bug or cat-camel angle thresholds in pose-estimation code. All of the above are design proposals.
- Could not fetch the HF khelverse push-up source to verify its 150°/70° and shoulder > 40° values; these come from search-summary text only.

## 2. Typical thresholds, holds, minimum rep durations and form faults detectable in 2D

### Takeaway
Only push-ups have widely repeated open-source thresholds (elbow > 160° up, < 90° down; body line ≥ 170°). For everything else, developers must derive thresholds from clinical norms and calibrate per patient. Relative range (a percentage of the calibrated first rep or baseline) is safer than absolute degrees, especially for rotations.

### Cited Findings
- Push-up thresholds 160°/90° (most common), 150°/70° with 1 s debounce (alternative); body line S-H-A 170–180° ideal, < 170° = sag. — [Labellerr](https://www.labellerr.com/blog/ai-powered-pushup-counter-form-corrector/); [GitHub HassanRasheed91](https://github.com/HassanRasheed91/Pushup-Detection); [HF khelverse push_up.py](https://huggingface.co/spaces/khelverse/live-train/blob/main/exercises/push_up.py)
- Bloggers' values vary and are starting points to tune on real footage (search summary noting differing conventions S-H-A vs H-K-A). — [niharpalem substack](https://niharpalem.substack.com/p/push-up-form-analysis-using-mediapipe)
- A 2026 conference submission using MediaPipe joint-angle trigonometry for squats, lunges and push-ups reports 96.2% form-assessment accuracy (not peer-reviewed; per-fault breakdown not seen). — [aconf submission paper_1197002](https://submission-hk.aconf.org/hk/2026/05/paper_1197002_jnvlsqhftlnddshh_v1.pdf)
- Hardwick et al. (2006) EMG: wall slide, wall push-up plus and scaption give similar serratus anterior activity at 90° elevation. The push-up plus only works serratus up to ~90°, while the wall slide takes the humerus well above 90°. The wall slide produced more upper-trapezius activity, so scaption is suggested for people with excess scapular elevation (shrugging). This makes "shoulder hiking" the key fault to detect in wall slides. — [Hardwick et al. 2006 PDF](https://oliverfinlay.com/assets/pdf/harwick%20et%20al%20(2006)%20a%20comparison%20of%20serratus%20anterior%20muscle%20activation%20during%20a%20wall%20slide%20exercise%20&%20other%20traditional%20exercises.pdf); [Brookbush review](https://brookbushinstitute.com/article/increased-serratus-anterior-activation-during-wall-slides-and-scaption)
- CDC STEADI 30CST cutoffs (below average = higher fall risk): ages 60–64 < 14 men, < 12 women, with lower thresholds per older age band. — [NJ/CDC STEADI form](https://www.nj.gov/humanservices/doas/forms/STEADI-Assessment-30Sec-508.pdf); [bpac NZ](https://bpac.org.nz/falls/docs/The_30-Second_Chair_Stand_Test.pdf)

### Inferences
Form-fault computations (all in pixel space per SPEC §5.2, normalised by torso length = shoulder-mid to hip-mid distance):

| Fault | Computation | Proposed threshold (`// TUNE:`) |
|---|---|---|
| Hip sag / pike (plank, push-up, side plank) | Signed perpendicular distance of hip from shoulder→ankle line ÷ torso length; or S-H-A angle | sag if angle < 165° and hip below line; pike if hip above line > 0.15 × torso |
| Elbow flare (push-up) | Front view only: elbow x-distance from shoulder ÷ shoulder width; side view cannot see it | flare if upper-arm-to-trunk angle in front view > 60–75° |
| Shoulder shrug / hiking | Ear-to-shoulder vertical distance (7→11) ÷ shoulder width, vs baseline | shrink > 20% from baseline |
| Trunk lean compensation | Angle of hip-mid→shoulder-mid vector from vertical (front: lateral lean; side: forward lean) | > 10–15° change from baseline |
| Incomplete range | Peak angle in rep vs target (or vs calibrated max) | < 80% of target → counted but not "correct" (CLAUDE.md rule 4) |
| Forward head / neck protrusion | Side view: ear→shoulder vector angle to vertical (craniovertebral proxy) | > 15–20° forward vs baseline |
| Tempo too fast | Rep duration (top→bottom→top) | < 1.0 s for strength moves |
| Foot step (balance holds, FRT) | Ankle or heel displacement ÷ leg length | > 0.1 × leg length → end hold |

Hysteresis: use separate enter/exit thresholds (e.g. down < 90°, up > 155°) so jitter near a threshold does not double count, as the MediaPipe pose-classification docs do with enter/exit thresholds.

### Gaps
- No published thresholds found for elbow flare, neck-forward or shrug detection in MediaPipe code; these are proposals.
- No published minimum rep duration beyond the 1 s debounce.

## 3. Rehab relevance: conditions and evidence physiotherapists prescribe each

### Takeaway
The strongest prescribing evidence is for chair stand and TUG (CDC STEADI falls screening), balance and strength progressions (Otago), and mixed neck and shoulder-girdle mobility and strengthening exercise (JOSPT neck pain CPG). Scapular exercises (wall slides, wall push-up plus, scaption) have EMG rationale for shoulder rehab but few outcome trials. Stroke reach and hand-to-mouth tasks are core to upper-limb retraining and have early MediaPipe feasibility data.

### Cited Findings
- JOSPT *Neck Pain: Revision 2017* CPG groups neck pain into mobility deficits, movement coordination impairments (including whiplash), headache and radiating pain. For mobility deficits it recommends multimodal care including mixed exercise for the neck and shoulder girdle (neuromuscular, stretching, strengthening, endurance, aerobic). For acute neck pain with headache it recommends supervised active mobility exercise. This supports neck ROM (rotation, side bend), wall angels or wall slides, scaption and rows for neck pain. — [JOSPT Neck Pain Revision 2017 (orthopt.org PDF)](https://orthopt.org/uploads/content_files/files/1.%20Neck%20Pain%20_%20Revision%202017.pdf)
- Wall slide, wall push-up plus and scaption are used to activate serratus anterior with controlled upper-trapezius load in scapular dyskinesis and shoulder rehab. The evidence is small healthy-subject EMG studies, not outcome trials. — [Hardwick 2006](https://oliverfinlay.com/assets/pdf/harwick%20et%20al%20(2006)%20a%20comparison%20of%20serratus%20anterior%20muscle%20activation%20during%20a%20wall%20slide%20exercise%20&%20other%20traditional%20exercises.pdf); [KoreaScience wall-slide vs push-up plus](https://www.koreascience.or.kr/article/JAKO201734158607165.pdf)
- The 30-second chair stand is a CDC STEADI falls-risk assessment for older adults; below-average scores indicate higher fall risk. — [NJ/CDC STEADI form](https://www.nj.gov/humanservices/doas/forms/STEADI-Assessment-30Sec-508.pdf); [Oregon OHA](https://oregon.gov/oha/ph/PreventionWellness/SafeLiving/FallPrevention/Documents/ChairStandTest.pdf)
- Stroke: a 2025 proof-of-principle study (N = 7, > 2 months post-stroke, FMA-UE 40–66, five sessions of gamified reaching) concluded that MediaPipe Pose Landmarker can track upper-limb movements in people with post-stroke motor impairment (abstract only; sample very small). — [Unger et al., MediaPipe reaching after stroke](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12752325/); [Northumbria portal](https://researchportal.northumbria.ac.uk/en/publications/using-mediapipe-to-track-upper-limb-reaching-movements-after-stro/)
- Stroke drinking task (hand to mouth), 20 participants with mild to moderate impairment: compensation classification was significantly better with optical mocap than with MediaPipe keypoints. Camera angle affected accuracy, and CNNs beat LSTMs. — [Frontiers in Medicine 2025 (fmed.2025.1645369)](https://public-pages-files-2025.frontiersin.org/journals/medicine/articles/10.3389/fmed.2025.1645369/pdf)
- Track-UL (JMIR Rehabil Assist Technol 2026): a MediaPipe-based tool compared with Kinovea for upper-limb ROM during abduction, hand-to-mouth and hand-to-head, in the lab and at home (abstract only; results not verified). — [JMIR Rehab 2026 e87128](https://rehab.jmir.org/2026/1/e87128/PDF)
- A conventional tablet camera with MediaPipe was used to detect compensatory movements during seated reaching (search snippet). — [Frontiers in Neuroscience 2024](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2024.1362495/pdf)
- Bird-dog and high plank appear in a MediaPipe + CNN-LSTM Pilates classification study (IEEE Access 2024; classification, not form quality). — [IEEE Access 2024 via DOAJ](https://doaj.org/article/c7c9b21b9ffa4a1ba50ff4d285bcabc5)

### Inferences
- For low back pain, bird-dog, dead bug, plank, side plank, cat-camel and pelvic tilt are standard motor-control and stabilisation exercises in physio practice. I could not retrieve the JOSPT LBP 2021 CPG text in this session to cite grades (see Gaps).
- Tandem stance, heel-to-toe walk, sit-to-stand and marching are recognisable components of the Otago Exercise Programme. I could not retrieve an Otago source to cite.
- For Zimbabwe and other low-resource settings, the highest-value, zero-equipment additions are: wall push-up, wall slide or wall angel, scaption, neck side bend, marching, 30CST (chair), tandem stance and functional reach (wall). All need only a wall or a chair.

### Gaps
- JOSPT Low Back Pain CPG (2021 revision) and shoulder CPGs (adhesive capsulitis 2013, rotator cuff tendinopathy 2025 if published) were not retrieved; no citations for their exercise grades.
- Otago programme manual not retrieved.
- National stroke guideline (e.g. AHA/ASA 2016, UK NCGS 2023) recommendations for repetitive task practice were not retrieved.

## 4. Does a single 2D camera measure each reliably? Implementations and validation literature

### Takeaway
Reliable in 2D (single phone, correct view): push-ups (side), wall push-up, overhead press, row, triceps extension, wall slides and wall angels, scaption, neck side bend, marching, 30CST, plank and side-plank holds, tandem stance (hold), reach and hand-to-mouth (counts and coarse ROM). Unreliable or proxy-only: shoulder external and internal rotation (except 90/90 front view), neck rotation, trunk rotation, pelvic tilt, cat-camel, and supine work such as dead bug. TUG and heel-to-toe walk are possible for total time only. Published MediaPipe validation is thin, small-sample and mostly in healthy adults. BlazePose's z (depth) is not metric and should not drive counters.

### Cited Findings
- BlazePose z-coordinate "lacks a consistent scale, making it unreliable" compared with x/y. Google's model card states z is not metric, only up to scale. BlazePose lacks anthropometric constraints, so bone lengths drift between frames. One 2025 paper states BlazePose does not reach the clinically required 12° accuracy for physiotherapy. — [arXiv 2512.06783](https://arxiv.org/html/2512.06783v1); [ML Kit pose model card](https://developers.google.cn/static/ml-kit/images/vision/pose-detection/pose_model_card.pdf)
- Supine poses are out of distribution for adult-trained pose estimators (studied in infants); crossed legs supine are poorly estimated. — [arXiv 2406.17382](https://arxiv.org/html/2406.17382v2)
- Webcam BlazePose ROM vs marker-based mocap across neck, spine and limb joints in 25 healthy adults showed high test-retest reliability (PLOS ONE 2023; per-joint neck and rotation agreement not seen because full text was blocked). — [PLOS ONE 2023 webcam ML ROM (PMC10593217)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10593217/)
- Shoulder rotation is hard to measure from a face-to-face 2D view. A Kobe University study needed MediaPipe plus machine learning to estimate internal and external rotation from frontal video in 10 volunteers. — [Kobe Univ. thesis PDF](https://da.lib.kobe-u.ac.jp/da/kernel/0100489645/0100489645.pdf)
- A Montpellier 2024 study stated that, at the time, no studies had confirmed MediaPipe's reliability and validity for ROM measurement; it addressed this for shoulder ROM. — [HAL LIRMM-04055464](https://hal-lirmm.ccsd.cnrs.fr/lirmm-04055464/document)
- A 2025 J Shoulder Elbow Surg study compared smartphone front-camera 2D pose tracking with visual estimation for shoulder ER (two positions), abduction, flexion, extension and functional IR in 17 pain-free adults (agreement statistics not retrieved). — [PMC12490633](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12490633/)
- NeckWatcher (MediaPipe Pose, webcam, head-tilt posture classification) had 61.9% classification accuracy, a sign that neck metrics from body-pose landmarks are coarse. — [HAW Hamburg PETRA 2023](https://users.informatik.haw-hamburg.de/~ubicomp/arbeiten/papers/petra23b.pdf)
- Cervical SCI study (2025) compared MediaPipe 2D, MediaPipe 3D and AlphaPose from a single camera against 8-camera mocap for ROM (detail not retrieved). — [Univ. Genova / Comput Biol Med 2025](https://unige.iris.cineca.it/retrieve/f3970d54-298d-4350-8250-445f107fd095/1-s2.0-S0010482525012600-main.pdf)
- 30CST automation: a wearable thigh sensor detected all 67 sit-to-stand transitions vs manual count in 7 adults (~83 y), plus an unsupervised home study with no dropouts. This shows the counting task is simple once transitions are detected; it is not camera-based. — [Sensors 2020, 20(20):5813](https://www.mdpi.com/1424-8220/20/20/5813/html)
- CORRECTED: the ICC range 0.812 (tandem stand) to 0.995 (five-times sit-to-stand) is from a 2026 PLOS Digital Health study of an app on a LiDAR-enabled iPad (228 older adults with chronic illness; automated scoring of 30 s sit-to-stand, TUG and the SPPB; 3.1 % of recordings lost, mostly poor tracking) — [PLOS Digital Health, doi 10.1371/journal.pdig.0001172](https://ideas.repec.org/a/plo/pdig00/0001172.html). It is not an RGB-phone result and not MediaPipe. The 2025 JMIR Aging paper (e67322) is a separate study that used a pocket-worn phone for TUG. A 30-second stand ICC of 0.93 was reported to us but could not be confirmed from the abstract; check the full text before citing it. RecoverLens needs its own RGB-phone agreement figures.
- Camera-based 30s sit-to-stand (MediEval app, skeleton extraction) — preprint, not peer reviewed. — [Preprints.org 202507.0191](https://www.preprints.org/manuscript/202507.0191)
- TUG: marker-free video in 30 adults aged 60–85 gave small mean differences (−6.4% to 13.0% of mocap) and ICCs mostly > 0.90, but the method was semi-automatic. Li et al. segmented TUG sub-tasks in Parkinson's with single 2D camera pose estimation plus SVM. A single depth camera is cheaper but less accurate than multi-camera setups. — [IEEE MetroXRAINE TUG pose detection (CNR)](https://iris.cnr.it/retrieve/f7bce5f8-8a8c-4b3a-aef1-67d28306ef4e/IEEEMetroXraine_Pose_detection_TUG.pdf); [RGB-D TUG segmentation (PMC9459743)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9459743/); [arXiv 2602.21425 tugturn.py](https://arxiv.org/pdf/2602.21425v1)
- Functional reach: no smartphone-camera pose validation found. A phone-IMU app found accurate position estimation difficult. — [Sensors 2024, 24(4):1301](https://mdpi.com/1424-8220/24/4/1301)
- Stroke drinking task: MediaPipe keypoints classified compensation worse than mocap, and camera angle mattered. — [Frontiers Med 2025](https://public-pages-files-2025.frontiersin.org/journals/medicine/articles/10.3389/fmed.2025.1645369/pdf)

### Inferences
Reliability verdict per exercise, single 2D camera:

| Exercise | View | 2D reliability | Notes |
|---|---|---|---|
| Push-up (floor/knee/incline) | Side | Good for count; good for sag/pike | Elbow flare needs front view |
| Wall push-up | Side | Good | Smaller ROM; use relative threshold |
| Wall slides / wall angels | Front (angels) / side (slides) | Good | Shrug detection is the key fault |
| Scaption | Front or 30° oblique | Good (elevation); plane only coarse | Reuse abduction config |
| Shoulder extension | Side | Good | Watch trunk flexion |
| Overhead press | Front | Good | |
| Row (bent-over / band) | Side | Good for elbow; moderate for scapular retraction (not visible) | |
| Shoulder ER at side (0° abd) | — | **Poor** (rotation along camera axis) | Use ER at 90/90 in front view, or skip |
| Triceps extension | Side | Good | Mirror of curl |
| Plank | Side | Good | Floor height camera needed |
| Side plank | Front | Moderate (down-side occlusion) | |
| Bird-dog | Side | Moderate (far limbs occluded; rotation invisible) | |
| Dead bug | Side, supine | **Poor–moderate** (out-of-distribution pose) | Experimental only |
| Cat-camel | Side | **Poor** (no spine landmarks) | Guided timer, no grading |
| Pelvic tilt | — | **Not measurable** | Timer only |
| Neck side bend | Front | Moderate–good | Face landmarks help |
| Neck rotation | Front | **Proxy only** (no degrees) | % of baseline |
| Neck flexion/extension | Side | Moderate | |
| Trunk rotation | Front | **Proxy only** | Shoulder-width ratio |
| Functional reach / standing reach | Side | Moderate (needs height calibration for cm) | No validation found |
| Tandem stance (hold) | Front or side | Good for hold/fail | |
| Heel-to-toe walk | Side | Poor–moderate (subject leaves frame) | |
| Marching | Front or side | Good | |
| 30-second chair stand | Side | Good (simple transition detection) | Strong candidate |
| TUG | Side, 4–5 m away | Moderate for total time; poor for sub-phases | Needs space |
| Reach to target (stroke) | Front/side | Moderate | Compensation detection weaker than mocap |
| Hand to mouth (stroke) | Front | Moderate | Camera angle matters |

Priorities for RecoverLens (no equipment, reliable in 2D, high rehab value): 30-second chair stand, wall push-up, wall slide or wall angel, plank hold, marching, tandem stance hold, neck side bend, scaption (as a variant of the abduction config), stroke reach-to-target and hand-to-mouth. Second tier: knee push-up, bird-dog, row, triceps extension, functional reach. Avoid or label as "guided, not graded": shoulder ER at side, neck and trunk rotation degrees, pelvic tilt, cat-camel, dead bug.

Use 2D image-plane angles for counters (consistent with SPEC §5.2). Reserve world-landmark z only for left/right disambiguation or direction-of-turn signs, never thresholds.

### Gaps
- Full-text agreement statistics (ICC, RMSE) for MediaPipe vs goniometer or mocap per joint could not be read because NCBI/PMC was blocked in this session. The PLOS ONE 2023 (PMC10593217) and JSES 2025 (PMC12490633) papers are the key ones to read.
- No validated camera-only (MediaPipe) study found for the 30CST, functional reach test, tandem stance or plank form specifically.
- No strong, starred open-source MediaPipe repos found for plank timers, bird-dog or neck ROM; the push-up counter ecosystem is the only mature one, and even it is small and inconsistent.
