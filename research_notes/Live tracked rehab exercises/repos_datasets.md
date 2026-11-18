# Open-source repos and public datasets for live camera exercise tracking (rep counting and form) with MediaPipe Pose

Research notes, 2026-11-18. Scope: GitHub projects, rehab-specific work, generic rep-counting methods, datasets with skeleton data and correctness labels, and MediaPipe angle accuracy.

**Access limits in this session (read these first).** The GitHub REST API (`gh api`) refused unattached repos, so star counts come from the GitHub web pages fetched through WebFetch, and only for the repos I fetched. These hosts would not resolve and need allowing in network settings before anyone re-checks: arxiv.org, zenodo.org, pubmed.ncbi.nlm.nih.gov, fit3d.imar.ro, learnopencv.com. Because of this, several dataset licences and the LearnOpenCV squat thresholds could not be checked against the primary page and are listed under Gaps.

## 1. GitHub repos with live rep counting and form feedback for many exercises

### Takeaway
No high-star, well-maintained project covers a broad rehab set. The useful repos are small MediaPipe projects that use joint-angle finite state machines (FSMs) with roughly 90°/160° thresholds. NgoQuocBao1010/Exercise-Correction (MIT, 129 stars) is the most-starred one I could check, and it uses ML classifiers for form errors. montasim/repstate (MIT) has the architecture closest to RecoverLens: a browser app with a pure-TypeScript FSM and replayed landmark fixtures. Treat every repo's thresholds as starting points to tune (`// TUNE:`), not validated values.

### Cited Findings
- **NgoQuocBao1010/Exercise-Correction**: 129 stars, 43 forks, 265 commits, **MIT licence**. Uses MediaPipe Pose with one ML model per exercise (scikit-learn and Keras) for bicep curl (lean-back error), plank (all errors), basic squat (stage) and lunge (knee-over-toe error). Web app built with Vue 3 and Django. Plank training data came from 30 hand-picked images out of 266 in the plank folder of a Kaggle yoga dataset. Other videos were self-collected and mostly removed for privacy. The README gives no numeric angle thresholds and does not say how reps are counted. — [GitHub](https://github.com/NgoQuocBao1010/Exercise-Correction)
- **montasim/repstate**: 2 stars, **MIT**. Counts lunge, squat and push-up reps in the browser: MediaPipe, then a pure-TypeScript FSM in `domain/rep-engine.ts`. CI replays recorded-landmark fixtures in `fixtures/landmarks/*` and asserts exact rep count, dwell spacing, zero warnings and a snapshot of the state sequence. Engine cost is under 100 µs per frame. Benchmarks on an Intel Iris Xe GPU: lunge clip 9/9 reps and push-up clip 4/4, with inference p50 around 12-13 ms at 15 inference FPS. The README notes that a top-down push-up may not register against its 90° elbow threshold. The bundled clips are third-party footage whose licence is "still being confirmed". The README does not list thresholds or hysteresis values. — [GitHub](https://github.com/montasim/repstate)
- **Pranitha-27/AI-Based-Gym-Exercise-Posture-Corrector-and-Repetition-Counter**: 0 stars, **no licence file**, so the code is not legally reusable. Uses MediaPipe Pose Landmarker (`pose_landmarker_full.task`) with FSM rep counting and a 0-100% rep-progress meter. Published thresholds: **squat** knee ≤95° for full depth, chest lean ≤45°. **Push-up** elbow ≤90°, hip 160-180° for a straight body line. **Curl** extension >150°, contraction <45°. **Overhead press** lockout >165°. **Lunge** front knee 90°. **Plank** has spine and hip monitoring but no numbers. — [GitHub](https://github.com/Pranitha-27/AI-Based-Gym-Exercise-Posture-Corrector-and-Repetition-Counter)
- **MHanzala74/FormFit-AI**: squat, push-up, lunge, curl and plank, with MediaPipe or YOLOv8-Pose backends. Adds form scores, tempo checks and voice coaching. Lunge checks cover working-knee angle and torso lean. Not opened, so stars and licence are unverified. — [GitHub](https://github.com/MHanzala74/FormFit-AI)
- **naresh-coderrr/rep-counter-portfolio**: runs MediaPipe Pose locally in the browser for 7 exercises: push-ups, squats, lunges, bicep curls, shoulder press, jumping jacks and a timed plank. Has a depth bar, form feedback and a rest timer. Not opened. — [GitHub](https://github.com/naresh-coderrr/rep-counter-portfolio)
- **anirudhleetcode-max/formfit**: runs MediaPipe in the browser with an angle state machine and a per-exercise form classifier. Flags when tracking confidence is too low to score form (React, FastAPI, MongoDB). Not opened. — [GitHub](https://github.com/anirudhleetcode-max/formfit)
- **coach-who-codes/ai-rep-counter**: MediaPipe plus a joint-angle state machine for squats, push-ups and curls, written by a personal trainer. Not opened. — [GitHub](https://github.com/coach-who-codes/ai-rep-counter)
- Other small MediaPipe rep-and-form repos, none opened: [Mikael92002/Exercise_App](https://github.com/Mikael92002/Exercise_App), [Ruturaj1160/gym-form-correction](https://github.com/Ruturaj1160/gym-form-correction), [studiousdoston/SpotMe](https://github.com/studiousdoston/SpotMe).

### Inferences
- The consensus angle thresholds across repos are a usable seed set for new `ExerciseConfig`s: knee ≤90-95° at squat or lunge depth, elbow ≤90° at push-up bottom, hip 160-180° for a straight-body plank or push-up line, curl <45° and >150°, overhead lockout >165°. All of them come from gym contexts. Rehab ranges (partial squats, early post-op knee flexion) will need lower and gentler thresholds.
- repstate's fixture-replay CI pattern mirrors RecoverLens's `?debug=1` fixtures and `replay.test.ts`, and is the best reference architecture among these repos. It is MIT licensed, but its demo clips must not be reused until their licence is confirmed.
- Repos without a licence file, such as Pranitha-27, can only be used as inspiration. Copying their code into a product is not permitted.
- ML-classifier approaches like Exercise-Correction need per-exercise labelled data, which conflicts with RecoverLens's rule of pure angle-based configs. Use them for ideas about which errors to check, not for their code path.

### Gaps
- I could not open the most-starred older repos (LearnOpenCV AI Fitness Trainer, Pose-Trainer/OpenPose, RiccardoRiccio's Fitness-AI-Trainer, chrisprasanna/Exercise_Recognition_AI). The GitHub API was blocked and learnopencv.com did not resolve, so their thresholds, stars and licences are unverified here.
- I found no repo that covers bridges, sit-ups or jumping jacks with readable thresholds.
- Activity dates were not visible for most repos.

## 2. Physiotherapy and rehab-focused repos and papers

### Takeaway
The rehab-specific open-source ecosystem is thin: hackathon or student projects plus academic prototypes, none clinically validated. The most relevant are a knee-rehab MediaPipe project with front and side views (Bačić et al., AUT), Excerceo (a browser DTW rehab counter), and the Kingston web-based DTW home-rehab system.

### Cited Findings
- **Bačić et al., "Augmenting Knee Rehabilitation Replays"** (AUT, OpenAccess): MediaPipe Pose analyses knee angles from video with near-real-time visualisation, from both front and side views. — [AUT repository](https://openrepository.aut.ac.nz/items/c4b011fc-2b3c-4f09-bd47-4c231e7dcdaf)
- **Excerceo** (almazur): a web app that recognises, counts and checks rehab exercises from an RGB camera, using PoseNet (TensorFlow.js) and a JavaScript DTW library in the browser. — [GitHub](https://www.github.com/almazur/Excerceo)
- **Shikumli**: a Flask and MediaPipe hackathon app for at-home physiotherapy for war-injured people, with real-time feedback and reports for physios. About 1 star. — [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fyairdayan%2Fshikumli)
- **RehabMotion (sing1ee/my-pose)**: a pose-guided rehab exercise platform, listed as MIT. — [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fsing1ee%2Fmy-pose)
- **physiocore** (PyPI): a physiotherapy exercise toolkit built on MediaPipe and OpenCV. — [PyPI](https://pypi.org/project/physiocore)
- **Kingston University home-rehab system**: compares limb motion against predefined reference exercises with a DTW variant. Web-based, browser UI. Physios can add new movements and routines. — [Kingston eprint](https://eprints.kingston.ac.uk/45736/1/Remagnino-P-45736-VoR.pdf)
- **Sheffield Hallam stroke-rehab work**: subsequence DTW segments repetitions from a single exemplar repetition, using depth sensors. — [SHU](https://shura.shu.ac.uk/24445/1/08688440.pdf)
- A 2025 preprint, "M-Health algorithmic approach to identify and assess physiotherapy exercises in real time", runs MediaPipe client-side, matches sequences with a modified Levenshtein distance and counts reps by peak prominence. — [deeppaper summary of arXiv 2512.10437](https://arxiv.deeppaper.ai/papers/2512.10437v1)
- MediaPipe-based rehab assessment works best for shoulder abduction, shoulder press, elbow flexion and squat. Seated knee extension and shoulder flexion are harder because of unusual poses, occlusion and depth ambiguity. — [Sensors 24(19):6325](https://mdpi.com/1424-8220/24/19/6325) (as summarised by search; full text not opened)

### Inferences
- For RecoverLens, rehab value comes less from code reuse than from method: physio-recorded reference templates (DTW) and clinical datasets (section 4) to tune thresholds for knee and shoulder exercises.
- The finding that seated knee extension and shoulder flexion are hard matches the 3D-angle (`AngleSpec.depth`) workaround RecoverLens already uses for front-view knee exercises. Prefer side views for sagittal-plane exercises.

### Gaps
- I found no maintained open-source repo for older adults or falls-prevention exercises (sit-to-stand, heel raises, balance).
- Licences for the Bačić and Excerceo code were not verified.

## 3. Generic rep counting (RepNet, TransRAC, PoseRAC, DTW and template matching): browser feasibility

### Takeaway
Pose-level methods (PoseRAC, and the follow-up that uses MediaPipe's 33 landmarks plus angles) are small enough to be plausible in the browser. Video-level models (RepNet, TransRAC) are heavy and not a good fit. The most practical generic option for a rehab app is a hybrid: DTW or template matching against a physio-recorded reference of 1-dimensional joint-angle signals, combined with peak or hysteresis counting on the same signal. It is cheap enough to run per frame in TypeScript and still fits a "pure angle-based" design.

### Cited Findings
- **PoseRAC** (Yao, Cheng, Zou, Peking University): pose-level repetitive-action counting that annotates the two most salient poses per rep instead of start and end boundaries. Creates RepCount-pose and UCFRep-pose. Reports OBO 0.56 against TransRAC's 0.29. Code at github.com/MiracleDance/PoseRAC. — [Papers with Code](https://paperswithcode.com/paper/poserac-pose-saliency-transformer-for); [arXiv 2303.08450](https://arxiv.org/abs/2303.08450)
- **Joint-based PoseRAC follow-up** (Chen et al., arXiv 2308.08632): uses 33 MediaPipe BlazePose landmarks plus five joint angles. MAE about 0.211 with angles against 0.236 with landmarks alone. — [ar5iv](https://ar5iv.labs.arxiv.org/html/2308.08632)
- **TransRAC** (CVPR 2022, "Encoding Multi-scale Temporal Correlation with Transformers for Repetitive Action Counting"): introduced the RepCount dataset, linked from svip-lab.github.io/dataset/RepCount_dataset.html. — [Papers with Code task](https://math.paperswithcode.com/task/repetitive-action-counting)
- **DTW plus normalised cross-correlation** with angle-based rep counting is reported to beat RepNet in accuracy and counting. — [Scientific Reports 2025, Essex repository](https://repository.essex.ac.uk/42394/1/s41598-025-29062-7.pdf)
- **Browser DTW precedent**: Excerceo runs JS DTW with PoseNet in the browser. — [GitHub](https://www.github.com/almazur/Excerceo)
- **Single-exemplar subsequence DTW** segments rehab reps from one example repetition. — [SHU](https://shura.shu.ac.uk/24445/1/08688440.pdf)
- **Rehab-specific rep segmentation**: "Rehabilitation Exercise Repetition Segmentation and Counting using Skeletal Body Joints" (arXiv 2304.09735) appeared in search but could not be opened (arxiv.org blocked). — [arXiv](https://arxiv.org/pdf/2304.09735)

### Inferences
- **Feasibility**: DTW on a reference of about 1-3 s (30-90 samples) against a sliding window of one or a few angle channels costs about O(N·M), roughly 10⁴ operations per update, which is trivial in TS per frame. A 2-pose saliency classifier (PoseRAC-style) could be approximated without ML: record the "up" and "down" key poses from the physio, then count transitions by nearest-key-pose with hysteresis. This is effectively an auto-generated `ExerciseConfig`.
- RepNet and TransRAC need video-frame CNN or transformer backbones, so in-browser real-time inference would be heavy. They are better used offline to cross-check counts on test videos.

### Gaps
- I found no published browser (TF.js or ONNX-web) port of PoseRAC with measured latency.
- Exact RepNet comparison numbers in the Scientific Reports paper were not extracted.

## 4. Public datasets with skeleton or pose data and correctness labels

### Takeaway
For rehab correctness, **REHAB24-6** is the best fit for testing a MediaPipe counter: RGB video plus 2D/3D skeletons, 1,072 segmented reps, and binary correct/incorrect labels. You can run MediaPipe on the RGB video and compare against the rep segmentation. **UI-PRMD** (public domain, Vicon and Kinect) is the cleanest licence. **KIMORE** gives clinical quality scores, including patients. Large fitness sets (QEVD, Fit3D) are research-only, or have unverified licences.

### Cited Findings
- **REHAB24-6** (Masaryk University; Zenodo 13305826): 65 recordings, 6 common rehab exercises, 10 subjects. Includes RGB video, 2D and 3D skeleton sequences (26 joints), temporal segmentation of **1,072 individual repetitions**, and **binary correctness labels**. — [MUNI](https://www.muni.cz/en/research/publications/2562137); [Zenodo](https://zenodo.org/records/13305826). Licence not verified (Zenodo blocked).
- **UI-PRMD** (University of Idaho, Vakanski et al. 2018, *Data*): 10 movements common in physical therapy. 10 healthy subjects × 10 repetitions each, correct and incorrect versions. Captured with Vicon and Kinect, in separate folders of positions and angles. **Licence: Open Data Commons Public Domain Dedication and License (PDDL) v1.0**. Known missing files: m03_s03 Vicon (inline lunge, subject 3). — [UI-PRMD site](https://webpages.uidaho.edu/ui-prmd/); [PMC paper](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5773117/)
- **KIMORE** (Capecci et al., IEEE TNSRE 27(7), 2019, doi 10.1109/TNSRE.2019.2923060): Kinect v2, 78 subjects (44 healthy, 34 with motor dysfunction: back pain, Parkinson's, stroke). Low-back-pain exercises with clinical scores per exercise and clinically relevant features. — [KIMORE page](https://vrai.dii.univpm.it/node/204704); [PubMed](https://www.pubmed.gov/31217121/). Licence not verified.
- **IntelliRehabDS (IRDS)**: Kinect 3D joint positions from 15 patients and 14 healthy people, 9 rehab exercises, each sample labelled correct or incorrect. — [Data descriptor PDF](https://pdfs.semanticscholar.org/b916/9ae3b342e5632370bc9b18ff2f085546058f.pdf); [Zenodo 4610859](https://zenodo.org/records/4610859). Licence not verified.
- **KERAAL** (low-back-pain rehab, clinically collected; described as the first clinically grounded benchmark for rehab exercise analysis). — [arXiv 2407.00521](https://arxiv.org/pdf/2407.00521); [arXiv 2601.06138](https://arxiv.org/pdf/2601.06138). Sensors, size and licence not verified.
- **Benchmark paper** "A Standardized Benchmark for Skeleton-Based Rehabilitation Assessment Using Deep Learning" (arXiv 2507.21018) compares these rehab datasets. — [arXiv](https://arxiv.org/pdf/2507.21018) (not opened)
- **QEVD (Qualcomm Exercise Video Dataset)**: QEVD-FIT-300K has form-fault attributes such as "too slow" and "very low range of motion", plus a separate layer of fitness-coach feedback annotations. **Research use only, under the Qualcomm Data Research License** (Feb 2025). Requires a Qualcomm account. — [Qualcomm](https://www.qualcomm.com/developer/software/qevd-dataset); [Voxel51 card](https://docs.voxel51.com/dataset_zoo/datasets_hf/qualcomm_exercise_video_dataset_benchmark.html)
- **Fit3D** (IMAR, AIFit paper): 611 multi-view sequences, each with at least 5 annotated repetitions. About 3 million ground-truth 3D skeletons. — [fit3d.imar.ro](https://fit3d.imar.ro/) (summarised via search). The site could not be fetched, so licence and correctness labels are unverified.
- **MM-Fit** (Edinburgh): multimodal workout-session data. The video subset is on Zenodo (2023). The record did not state a licence or correctness labels. — [Edinburgh record](https://www.research.ed.ac.uk/en/datasets/mm-fit-dataset-physical-exercise-workout-sessions-video/)
- **EC3D**: a lab dataset with 362 sequences in 3 categories, used for action recognition. Most fitness datasets carry only one action label per sequence. — [FLAG3D/related arXiv 2212.04638](https://arxiv.org/pdf/2212.04638v2.pdf)
- **RepCount (TransRAC)** and **RepCount-pose / UCFRep-pose (PoseRAC)**: rep-count ground truth for in-the-wild videos, with pose-level salient-pose annotations in the PoseRAC versions. — [PoseRAC](https://paperswithcode.com/paper/poserac-pose-saliency-transformer-for)
- **M3GYM** (CVPR 2025): a large-scale multimodal, multi-view, multi-person fitness pose dataset. — [CVF](https://openaccess.thecvf.com/content/CVPR2025/papers/Xu_M3GYM_A_Large-Scale_Multimodal_Multi-view_Multi-person_Pose_Dataset_for_Fitness_CVPR_2025_paper.pdf) (not opened)

### Inferences
- **Usefulness for a MediaPipe rep counter**:
  - Datasets with **RGB video** (REHAB24-6, QEVD, Fit3D, RepCount) can be run through MediaPipe in the browser or Node to produce landmark fixtures for `replay.test.ts`.
  - **Kinect or Vicon-only** sets (UI-PRMD, KIMORE skeletons, IRDS) need joint remapping from 25 Kinect joints or Vicon markers to the 33 MediaPipe landmarks. Their joint-angle trajectories are still usable to sanity-check thresholds and range-of-motion profiles, and correct-versus-incorrect separation.
- **Licence for a product**: UI-PRMD (PDDL) is the safest. QEVD is research-only, so do not ship anything derived from it. Others need their licence checked before commercial use. Using a dataset only for internal testing is generally lower risk than redistributing it, but confirm terms.

### Gaps
- Licences for REHAB24-6, KIMORE, IRDS, Fit3D, MM-Fit, EC3D, Countix and RepCount could not be verified, because zenodo.org, arxiv.org and fit3d.imar.ro were blocked.
- Penn Action and Countix were not researched in this session.
- I did not confirm which six exercises are in REHAB24-6 or which ten are in UI-PRMD (UI-PRMD includes an inline lunge).

## 5. MediaPipe joint-angle accuracy against motion capture or goniometer

### Takeaway
Single-camera MediaPipe knee flexion is accurate to within a few degrees under good conditions: about +1.5° bias against goniometer-set targets. Shoulder ROM measures are reported reliable for telerehab in some studies, but other studies still see discrepancies. Accuracy depends strongly on camera view and exercise, and degrades quickly in less favourable conditions. I found no MediaPipe validation in degrees for lying (supine or prone) exercises, and none against a goniometer for the hip.

### Cited Findings
- **Knee**: MediaPipe BlazePose Heavy against goniometer-set static targets (30°, 60°, 90°, 120°) and against Kinovea 2D annotation for dynamic tasks. Mean bias about **+1.51°** in one comparison. Agreement varied with task, flexion angle and detection quality. — [PubMed 42976294](https://pubmed.ncbi.nlm.nih.gov/42976294) (via search summary; page blocked)
- **Shoulder**: one study found MediaPipe reliable and valid for four active shoulder ROMs in telerehab. — [Measurement (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0263224123003901). An abduction study notes that discrepancies against the goniometer persist. — [PMC10416158](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10416158/). Single-camera markerless shoulder ROM was also assessed in healthy people and adhesive-capsulitis patients. — [PMC11991502](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11991502/)
- **Exercise and view dependence**: Dill et al. (Current Directions in Biomedical Engineering, 2023) found MediaPipe Pose can be highly accurate under optimal conditions, but accuracy "quickly decreases" when conditions are less favourable. It depends on camera viewing angle and the exercise. — [DOAJ](https://doaj.org/article/b1b1d4db2666494cacf7bcbcee8cdaa3)
- **Stereo against monocular** (Dill et al., Sensors 2024): stereo fusion had a median RMSE of 30.1 mm against 56.3 mm for monocular MediaPipe 3D, compared with mocap. — [PMC11644880](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11644880/)
- **Monocular BlazePose plus temporal network**: error ranged from 11.21 mm (quiet standing) to 62.83 mm (seated knee extension) against optical mocap. — [IJACSA 17(10) paper 65](https://thesai.org/Downloads/Volume17No10/Paper_65-Accuracy_and_Reliability_of_Monocular_3D_Pose.pdf)
- **Sit-to-stand** (Sensors 2025): MediaPipe against Vicon during the 5× sit-to-stand test. Highest RMSE was at the ankle in the anterior-posterior direction, 54.55 mm, in the DLD group. — [MDPI Sensors 25(10):3122](https://www.mdpi.com/1424-8220/25/10/3122)
- **View angle (OpenPose, as a proxy)**: camera viewing angle changed hip and knee bias. Shoulder biases of -16° to -26° were reported for OpenPose, not MediaPipe. — [Sensors 25(3):799](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11819822/)
- **Video goniometer apps for knee during walking** in neurological patients: validity and reliability study. — [PMC9960424](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9960424/) (not opened)

### Inferences
- Use a side (sagittal) view for flexion and extension exercises (knee, hip, elbow) and a front view for abduction (shoulder, hip). This supports RecoverLens's pixel-space angles plus 3D depth only for front-view knee. Thresholds near the extremes of range (full extension, or deep flexion over 120°) and seated or occluded positions deserve wider hysteresis.
- Lying exercises (bridges, straight-leg raises, heel slides) lack validation evidence. Treat them as higher-uncertainty, with wider `// TUNE:` margins, and test them with recorded fixtures.

### Gaps
- No per-joint degree errors for supine or prone positions were found.
- No MediaPipe-against-goniometer hip validation was found.
- The full numbers in the knee BlazePose paper (limits of agreement, ICC, per task) could not be read because PubMed was blocked.
