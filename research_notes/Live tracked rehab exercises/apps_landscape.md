# Competitive landscape: AI / computer-vision digital MSK rehab apps (as of Nov 2026)

Method note: 15 web searches and fetches. www.hingehealth.com and www.physitrack.com could not be fetched from this session because the network allowlist blocks them, so figures for those companies come from search snippets, SEC filings and investor documents. Most adherence and outcome figures in this space come from the companies themselves. Where that is the case, it is flagged.

## 1. Products: exercise libraries, tracking technology, feedback, hardware

### Takeaway
The market splits into four groups:
- **Enterprise US "virtual MSK clinics"** (Sword, Hinge). They combine human physical therapists with proprietary hardware or computer vision and are paid for by employers or health plans.
- **B2B camera-only platforms** (Kemtai, Exer). They sell to providers and claim large libraries (Kemtai 2,000+ exercises; Exer about 144 assessments) and ROM measurement.
- **Home-exercise-program (HEP) prescription tools** (Physitrack/PhysiApp, Limber). These are adding camera tracking and US remote therapeutic monitoring (RTM) billing.
- **Evidence-led self-management apps** (Kaia, selfBACK).

None of them targets low-resource, offline, multilingual African settings.

### Cited Findings
**Kemtai (Israel, B2B, camera only)**
- Library of 2,000+ exercises covering physio and MSK, neuro and chronic care, pilates, stretching and high-intensity work. Webcam or phone camera, no sensors — [Kemtai FAQ](https://kemtai.com/faqs/); [IntuitionLabs listing](https://intuitionlabs.ai/software/physical-occupational-therapy/rom-and-goniometry-tracking/kemtai)
- Tracks adherence down to user, exercise and repetition level. Sells motion and posture data and ROM to providers — [Kemtai PT data](https://kemtai.com/product/physical-therapy-data/); [Kemtai MSK](https://kemtai.com/musculoskeletal-care/)
- Accuracy validated against Vicon motion capture at ALYN Hospital (research report, March 2025). Kemtai calls it peer-reviewed, but its homepage footnotes cite "data on file" — [ALYN Hospital](https://www.alyn.org/Kemtai-more-info); [Kemtai gold standard](https://kemtai.com/gold-standard/)
- Offers an end-to-end "Kemtai CARE" service model — [Kemtai CARE](https://kemtai.com/kemtai-care-end-to-end/)

**Exer AI (Exer Health / Exer Scan, US)**
- Camera-based markerless capture on iOS. No sensors or extra hardware. Measures joint angles, counts reps, gives form adjustments and real-time feedback — [App Store: Exer Health](https://apps.apple.com/us/app/exer-health/id1505858367); [MDPI Sensors 2025](https://www.mdpi.com/1424-8220/25/17/5428)
- Exer Scan is described as a Class II, 510(k)-exempt Software as a Medical Device (SaMD) for functional movement assessment, with about 144 assessments (tremor, sit-to-stand, balance, joint ROM, gait). It has a hand/wrist module deployed at Mayo Clinic and integrates natively with Epic — [App Store: Exer Scan](https://apps.apple.com/us/app/exer-scan/id6466210809); [PR Newswire, hand/wrist module](https://www.prnewswire.com/news-releases/exer-ai-announces-exer-scan-apps-handwrist-module-introduced-at-mayo-clinic-to-advance-musculoskeletal-care-and-clinical-workflow-efficiency-302847589.html); [Exer modules](https://www.exer.ai/product/modules); [MobiHealthNews on Mayo partnership](https://www.mobihealthnews.com/news/exclusive-exer-ai-expands-partnership-mayo-clinic-clinical-deployment)

**Sword Health (Thrive = MSK; Bloom = pelvic health; Move = prevention; also Mind and Pulse)**
- Thrive pairs Doctors of Physical Therapy with "Phoenix", an AI Care Specialist that gives real-time feedback. It uses a mobile app plus proprietary hardware, the "Thrive Pad" — [Sword Thrive](https://swordhealth.com/solutions/thrive); [ULA Network on Thrive Pad](https://ulanetwork.com/blog/meet-thrive-pad-recovery-just-got-smarter)
- Phoenix launched June 2024 as a conversational voice AI that guides members during sessions and summarises performance for clinicians. In March 2026 Sword launched an "AI Care Platform" in which Phoenix serves Thrive, Bloom, Mind and Pulse — [Sword: Introducing Phoenix](https://swordhealth.com/articles/introducing-phoenix); [Sword newsroom, Mar 2026](https://swordhealth.com/newsroom/introducing-sword-s-ai-care-platform); [Sword voice agent research](https://swordhealth.com/research/how-we-built-our-voice-based-conversational-agent)

**Hinge Health (US, public company; TrueMotion, Enso, Robin)**
- October 2025: launched "Movement Analysis", which uses TrueMotion computer vision to record joint angles, symmetry and endurance during guided movements. Pitched as objective measurement, since most MSK outcome tools rely on self-report — [Hinge press release (PDF mirror)](https://s205.q4cdn.com/978984498/files/doc_news/Hinge-Health-unveils-new-AI-powered-care-tools-2025.pdf)
- Enso is a wearable electrical nerve stimulation device for pain, which adds hardware cost — [Hinge S-1](https://www.sec.gov/Archives/edgar/data/1673743/000119312525051004/d829170ds1.htm)
- A June 2026 investor deck focuses on movement and computer vision — [Hinge Movement investor deck, June 2026](https://s205.q4cdn.com/978984498/files/doc_events/2026/Jun/10/Hinge-Health-PDF-Movement-investor-deck-June-2026.pdf)

**Physitrack / PhysiApp (UK/global HEP platform)**
- Motion capture was still marked "coming soon":
  - It tracks about 33 body points from a webcam using an open-source model (the 33-point count matches MediaPipe BlazePose).
  - It counts reps and gives cues.
  - The launch set is the 500 most-prescribed exercises, with no custom exercises.
  - It claims no diagnosis or clinical decisions.
  - [Physitrack motion capture page (search snippet)](https://www.physitrack.com/motion-capture)
- Real-time adherence tracking and patient feedback through PhysiApp — [Physitrack comparison](https://www.physitrack.com/insights/physitrack-vs-medbridge-vs-limber-health)

**Limber Health (US)**
- Sells RTM as a "white glove, turnkey" service, with a Care Navigator team doing the monitoring. It targets health-system virtual MSK programs. This comes from a competitor (Physitrack) — [Physitrack on Limber reviews](https://www.physitrack.com/insights/limber-health-reviews)

**Kaia Health (Germany/US)**
- Smartphone-camera "Motion Coach" gives exercise corrections. A 2021 prospective study in knee and hip osteoarthritis found its computer-vision feedback non-inferior to physiotherapist evaluations, and a JMIR study found its feedback consistent with in-person PT feedback — [Kaia press release](https://kaiahealth.com/newsroom/press-releases/clinical-study-kaia-health-computer-vision-technology-as-accurate-as-physical-therapists-in-suggesting-exercise-corrections/); [Kaia blog](https://kaiahealth.com/blog/musculoskeletal-digital-therapy/)
- Low back pain motion-coaching validation pilot registered as NCT04411108 — [ClinicalTrials.gov](https://clinicaltrials.gov/study/NCT04411108)

**selfBACK (EU research consortium, not commercial computer vision)**
- AI case-based reasoning tailors self-management plans: physical activity advice, exercises and education. There is no camera tracking — [selfBACK protocol, PubMed](https://pubmed.ncbi.nlm.nih.gov/31793897/)

**Other camera apps**
- EQPT Health counts reps by camera and links patients to therapists. KinesteX AI does pose estimation; one user review calls its form tracking "mediocre at best". Generic fitness rep counters include Form Coach, REP AI and RepWise — [EQPT Health](https://appshunter.io/ios/app/eqpt-health/id6763470824); [KinesteX App Store](https://apps.apple.com/us/app/kinestex/id1619135943)

### Inferences
- Physitrack's coming-soon feature uses a BlazePose-type 33-point model, the same class of open-source pose model available to RecoverLens. Camera tracking alone is no longer a differentiator; the value is in what surrounds it (adherence, context, measurement).
- The big players' moat is human physical therapists plus employer contracts plus hardware, none of which transfers to Zimbabwe. Kemtai and Exer show the camera-only route is clinically credible.
- RecoverLens's 9 tracked exercises is small against Kemtai's 2,000+ or Physitrack's 500. The entry should frame depth over breadth: accurate, validated tracking of the highest-value MSK exercises, plus a few validated functional tests, rather than compete on count.

### Gaps
- The exact list of camera-tracked exercises per product (for example whether push-ups, lunges or bridges are tracked) was not published in the sources found. Kemtai and Physitrack give counts only.
- "Phyio" could not be identified. No product by that name came up; it may be a misspelling of PhysiApp. Tracky, Plethy (Recupe), Uplift Labs, PeerWell, Agile Kinetic, Physera and Reflexion Health (VERA) returned no results in the searches run.
  - Unverified background, not confirmed this session: Reflexion's VERA was a Kinect-based post-knee-replacement system tested in the VERITAS trial. Physera was acquired by Omada Health. Uplift Labs does sports-performance markerless capture.
- Which sensors the Sword Thrive Pad contains could not be confirmed. Earlier Sword generations used wearable inertial motion trackers (older knowledge, unverified here).

## 2. Clinical evidence

### Takeaway
Kaia (large RCT) and selfBACK (RCT) have the strongest independent-style trial evidence. Sword and Hinge publish many studies, but most are sponsored or observational, and an independent Milliman review declined to endorse causality for Sword's ROI. Camera-feedback accuracy (Kaia, Kemtai) is validated against physical therapists or motion capture. Adherence figures are almost always company-reported.

### Cited Findings
- **Kaia, Rise-uP RCT (Germany, about 1,237–1,245 patients with non-specific low back pain):** 46% pain reduction at 12 months versus 24% for control, published in Journal of Pain Research. The intervention package also included GP decision support and remote consultation, so the app's effect is not isolated. Reported enrolment differs between sources — [pharmaphorum](https://pharmaphorum.com/news/kaia-app-for-lower-back-pain-shows-its-worth-in-large-scale-trial); [Clinical Trials Arena](https://www.clinicaltrialsarena.com/news/kaia-healths-back-pain-app-reduces-pain-intensity/)
- **Kaia, smaller RCT (about 101 patients):** pain score (NRS) at 12 weeks was 2.70 (SD 1.51) for the app versus 3.40 (SD 1.63) for PT plus online education — [Clinical Trials Arena](https://www.clinicaltrialsarena.com/news/kaia-healths-back-pain-app-reduces-pain-intensity/); [NCT04290078](https://clinicaltrials.gov/study/NCT04290078)
- **Kaia Motion Coach:** non-inferior to physiotherapist exercise evaluations in knee and hip osteoarthritis (2021) — [Kaia press release](https://kaiahealth.com/newsroom/press-releases/clinical-study-kaia-health-computer-vision-technology-as-accurate-as-physical-therapists-in-suggesting-exercise-corrections/)
- **selfBACK, primary-care RCT (2021):** added to usual care, it lowered low-back-pain disability at 3 months, sustained to 9 months, but the effect was small and of uncertain clinical significance. Uptake was relatively low, and benefits were larger among more adherent users — [ResearchGate: selfBACK RCT](https://www.researchgate.net/publication/353668528_Effectiveness_of_App-Delivered_Tailored_Self-management_Support_for_Adults_With_Lower_Back_Pain-Related_Disability_A_selfBACK_Randomized_Clinical_Trial); [Rughani 2023, Eur J Pain](https://onlinelibrary.wiley.com/doi/10.1002/ejp.2080)
- **selfBACK, specialist-care RCT:** no better than usual care or a web-based intervention — [PMC process evaluation](https://pmc.ncbi.nlm.nih.gov/articles/PMC11267091/)
- **Sword:**
  - 2023 npj Digital Medicine study with Emory on chronic low back pain reported outcomes comparable to in-person PT. Sword claims engagement and completion more than 2x best-in-class in-person PT (company claim) — [Castor blog](https://www.castoredc.com/blog/what-sword-health-got-right-about-evidence/); [Sword press release](https://www.globenewswire.com/news-release/2023/07/10/2701823/0/en/groundbreaking-study-in-nature-digital-medicine-establishes-sword-health-s-digital-physical-therapy-program-as-the-new-gold-standard-of-care-for-the-50-million-americans-who-endure.html)
  - Knee-replacement work is a feasibility study comparing an 8-week digital program with conventional rehab — [Sword clinical study page](https://sword.com/clinical-excellence/clinical-studies/home-based-digital-rehab-after-knee-replacement)
  - 81% adherence (as of May 2024); 50% reduction in anxiety and 64% in depression in chronic shoulder pain (2022). All company-reported — [Contrary Research](https://research.contrary.com/company/sword-health)
  - Milliman (Dec 2025) reviewed the Thrive ROI methodology, a retrospective propensity-matched analysis. It did not assess whether Thrive causes the reported savings — [Milliman report](https://media.milliman.com/v1/media/edge/images/millimaninc5660-milliman6442-prod27d5-0001/media/Milliman/PDFs/2025-Articles/12-17-25_Independent-Review-Report-SWD-Methodology.pdf)
  - Bloom: claims-based ROI study of more than 4,000 participants reported 2.9:1 gross ROI and 148 fewer surgeries versus control. Not randomised — [Transformation Capital](https://transformcap.com/company-newsletters/market-mover-july-2025)
- **Hinge:**
  - Two Enso RCTs published in Journal of Pain Research (2024). The S-1 states that all its cited outcome and ROI studies were sponsored, funded or supported by Hinge — [Hinge S-1](https://www.sec.gov/Archives/edgar/data/1673743/000119312525051004/d829170ds1.htm)
  - Company figures (July 2024): 54% of Enso users report a 2x reduction in pain — [Contrary Research](https://research.contrary.com/company/hingehealth)
  - A trial registry entry calls the Enso evidence "preliminary" — [NCT07011537](https://clinicaltrials.gov/study/NCT07011537)
- **Kemtai:**
  - 72% average adherence with real providers ("data on file") — [Kemtai homepage](https://kemtai.com/)
  - Claims adherence more than 2x traditional PT, against typical home-exercise adherence of 30% or lower — [Kemtai MSK](https://kemtai.com/musculoskeletal-care/)
  - Six-month HMO pilot: 33% fewer appointments when started within the first two PT sessions. Published on Kemtai's own blog, no sample size given — [Kemtai blog](https://kemtai.com/blog/the-cost-saving-potential-of-digital-rehabilitation-for-payviders-and-integrated-delivery-systems/)

### Inferences
- Judges will know that headline adherence figures (72%, 81%) are vendor-reported. RecoverLens wins credibility by stating its evidence plan honestly: a pre-registered pilot, validated measures, and an accuracy check of its angles against goniometry.
- selfBACK shows that low uptake erodes app benefit, which supports RecoverLens's focus on lapse detection and comeback nudges.

### Gaps
- Not verified this session (from memory, needs checking): Hinge's 2020 npj Digital Medicine cohort of about 10,000 participants (Bailey et al.) with large pain reductions and high engagement; Sword's 2022 RCT in knee replacement (Correia et al.). Neither appeared in the searches.
- No peer-reviewed adherence figures for Exer, Physitrack camera tracking or Limber were found.

## 3. Adherence features and business model (including US RTM)

### Takeaway
Adherence features cluster around:
- human physical therapist or coach contact (Sword, Hinge, Limber's navigators);
- AI conversational coaches (Sword Phoenix, Hinge Robin);
- adherence and rep logs sent to clinicians (Kemtai, Physitrack);
- US RTM billing (CPT 98975–98981), which pays for monitoring at least 16 days of data a month.

Pricing is B2B: employers, health plans, or per-clinician seats.

### Cited Findings
- Physitrack's RTM module automates the 16-day engagement tracking needed for codes 98975–98981. It costs $8 per active patient per month on top of $30 per user per month — [Physitrack RTM](https://www.physitrack.com/remote-therapeutic-monitoring-rtm); [Physitrack best RTM software](https://www.physitrack.com/insights/best-rtm-software)
- Physitrack's own comparison claims about $9,960 a year versus Limber's $28,800 at 100 active patients (competitor claim) — [Physitrack vs MedBridge vs Limber](https://www.physitrack.com/insights/physitrack-vs-medbridge-vs-limber-health)
- RTM needs only a smartphone app and covers adherence and therapeutic outcomes — [PMC review on RTM in MSK diseases](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10972608/)
- Sword is free to members through employers, health insurers or unions. No per-member price is published — [Sword Thrive](https://swordhealth.com/solutions/thrive)
- Sword's Phoenix summarises session performance for the human clinician — [Sword: Introducing Phoenix](https://swordhealth.com/articles/introducing-phoenix)
- Hinge's Movement Analysis gives objective joint-angle, symmetry and endurance data to replace self-report — [Hinge press release PDF](https://s205.q4cdn.com/978984498/files/doc_news/Hinge-Health-unveils-new-AI-powered-care-tools-2025.pdf)

### Inferences
- The US models monetise clinician monitoring time. In Zimbabwe there is no RTM billing, so the equivalent value proposition is extending scarce physiotherapists: one physio supervising many patients asynchronously through a triaged dashboard.
- Gamification and streaks appear less in clinical-grade products than in consumer apps. The clinical products stress human accountability, which RecoverLens's caregiver mode can substitute at no cost.

### Gaps
- Details of Hinge's and Kaia's gamification and streaks, and Hinge's "Robin" AI assistant, could not be confirmed because hingehealth.com was blocked.

## 4. Gaps and criticisms of incumbents

### Takeaway
The incumbents are US/EU-centric, enterprise-priced, English-first and iOS- or hardware-heavy. Their evidence is mostly self-sponsored. None is designed for unstable connectivity, high data costs or African languages.

### Cited Findings
- Hinge's S-1 states that all its cited studies were company-sponsored — [Hinge S-1](https://www.sec.gov/Archives/edgar/data/1673743/000119312525051004/d829170ds1.htm)
- The independent Milliman review did not establish causality for Sword's savings — [Milliman](https://media.milliman.com/v1/media/edge/images/millimaninc5660-milliman6442-prod27d5-0001/media/Milliman/PDFs/2025-Articles/12-17-25_Independent-Review-Report-SWD-Methodology.pdf)
- Exer Scan runs on compatible iOS devices only — [App Store: Exer Scan](https://apps.apple.com/us/app/exer-scan/id6466210809)
- Sword requires proprietary hardware (Thrive Pad); Hinge sells the Enso wearable — [ULA Network](https://ulanetwork.com/blog/meet-thrive-pad-recovery-just-got-smarter); [Hinge S-1](https://www.sec.gov/Archives/edgar/data/1673743/000119312525051004/d829170ds1.htm)
- Physitrack's motion capture does not support custom exercises — [Physitrack motion capture](https://www.physitrack.com/motion-capture)
- Low uptake undermined selfBACK — [PMC process evaluation](https://pmc.ncbi.nlm.nih.gov/articles/PMC11267091/)
- A Physitrack-hosted review says Limber's outsourced navigator model could complicate practice billing — [Physitrack on Limber](https://www.physitrack.com/insights/limber-health-reviews)

### Inferences
- Positioning: "Android-friendly, works offline, speaks chiShona and isiNdebele, no hardware, no subscription" is a direct contrast to every incumbent.

### Gaps
- No direct sources were found on incumbents' language support, accessibility (WCAG), or privacy incidents. Privacy is worth stressing anyway: on-device pose processing sends no video.

## 5. Digital MSK rehab and telerehab in Africa and LMICs; what judges value

### Takeaway
The need is enormous and the workforce tiny. Zimbabwe has about 0.26–0.27 practising physiotherapists per 10,000 people, and rehab need is concentrated in low-income countries. The sub-Saharan Africa telerehab evidence is small (mostly Nigeria and Ghana) but positive on feasibility and adherence. Barriers are connectivity, power, data cost, smartphone access and digital literacy, which are exactly what an offline-first, low-data, local-language PWA addresses.

### Cited Findings
- 2.4 billion people globally need rehabilitation, with the highest unmet need in low-income countries (GBD 2019) — [Frontiers in Medicine 2025](https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2025.1716773/full)
- Rehabilitation workforce density is 0.04 per 10,000 in sub-Saharan Africa versus 0.7 globally (Frontiers). World Physiotherapy gives 0.27 practising physiotherapists per 10,000 for its Africa region. The two definitions differ — [Frontiers](https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2025.1716773/full); [World Physiotherapy Africa](https://world.physio/regions/africa)
- Zimbabwe: 0.26 practising physiotherapists per 10,000 (2023 census); the country page lists 0.27 — [World Physiotherapy AMC 2023 Zimbabwe](https://world.physio/sites/default/files/2024-01/AMC2023-Zimbabwe.pdf); [World Physiotherapy: Zimbabwe](https://world.physio/membership/zimbabwe); [AMC 2024 Zimbabwe](https://world.physio/sites/default/files/2025-04/AMC2024-Zimbabwe.pdf)
- Systematic review of telerehab for chronic low back pain in sub-Saharan Africa (2026): 3 Nigerian RCTs out of 110 articles screened. Telerehab reduced pain and improved function about as well as conventional physio, with high adherence, completion and satisfaction. The authors flag limited smartphone access and low digital literacy — [BMC Digital Health / Springer 2026](https://link.springer.com/article/10.1186/s44247-026-00261-0)
- Ghana stroke tele-rehab pilot (mobile-phone-delivered home PT) found it feasible, with motor improvements — [J Neurol Sci](https://www.sciencedirect.com/science/article/abs/pii/S0022510X18300558)
- 2025 LMIC scoping review (Africa subgroup: Ghana, Senegal, Zambia, Cameroon, Tanzania) found barriers of unstable internet, inconsistent power, outdated equipment and limited smartphone access — [PMC12726847](https://pmc.ncbi.nlm.nih.gov/articles/PMC12726847/)
- Challenges to rehab services in sub-Saharan Africa from user, health-system and provider perspectives — [PMC11887585](https://pmc.ncbi.nlm.nih.gov/articles/PMC11887585/)
- Zimbabwe connectivity, early 2025:
  - about 15.2M cellular connections (90.6% of population);
  - 93.3% broadband-capable;
  - internet penetration 38.4% (DataReportal/GSMA).
  - The regulator POTRAZ reports 84.55% internet penetration and 107% mobile penetration (Q4 2025). The difference comes from counting subscriptions versus unique users.
  - [DataReportal 2025](https://datareportal.com/reports/digital-2025-zimbabwe); [DataReportal 2026](https://datareportal.com/reports/digital-2026-zimbabwe); [IHC Zimbabwe Q4 2025](https://crm.investorhosting.com/media/media-files/IHC_Zimbabwe_2025_Q4_Digital_Economy__Telecoms_Performance_Analysis.pdf)
- Zimbabwe data cost:
  - One international comparison put it at US$43.75/GB (Sept 2023); POTRAZ disputed this, citing about US$3.21/GB.
  - MISA (Aug 2026) says many residents spend more than 10% of monthly income on internet, against the UN's 2% affordability target.
  - [MISA Zimbabwe](https://zimbabwe.misa.org/2026/08/16/internet-affordability-and-access-in-zimbabwe/); [Substack analysis](https://ggtvstreams.substack.com/p/why-zimbabweans-pay-the-most-for)
- GSMA says the affordability of mobile service and smartphones in sub-Saharan Africa needs urgent reform — [GSMA Mobile Economy SSA 2024](https://event-assets.gsma.com/pdf/GSMA_ME_SSA_2024_Web.pdf)

### Inferences
- About 0.26 physiotherapists per 10,000 people in Zimbabwe is roughly 1 per 38,000. That headline justifies "task-shifting": camera feedback plus caregivers plus community health workers, with physio oversight through the dashboard.
- At US$3–44/GB with more than 10% of income spent on data, low data use is a feature to quantify. For example: "a full session uses X KB; video never leaves the phone; the app installs once and runs offline."
- Health-innovation judges typically weigh: the problem, with local data; feasibility and scalability; cost; evidence or validation plan; equity and inclusion (language, disability, gender); sustainability and business model; alignment with WHO Rehabilitation 2030 and national strategy; and a local partner. This is an inference, not sourced.

### Gaps
- WHO Rehabilitation 2030 primary documents and the WHO AFRO 2025–2035 rehabilitation strategy were not fetched.
- No Zimbabwe-specific smartphone penetration percentage (as opposed to connections) was found for 2025–26.
- No published judging criteria from a specific Zimbabwean or sub-Saharan African health-innovation challenge were found.
- No studies of WhatsApp-delivered physio in Africa were retrieved, though WhatsApp-based health interventions are widely reported (unverified here).

## 6. Features RecoverLens could add to stand out

### Takeaway
RecoverLens already covers much of what incumbents charge for (voice cues, form scoring, AI coach, clinician dashboard, FHIR, caregiver mode, offline PWA), and adds things they lack (African languages, lapse prediction). The highest-leverage additions mirror what the incumbents have:
1. Objective ROM and functional-test reports for clinicians (as with Hinge Movement Analysis and Exer Scan).
2. A published accuracy validation (as with Kemtai and Kaia).
3. Measured low-data and low-end-Android performance.
4. Asynchronous physio triage built for the workforce shortage.

### Cited Findings (basis for recommendations)
- Objective ROM, symmetry and endurance measurement is now a flagship feature at Hinge (TrueMotion Movement Analysis) and Exer (144 assessments including sit-to-stand, balance and gait) — [Hinge PR PDF](https://s205.q4cdn.com/978984498/files/doc_news/Hinge-Health-unveils-new-AI-powered-care-tools-2025.pdf); [Exer modules](https://www.exer.ai/product/modules)
- Accuracy validation against a gold standard is a key credibility claim (Kemtai vs Vicon; Kaia vs physical therapists) — [Kemtai gold standard](https://kemtai.com/gold-standard/); [Kaia press release](https://kaiahealth.com/newsroom/press-releases/clinical-study-kaia-health-computer-vision-technology-as-accurate-as-physical-therapists-in-suggesting-exercise-corrections/)
- EHR integration (Exer–Epic) signals clinical-workflow fit; RecoverLens's FHIR export is the open-standard equivalent — [PR Newswire](https://www.prnewswire.com/news-releases/exer-ai-announces-exer-scan-apps-handwrist-module-introduced-at-mayo-clinic-to-advance-musculoskeletal-care-and-clinical-workflow-efficiency-302847589.html)
- LMIC barriers (connectivity, power, smartphone access, digital literacy) — [PMC12726847](https://pmc.ncbi.nlm.nih.gov/articles/PMC12726847/); [Springer 2026 SSA review](https://link.springer.com/article/10.1186/s44247-026-00261-0)

### Inferences (recommended additions, in priority order)
1. **Camera functional tests with standard norms:** 30-second chair stand (rep count), Timed Up and Go (timer plus sit/stand/walk phase detection), and single-leg stance time. Pair these with active ROM (knee flexion, shoulder flexion/abduction) and a printable or shareable "ROM and function report" in the physio dashboard and FHIR export (FHIR Observation resources with LOINC codes). This matches Hinge and Exer at zero hardware cost.
2. **Accuracy mini-study:** compare RecoverLens's pixel-space angles with a goniometer on 10–20 volunteers and report the mean absolute error. Even a small, honest validation beats vendor "data on file".
3. **Measured low-data mode:** publish KB per session and the size of the one-time install and model download. Sync summaries only (no video), queue them for Wi-Fi, and offer an SMS or USSD fallback for check-ins and nudges.
4. **WhatsApp-shareable weekly progress card** (image or text) for patient, caregiver and physio. WhatsApp is the dominant messenger in the region (unverified here; confirm with DataReportal).
5. **Task-shifting / community health worker mode:** one device, multiple patients, simple triage flags (red/amber/green) for the physio. This answers the ratio of about 0.26 physiotherapists per 10,000.
6. **Low-end Android performance target:** for example "runs at 15 fps or more on a US$80 Android phone", with an adaptive pose-model tier. This contrasts with Exer's iOS-only approach and Sword's hardware.
7. **Audio-first and low-literacy UX:** icon-led screens, full voice guidance (already partly there), and illustrated exercise cards for printing.
8. **Exercise breadth with depth:** add a few high-value MSK exercises such as glute bridge, sit-to-stand, mini squat, heel raise, step-up, shoulder wall slide and wall push-up. Each should be an `ExerciseConfig` with validated cues, rather than chasing Kemtai's 2,000.
9. **Evidence plan slide:** a pre-registered pilot with a Zimbabwean physio department (for example at a teaching hospital), with outcomes of adherence (sessions completed per prescribed), the 30-second chair stand, pain score (NRS), and a patient-reported function measure (for example the Patient-Specific Functional Scale). Align it with WHO Rehabilitation 2030's call to strengthen rehab in primary care.
10. **Privacy statement:** on-device inference, no video upload, data minimisation, and consent in local languages.

### Gaps
- Normative values for the 30-second chair stand and Timed Up and Go in Zimbabwean or African populations were not researched.
- Real-world on-device frame rates for MediaPipe-class models on low-end Android were not researched.
