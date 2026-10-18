// Spoken phrase tables (SPEC §6.2). Keys referenced by ExerciseConfig.cues.
//
// Caregiver mode (SPEC §8.3) uses a `cg.` variant when one exists, addressed to the helper.
// Every cue is in English, chiShona and isiNdebele (respectful plural forms). The Shona and Ndebele
// wording still needs a native speaker's review. A missing key falls back to English.
// {side} is "left"/"right" in English; Shona and Ndebele use {side_arm} / {side_leg}, because the
// word for left or right agrees with the noun (ruoko rworuboshwe, gumbo reruboshwe).

export type Lang = 'en' | 'sn' | 'nd';
export type CueMode = 'self' | 'caregiver';

const en: Record<string, string> = {
  // Calibration (SPEC §5.1)
  cal_no_person: 'Stand in front of the camera.',
  cal_step_back: 'Step back until your whole body is visible.',
  cal_move_closer: 'Move a little closer.',
  cal_move_center: 'Move to the centre.',
  cal_low_light: 'Face the light so the camera can see you clearly.',
  cal_ready: "Great, you're ready.",
  step_back_into_view: 'Step back into view.',
  resumed: "Good, let's continue.",
  safety_stop: 'Stop if you feel sharp pain, dizziness or numbness.',

  // Generic
  rep_of: 'Rep {n} of {total}.',
  rep_last: 'Rep {n}. Set complete.',
  set_complete: 'Set {set} of {sets} complete. Take a short rest, then continue.',
  session_complete: 'Session complete. Well done.',
  lower_slowly: 'Now lower slowly.',
  hold: 'Hold.',
  none: '',

  // Faults (SPEC §5.5)
  keep_torso_upright: 'Keep your torso upright.',
  raise_both_evenly: 'Raise both arms evenly.',
  keep_elbows_straight: 'Keep your elbows straight.',
  keep_elbow_straight: 'Keep your elbow straight.',
  dont_arch_back: "Don't arch your back.",
  knees_over_toes: 'Push your knees out over your toes.',
  knee_over_toes_single: 'Keep your knee over your toes.',
  weight_even: 'Keep your weight even on both feet.',
  keep_heels_down: 'Keep your heels on the floor.',
  keep_hips_level: 'Keep your hips level.',
  chest_up: 'Keep your chest up.',

  // Shoulder abduction
  abd_intro: 'Stand tall, arms by your sides. Raise both arms out to the side, up to shoulder height.',
  abd_raising: 'Raise your arms slowly out to the side.',
  abd_top: 'Hold at shoulder height.',
  abd_raise_higher: 'Try to reach shoulder height.',
  // Single-arm variants (used when one side is chosen)
  abd_intro_one: 'Stand tall, arms by your sides. Raise your {side} arm out to the side, up to shoulder height.',
  abd_raising_one: 'Raise your {side} arm slowly out to the side.',
  keep_elbows_straight_one: 'Keep your elbow straight.',

  // Shoulder flexion
  flex_intro: 'Stand side-on to the camera. Raise your arm forward and up, keeping your back straight.',
  flex_raising: 'Raise your arm forward and up.',
  flex_raise_higher: 'Try to raise your arm a little higher.',

  // Mini squat
  squat_intro: 'Feet hip-width apart. Bend your knees slightly, then stand back up.',
  squat_bend: 'Bend your knees slowly.',
  squat_stand: 'Now stand back up.',
  squat_lower: 'Bend a little further if it is comfortable.',

  // Sit to stand
  sts_intro: 'Sit tall on the chair. Stand up fully, then sit back down slowly.',
  sts_stand: 'Stand up.',
  sts_top: 'Stand tall.',
  sts_sit: 'Sit down slowly.',
  sts_stand_tall: 'Try to stand all the way up.',

  // Single-leg balance
  slb_intro: 'Stand near a wall or chair. Lift one foot and hold your balance.',
  slb_lift: 'Lift one foot off the floor.',
  slb_holding: 'Hold your balance.',
  slb_done: 'Well held.',
  slb_switch: 'Put your foot down. Now switch legs.',
  hold_seconds_left: '{n} seconds left.',
  hold_paused: 'Lift your foot again to continue.',

  // Screening
  screen_squat_intro: 'Feet shoulder-width apart. Do five squats, as deep as is comfortable.',
  screen_sls_intro: 'Stand on your {side} leg. Do five small squats.',
  screen_slb_intro: 'Stand on your {side} leg and hold for {seconds} seconds.',
  screen_jump_intro: 'Jump straight up three times. Land softly with bent knees.',
  squat_down: 'Squat down.',
  squat_up: 'Stand back up.',
  land_softly: 'Land softly.',
  jump_of: 'Jump {n} of {total}.',
  test_complete: 'Test complete.',

  // Guided timer mode
  shoulder_external_rotation_intro: 'Elbow at your side, bent to ninety degrees. Rotate your forearm outward, then back.',
  shoulder_internal_rotation_intro: 'Elbow at your side, bent to ninety degrees. Rotate your forearm inward, then back.',
  pendulum_swing_intro: 'Lean on a table and let your arm hang loose. Swing it gently in small circles.',
  quad_set_intro: 'Press the back of your knee down and tighten your thigh. Hold, then relax.',
  straight_leg_raise_intro: 'Tighten your thigh and lift your straight leg, then lower slowly.',
  heel_slide_intro: 'Slide your heel towards you, then slide it back out.',
  step_up_intro: 'Step up with your recovering leg, then step down slowly.',
  guided_count: '{n}.',
  guided_rest: 'Rest for a moment.',
  next_test: 'Next test: {test}.',

  // Caregiver variants
  'cg.cal_no_person': 'Point the camera at the person exercising.',
  'cg.cal_step_back': 'Move the phone back until their whole body is visible.',
  'cg.cal_move_closer': 'Move the phone a little closer.',
  'cg.cal_move_center': 'Ask them to move to the centre of the screen.',
  'cg.cal_low_light': 'Turn them towards the light so the camera can see them.',
  'cg.cal_ready': 'Great, they are ready.',
  'cg.step_back_into_view': 'Move the phone so their whole body is visible again.',
  'cg.rep_of': "That's a rep. {n} of {total}.",
  'cg.rep_last': "That's a rep. {n}. Set complete.",
  'cg.session_complete': 'Session complete. Well done to you both.',
  'cg.lower_slowly': 'Ask them to lower slowly.',
  'cg.hold': 'Ask them to hold.',
  'cg.keep_torso_upright': 'Ask them to keep their back straight.',
  'cg.raise_both_evenly': 'Ask them to raise both arms evenly.',
  'cg.keep_elbows_straight': 'Ask them to keep their elbows straight.',
  'cg.keep_elbow_straight': 'Ask them to keep their elbow straight.',
  'cg.dont_arch_back': "Make sure they don't arch their back.",
  'cg.knees_over_toes': 'Ask them to push their knees out over their toes.',
  'cg.knee_over_toes_single': 'Ask them to keep their knee over their toes.',
  'cg.weight_even': 'Ask them to keep their weight even.',
  'cg.keep_hips_level': 'Ask them to keep their hips level.',
  'cg.chest_up': 'Ask them to keep their chest up.',
  'cg.abd_intro': 'Ask them to stand tall with arms by their sides, then raise both arms out to shoulder height.',
  'cg.abd_raising': 'Ask them to raise their arms slowly out to the side.',
  'cg.abd_top': 'Ask them to hold at shoulder height.',
  'cg.abd_raise_higher': 'Help them raise their arm a little higher.',
  'cg.abd_intro_one': 'Ask them to raise their {side} arm out to the side, up to shoulder height.',
  'cg.abd_raising_one': 'Ask them to raise their {side} arm slowly out to the side.',
  'cg.keep_elbows_straight_one': 'Ask them to keep their elbow straight.',
  'cg.flex_intro': 'Turn them side-on to the camera. Ask them to raise their arm forward and up.',
  'cg.flex_raising': 'Ask them to raise their arm forward and up.',
  'cg.flex_raise_higher': 'Help them raise their arm a little higher.',
  'cg.squat_intro': 'Ask them to bend their knees slightly, then stand back up.',
  'cg.squat_bend': 'Ask them to bend their knees slowly.',
  'cg.squat_stand': 'Ask them to stand back up.',
  'cg.sts_intro': 'Ask them to stand up fully from the chair, then sit back down slowly.',
  'cg.sts_stand': 'Ask them to stand up.',
  'cg.sts_sit': 'Ask them to sit down slowly.',
  'cg.slb_intro': 'Stay close for support. Ask them to lift one foot and hold.',
  'cg.slb_lift': 'Ask them to lift one foot.',
  'cg.slb_switch': 'Ask them to put their foot down and switch legs.',
  'cg.safety_stop': 'Stop if they feel sharp pain, dizziness or numbness.',
};

// Short pill text for long phrases (the pill holds ~40 characters).
const pillEn: Record<string, string> = {
  abd_intro: 'Raise both arms to shoulder height',
  abd_intro_one: 'Raise your {side} arm to shoulder height',
  'cg.abd_intro_one': '{side} arm out to shoulder height',
  flex_intro: 'Raise your arm forward and up',
  squat_intro: 'Bend your knees slightly, then stand',
  sts_intro: 'Stand up fully, then sit down slowly',
  slb_intro: 'Lift one foot and hold',
  screen_squat_intro: 'Do 5 squats, as deep as comfortable',
  screen_sls_intro: 'Stand on your {side} leg: 5 squats',
  screen_slb_intro: 'Stand on your {side} leg and hold',
  screen_jump_intro: 'Jump 3 times, land softly',
  cal_step_back: 'Step back so your whole body fits',
  cal_low_light: 'Face the light',
  set_complete: 'Set complete. Rest, then continue',
  safety_stop: 'Stop if you feel sharp pain',
  'cg.cal_step_back': 'Move back: whole body in view',
  'cg.abd_intro': 'Arms out to shoulder height',
  'cg.flex_intro': 'Arm forward and up',
  'cg.squat_intro': 'Bend knees slightly, then stand',
  'cg.sts_intro': 'Stand up fully, sit down slowly',
  'cg.slb_intro': 'Lift one foot and hold',
  'cg.abd_raise_higher': 'Help them raise a little higher',
  'cg.keep_torso_upright': 'Keep their back straight',
};


// chiShona. Needs a native speaker's review.
const sn: Record<string, string> = {
  cal_no_person: 'Mirai pamberi pekamera.',
  cal_step_back: 'Dzokerai shure kusvikira muviri wenyu wose waonekwa.',
  cal_move_closer: 'Swederai pedyo zvishoma.',
  cal_move_center: 'Mirai pakati.',
  cal_low_light: 'Tarisai kuchiedza kuti kamera ikuonei zvakajeka.',
  cal_ready: 'Zvakanaka, magadzirira.',
  step_back_into_view: 'Dzokerai pamunoonekwa nekamera.',
  resumed: 'Zvakanaka, ngatienderere mberi.',
  safety_stop: 'Mirai kana mukanzwa marwadzo akapinza, dzungu kana kufa ganzu.',

  rep_of: 'Nhamba {n} pa{total}.',
  rep_last: 'Nhamba {n}. Seti yapera.',
  set_complete: 'Seti {set} pa{sets} yapera. Zororai zvishoma, mozoenderera mberi.',
  session_complete: 'Mapedza. Maita zvakanaka.',
  lower_slowly: 'Zvino dzikisai zvishoma nezvishoma.',
  hold: 'Mirai makadaro.',

  keep_torso_upright: 'Chengetai muviri wenyu wakatwasuka.',
  raise_both_evenly: 'Simudzai maoko ose zvakaenzana.',
  keep_elbows_straight: 'Tambanudzai magokora enyu.',
  keep_elbow_straight: 'Tambanudzai gokora renyu.',
  dont_arch_back: 'Musakombamisa musana wenyu.',
  knees_over_toes: 'Chengetai mabvi enyu akatarisa zvigunwe.',
  knee_over_toes_single: 'Chengetai ibvi renyu rakatarisa zvigunwe.',
  weight_even: 'Govai huremu hwenyu zvakaenzana patsoka mbiri.',
  keep_heels_down: 'Chengetai zvitsitsinho zvenyu pasi.',
  keep_hips_level: 'Chengetai chiuno chenyu chakaenzana.',
  chest_up: 'Simudzai chipfuva chenyu.',

  abd_intro: 'Mirai makatwasuka, maoko ari parutivi. Simudzai maoko ose kurutivi kusvika pamapfudzi.',
  abd_raising: 'Simudzai maoko kurutivi zvishoma nezvishoma.',
  abd_top: 'Mirai makadaro, maoko ari pamapfudzi.',
  abd_raise_higher: 'Edzai kusvika pamapfudzi.',
  abd_intro_one: 'Mirai makatwasuka, maoko ari parutivi. Simudzai ruoko rwenyu {side_arm} kurutivi kusvika papfudzi.',
  abd_raising_one: 'Simudzai ruoko rwenyu {side_arm} kurutivi zvishoma nezvishoma.',
  keep_elbows_straight_one: 'Tambanudzai gokora renyu.',

  flex_intro: 'Mirai rutivi rwenyu rwakatarisa kamera. Simudzai ruoko kumberi uye kumusoro, musana wakatwasuka.',
  flex_raising: 'Simudzai ruoko kumberi uye kumusoro.',
  flex_raise_higher: 'Edzai kusimudza ruoko zvishoma kumusoro.',

  squat_intro: 'Paradzanisai tsoka dzenyu kusvika pahupamhi hwechiuno. Kotamisai mabvi zvishoma, mozosimuka zvakare.',
  squat_bend: 'Kotamisai mabvi zvishoma nezvishoma.',
  squat_stand: 'Zvino simukai.',
  squat_lower: 'Kotamisai zvishoma zvakare kana zvisingakurwadzei.',

  sts_intro: 'Garai pachigaro makatwasuka. Simukai zvakakwana, mozogara pasi zvishoma nezvishoma.',
  sts_stand: 'Simukai.',
  sts_top: 'Mirai makatwasuka.',
  sts_sit: 'Garai pasi zvishoma nezvishoma.',
  sts_stand_tall: 'Edzai kusimuka zvakakwana.',

  slb_intro: 'Mirai pedyo nemadziro kana chigaro. Simudzai tsoka imwe, mumire makadzikama.',
  slb_lift: 'Simudzai tsoka imwe kubva pasi.',
  slb_holding: 'Mirai makadzikama.',
  slb_done: 'Maita zvakanaka.',
  slb_switch: 'Isai tsoka pasi. Zvino chinjai gumbo.',
  hold_seconds_left: 'Pasara masekondi {n}.',
  hold_paused: 'Simudzai tsoka zvakare kuti tienderere.',

  screen_squat_intro: 'Paradzanisai tsoka kusvika pahupamhi hwemapfudzi. Kotamisai mabvi kashanu, zvakadzika sezvamunogona.',
  screen_sls_intro: 'Mirai negumbo renyu {side_leg}. Kotamisai ibvi zvishoma kashanu.',
  screen_slb_intro: 'Mirai negumbo renyu {side_leg} kwemasekondi {seconds}.',
  screen_jump_intro: 'Svetukai kumusoro katatu. Dzikai pasi zvinyoronyoro, mabvi akakotama.',
  squat_down: 'Kotamisai mabvi.',
  squat_up: 'Simukai zvakare.',
  land_softly: 'Dzikai zvinyoronyoro.',
  jump_of: 'Kusvetuka {n} pa{total}.',
  test_complete: 'Bvunzo yapera.',

  shoulder_external_rotation_intro: 'Isai gokora parutivi rwenyu, rakakotama sekona. Tenderedzai ruoko kunze, mozoridzosa.',
  shoulder_internal_rotation_intro: 'Isai gokora parutivi rwenyu, rakakotama sekona. Tenderedzai ruoko kudumbu, mozoridzosa.',
  pendulum_swing_intro: 'Zendamirai patafura, ruoko rurembere rwakasununguka. Rutenderedzei zvinyoronyoro mudenderedzwa diki.',
  quad_set_intro: 'Tsikirirai shure kweibvi pasi, musimbise chidya. Mirai makadaro, mozozorora.',
  straight_leg_raise_intro: 'Simbisai chidya, musimudze gumbo rakatwasuka, mozoridzikisa zvishoma nezvishoma.',
  heel_slide_intro: 'Kweverai chitsitsinho kwamuri, mozochidzosera kunze.',
  step_up_intro: 'Kwirai padanho negumbo riri kupora, mozodzika zvishoma nezvishoma.',
  guided_count: '{n}.',
  guided_rest: 'Zororai kwechinguva.',
  next_test: 'Bvunzo inotevera: {test}.',

  'cg.cal_no_person': 'Nongedzai kamera kumunhu ari kurovedza muviri.',
  'cg.cal_step_back': 'Dzosai foni shure kusvikira muviri wavo wose waonekwa.',
  'cg.cal_move_closer': 'Swededzai foni pedyo zvishoma.',
  'cg.cal_move_center': 'Kumbirai vamire pakati pechiratidziro.',
  'cg.cal_low_light': 'Vatendeutsirei kuchiedza kuti kamera ivaone.',
  'cg.cal_ready': 'Zvakanaka, vagadzirira.',
  'cg.step_back_into_view': 'Gadzirisai foni kuti muviri wavo wose uonekwe zvakare.',
  'cg.rep_of': 'Yaverengwa. {n} pa{total}.',
  'cg.rep_last': 'Yaverengwa. {n}. Seti yapera.',
  'cg.session_complete': 'Mapedza. Maita zvakanaka mose.',
  'cg.lower_slowly': 'Kumbirai vadzikise zvishoma nezvishoma.',
  'cg.hold': 'Kumbirai vamire vakadaro.',
  'cg.keep_torso_upright': 'Kumbirai vatwasanudze musana.',
  'cg.raise_both_evenly': 'Kumbirai vasimudze maoko ose zvakaenzana.',
  'cg.keep_elbows_straight': 'Kumbirai vatambanudze magokora.',
  'cg.keep_elbow_straight': 'Kumbirai vatambanudze gokora.',
  'cg.dont_arch_back': 'Onai kuti havakombamisi musana.',
  'cg.knees_over_toes': 'Kumbirai vachengete mabvi akatarisa zvigunwe.',
  'cg.knee_over_toes_single': 'Kumbirai vachengete ibvi rakatarisa zvigunwe.',
  'cg.weight_even': 'Kumbirai vagove huremu zvakaenzana.',
  'cg.keep_hips_level': 'Kumbirai vachengete chiuno chakaenzana.',
  'cg.chest_up': 'Kumbirai vasimudze chipfuva.',
  'cg.abd_intro': 'Kumbirai vamire vakatwasuka, maoko ari parutivi, vozosimudza maoko ose kusvika pamapfudzi.',
  'cg.abd_raising': 'Kumbirai vasimudze maoko kurutivi zvishoma nezvishoma.',
  'cg.abd_top': 'Kumbirai vamire vakadaro, maoko ari pamapfudzi.',
  'cg.abd_raise_higher': 'Vabatsirei kusimudza ruoko zvishoma kumusoro.',
  'cg.abd_intro_one': 'Kumbirai vasimudze ruoko rwavo {side_arm} kurutivi kusvika papfudzi.',
  'cg.abd_raising_one': 'Kumbirai vasimudze ruoko rwavo {side_arm} kurutivi zvishoma nezvishoma.',
  'cg.keep_elbows_straight_one': 'Kumbirai vatambanudze gokora.',
  'cg.flex_intro': 'Vatendeutsei rutivi rwavo rwakatarisa kamera. Kumbirai vasimudze ruoko kumberi uye kumusoro.',
  'cg.flex_raising': 'Kumbirai vasimudze ruoko kumberi uye kumusoro.',
  'cg.flex_raise_higher': 'Vabatsirei kusimudza ruoko zvishoma kumusoro.',
  'cg.squat_intro': 'Kumbirai vakotamise mabvi zvishoma, vozosimuka zvakare.',
  'cg.squat_bend': 'Kumbirai vakotamise mabvi zvishoma nezvishoma.',
  'cg.squat_stand': 'Kumbirai vasimuke zvakare.',
  'cg.sts_intro': 'Kumbirai vasimuke zvakakwana pachigaro, vozogara pasi zvishoma nezvishoma.',
  'cg.sts_stand': 'Kumbirai vasimuke.',
  'cg.sts_sit': 'Kumbirai vagare pasi zvishoma nezvishoma.',
  'cg.slb_intro': 'Mirai pedyo kuti muvabatsire. Kumbirai vasimudze tsoka imwe vamire vakadzikama.',
  'cg.slb_lift': 'Kumbirai vasimudze tsoka imwe.',
  'cg.slb_switch': 'Kumbirai vaise tsoka pasi vochinja gumbo.',
  'cg.safety_stop': 'Mirai kana vakanzwa marwadzo akapinza, dzungu kana kufa ganzu.',
};

// isiNdebele. Needs a native speaker's review.
const nd: Record<string, string> = {
  cal_no_person: 'Yimani phambi kwekhamera.',
  cal_step_back: 'Buyelani emuva kuze kubonakale umzimba wenu wonke.',
  cal_move_closer: 'Sondelani kancane.',
  cal_move_center: 'Yimani phakathi.',
  cal_low_light: 'Khangelani ekukhanyeni ukuze ikhamera ilibone kahle.',
  cal_ready: 'Kuhle, selilungile.',
  step_back_into_view: 'Buyelani lapho ikhamera elibona khona.',
  resumed: 'Kuhle, asiqhubeke.',
  safety_stop: 'Yimani nxa lizwa ubuhlungu obubukhali, isiyezi loba ubundikindiki.',

  rep_of: 'Inombolo {n} ku-{total}.',
  rep_last: 'Inombolo {n}. Isethi iphelile.',
  set_complete: 'Isethi {set} ku-{sets} iphelile. Phumulani kancane, beseliqhubeka.',
  session_complete: 'Seliqedile. Lenze kahle.',
  lower_slowly: 'Khathesi ehlisani kancane kancane.',
  hold: 'Hlalani linjalo.',

  keep_torso_upright: 'Gcinani umzimba wenu uqondile.',
  raise_both_evenly: 'Phakamisani izingalo zombili ngokulinganayo.',
  keep_elbows_straight: 'Gcinani izindololwane zenu ziqondile.',
  keep_elbow_straight: 'Gcinani indololwane yenu iqondile.',
  dont_arch_back: 'Lingagobi umhlane wenu.',
  knees_over_toes: 'Gcinani amadolo enu ekhangele amazwane.',
  knee_over_toes_single: 'Gcinani idolo lenu likhangele amazwane.',
  weight_even: 'Abelanisani isisindo senu ngokulinganayo ezinyaweni zombili.',
  keep_heels_down: 'Gcinani izithende zenu phansi.',
  keep_hips_level: 'Gcinani izinqulu zenu zilingana.',
  chest_up: 'Phakamisani isifuba senu.',

  abd_intro: 'Yimani liqonde, izingalo eceleni. Phakamisani izingalo zombili eceleni kuze kufike emahlombe.',
  abd_raising: 'Phakamisani izingalo eceleni kancane kancane.',
  abd_top: 'Hlalani linjalo, izingalo zisemahlombe.',
  abd_raise_higher: 'Zamani ukufika emahlombe.',
  abd_intro_one: 'Yimani liqonde, izingalo eceleni. Phakamisani ingalo yenu {side_arm} eceleni kuze kufike ehlombe.',
  abd_raising_one: 'Phakamisani ingalo yenu {side_arm} eceleni kancane kancane.',
  keep_elbows_straight_one: 'Gcinani indololwane yenu iqondile.',

  flex_intro: 'Yimani ngehlangothi likhangele ikhamera. Phakamisani ingalo phambili laphezulu, umhlane uqondile.',
  flex_raising: 'Phakamisani ingalo phambili laphezulu.',
  flex_raise_higher: 'Zamani ukuphakamisa ingalo kancane phezulu.',

  squat_intro: 'Vulani inyawo zehlukane ngobubanzi bezinqulu. Gobani amadolo kancane, beselisukuma futhi.',
  squat_bend: 'Gobani amadolo kancane kancane.',
  squat_stand: 'Khathesi sukumani.',
  squat_lower: 'Gobani kancane futhi nxa kungalizwisi buhlungu.',

  sts_intro: 'Hlalani liqonde esihlalweni. Sukumani ngokugcweleyo, beselihlala phansi kancane kancane.',
  sts_stand: 'Sukumani.',
  sts_top: 'Yimani liqonde.',
  sts_sit: 'Hlalani phansi kancane kancane.',
  sts_stand_tall: 'Zamani ukusukuma ngokugcweleyo.',

  slb_intro: 'Yimani eduze komduli loba isihlalo. Phakamisani unyawo olulodwa, lizilinganise.',
  slb_lift: 'Phakamisani unyawo olulodwa.',
  slb_holding: 'Hlalani lizilinganisile.',
  slb_done: 'Lenze kahle.',
  slb_switch: 'Behlisani unyawo. Khathesi ntshintshani umlenze.',
  hold_seconds_left: 'Kusele imizuzwana engu-{n}.',
  hold_paused: 'Phakamisani unyawo futhi ukuze siqhubeke.',

  screen_squat_intro: 'Vulani inyawo ngobubanzi bamahlombe. Gobani amadolo kahlanu, phansi ngokukwazi kwenu.',
  screen_sls_intro: 'Yimani ngomlenze wenu {side_leg}. Gobani idolo kancane kahlanu.',
  screen_slb_intro: 'Yimani ngomlenze wenu {side_leg} okwemizuzwana engu-{seconds}.',
  screen_jump_intro: 'Eqani phezulu kathathu. Ehlani phansi kancane, amadolo egobile.',
  squat_down: 'Gobani amadolo.',
  squat_up: 'Sukumani futhi.',
  land_softly: 'Ehlani kancane.',
  jump_of: 'Ukweqa {n} ku-{total}.',
  test_complete: 'Ukuhlolwa kuphelile.',

  shoulder_external_rotation_intro: 'Indololwane eceleni, igobe njengekona. Phendulani ingalo ngaphandle, beseliyibuyisela.',
  shoulder_internal_rotation_intro: 'Indololwane eceleni, igobe njengekona. Phendulani ingalo ngakusisu, beseliyibuyisela.',
  pendulum_swing_intro: 'Encikani etafuleni, ingalo ilenge ikhululekile. Iphendulisani kancane ngemijikelezo emincane.',
  quad_set_intro: 'Cindezelani ingemuva ledolo phansi liqinise ithanga. Bambani, beseliyekela.',
  straight_leg_raise_intro: 'Qinisani ithanga liphakamise umlenze oqondileyo, beselehlisa kancane kancane.',
  heel_slide_intro: 'Hudulani isithende kini, beseliyibuyisela ngaphandle.',
  step_up_intro: 'Khweleni esitebhisini ngomlenze osesilulama, beselisehla kancane kancane.',
  guided_count: '{n}.',
  guided_rest: 'Phumulani okwesikhatshana.',
  next_test: 'Ukuhlolwa okulandelayo: {test}.',

  'cg.cal_no_person': 'Khombisani ikhamera emuntwini ozivocavocayo.',
  'cg.cal_step_back': 'Buyiselani ifoni emuva kuze kubonakale umzimba wabo wonke.',
  'cg.cal_move_closer': 'Sondezani ifoni kancane.',
  'cg.cal_move_center': 'Bacelani bame phakathi kwesikrini.',
  'cg.cal_low_light': 'Baphendulelani ekukhanyeni ukuze ikhamera ibabone.',
  'cg.cal_ready': 'Kuhle, sebelungile.',
  'cg.step_back_into_view': 'Lungisani ifoni ukuze umzimba wabo wonke ubonakale futhi.',
  'cg.rep_of': 'Kubaliwe. {n} ku-{total}.',
  'cg.rep_last': 'Kubaliwe. {n}. Isethi iphelile.',
  'cg.session_complete': 'Seliqedile. Lenze kahle lonke.',
  'cg.lower_slowly': 'Bacelani behlise kancane kancane.',
  'cg.hold': 'Bacelani bahlale benjalo.',
  'cg.keep_torso_upright': 'Bacelani beqondise umhlane.',
  'cg.raise_both_evenly': 'Bacelani baphakamise izingalo zombili ngokulinganayo.',
  'cg.keep_elbows_straight': 'Bacelani beqondise izindololwane.',
  'cg.keep_elbow_straight': 'Bacelani beqondise indololwane.',
  'cg.dont_arch_back': 'Qinisekisani ukuthi abagobi umhlane.',
  'cg.knees_over_toes': 'Bacelani bagcine amadolo ekhangele amazwane.',
  'cg.knee_over_toes_single': 'Bacelani bagcine idolo likhangele amazwane.',
  'cg.weight_even': 'Bacelani babelanise isisindo ngokulinganayo.',
  'cg.keep_hips_level': 'Bacelani bagcine izinqulu zilingana.',
  'cg.chest_up': 'Bacelani baphakamise isifuba.',
  'cg.abd_intro': 'Bacelani bame beqonde, izingalo eceleni, baphakamise izingalo zombili kuze kufike emahlombe.',
  'cg.abd_raising': 'Bacelani baphakamise izingalo eceleni kancane kancane.',
  'cg.abd_top': 'Bacelani bahlale benjalo, izingalo zisemahlombe.',
  'cg.abd_raise_higher': 'Basizeni baphakamise ingalo kancane phezulu.',
  'cg.abd_intro_one': 'Bacelani baphakamise ingalo yabo {side_arm} eceleni kuze kufike ehlombe.',
  'cg.abd_raising_one': 'Bacelani baphakamise ingalo yabo {side_arm} eceleni kancane kancane.',
  'cg.keep_elbows_straight_one': 'Bacelani beqondise indololwane.',
  'cg.flex_intro': 'Baphendulisani ngehlangothi likhangele ikhamera. Bacelani baphakamise ingalo phambili laphezulu.',
  'cg.flex_raising': 'Bacelani baphakamise ingalo phambili laphezulu.',
  'cg.flex_raise_higher': 'Basizeni baphakamise ingalo kancane phezulu.',
  'cg.squat_intro': 'Bacelani bagobe amadolo kancane, besebesukuma futhi.',
  'cg.squat_bend': 'Bacelani bagobe amadolo kancane kancane.',
  'cg.squat_stand': 'Bacelani basukume futhi.',
  'cg.sts_intro': 'Bacelani basukume ngokugcweleyo esihlalweni, besebehlala phansi kancane kancane.',
  'cg.sts_stand': 'Bacelani basukume.',
  'cg.sts_sit': 'Bacelani bahlale phansi kancane kancane.',
  'cg.slb_intro': 'Hlalani eduze ukuze libasekele. Bacelani baphakamise unyawo olulodwa bazilinganise.',
  'cg.slb_lift': 'Bacelani baphakamise unyawo olulodwa.',
  'cg.slb_switch': 'Bacelani behlise unyawo bantshintshe umlenze.',
  'cg.safety_stop': 'Yimani nxa bezwa ubuhlungu obubukhali, isiyezi loba ubundikindiki.',
};

export const PHRASES: Record<Lang, Record<string, string>> = { en, sn, nd };

const pillSn: Record<string, string> = {
  abd_intro: 'Simudzai maoko kusvika pamapfudzi',
  abd_intro_one: 'Simudzai ruoko {side_arm} kusvika papfudzi',
  'cg.abd_intro_one': 'Ruoko {side_arm} kusvika papfudzi',
  flex_intro: 'Simudzai ruoko kumberi uye kumusoro',
  squat_intro: 'Kotamisai mabvi zvishoma, mosimuka',
  sts_intro: 'Simukai, mozogara zvishoma nezvishoma',
  slb_intro: 'Simudzai tsoka imwe mumire',
  screen_squat_intro: 'Kotamisai mabvi kashanu',
  screen_sls_intro: 'Negumbo {side_leg}: kotamisai kashanu',
  screen_slb_intro: 'Mirai negumbo {side_leg}',
  screen_jump_intro: 'Svetukai katatu, dzikai zvinyoronyoro',
  cal_step_back: 'Dzokerai shure, muviri wose uonekwe',
  cal_low_light: 'Tarisai kuchiedza',
  set_complete: 'Seti yapera. Zororai, mozoenderera',
  safety_stop: 'Mirai kana muchinzwa marwadzo akapinza',
  'cg.cal_step_back': 'Dzosai foni: muviri wose uonekwe',
  'cg.abd_intro': 'Maoko kusvika pamapfudzi',
  'cg.flex_intro': 'Ruoko kumberi uye kumusoro',
  'cg.squat_intro': 'Mabvi kotama zvishoma, vosimuka',
  'cg.sts_intro': 'Vasimuke, vogara zvishoma nezvishoma',
  'cg.slb_intro': 'Vasimudze tsoka imwe vamire',
  'cg.abd_raise_higher': 'Vabatsirei kusimudza zvishoma',
  'cg.keep_torso_upright': 'Musana wavo ngaurambe wakatwasuka',
};

const pillNd: Record<string, string> = {
  abd_intro: 'Phakamisani izingalo kuze kufike emahlombe',
  abd_intro_one: 'Phakamisani ingalo {side_arm} kuze kufike ehlombe',
  'cg.abd_intro_one': 'Ingalo {side_arm} kuze kufike ehlombe',
  flex_intro: 'Phakamisani ingalo phambili laphezulu',
  squat_intro: 'Gobani amadolo kancane, lisukume',
  sts_intro: 'Sukumani, lihlale phansi kancane',
  slb_intro: 'Phakamisani unyawo olulodwa',
  screen_squat_intro: 'Gobani amadolo kahlanu',
  screen_sls_intro: 'Ngomlenze {side_leg}: gobani kahlanu',
  screen_slb_intro: 'Yimani ngomlenze {side_leg}',
  screen_jump_intro: 'Eqani kathathu, lehle kancane',
  cal_step_back: 'Buyelani emuva, umzimba wonke ubonakale',
  cal_low_light: 'Khangelani ekukhanyeni',
  set_complete: 'Isethi iphelile. Phumulani, liqhubeke',
  safety_stop: 'Yimani nxa lizwa ubuhlungu obubukhali',
  'cg.cal_step_back': 'Buyiselani ifoni: umzimba wonke ubonakale',
  'cg.abd_intro': 'Izingalo kuze kufike emahlombe',
  'cg.flex_intro': 'Ingalo phambili laphezulu',
  'cg.squat_intro': 'Bagobe amadolo kancane, basukume',
  'cg.sts_intro': 'Basukume, bahlale phansi kancane',
  'cg.slb_intro': 'Baphakamise unyawo olulodwa',
  'cg.abd_raise_higher': 'Basizeni baphakamise kancane',
  'cg.keep_torso_upright': 'Umhlane wabo kawuqonde',
};

export const PILLS: Record<Lang, Record<string, string>> = { en: pillEn, sn: pillSn, nd: pillNd };

/** "left"/"right" as it agrees with arm and leg in each language. */
const SIDES: Record<Lang, Record<'arm' | 'leg', Record<'left' | 'right', string>>> = {
  en: { arm: { left: 'left', right: 'right' }, leg: { left: 'left', right: 'right' } },
  sn: { arm: { left: 'rworuboshwe', right: 'rworudyi' }, leg: { left: 'reruboshwe', right: 'rerudyi' } },
  nd: { arm: { left: 'yesokhohlo', right: 'yesokudla' }, leg: { left: 'wesokhohlo', right: 'wesokudla' } },
};

type Vars = Record<string, string | number>;

function withSides(lang: Lang, vars?: Vars): Vars | undefined {
  const side = vars?.side;
  if (side !== 'left' && side !== 'right') return vars;
  return { ...vars, side_arm: SIDES[lang].arm[side], side_leg: SIDES[lang].leg[side] };
}

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

/**
 * Resolve a phrase key. Order: caregiver variant in the UI language, phrase in the UI language,
 * then the same two in English.
 */
export function phrase(key: string, opts: { lang?: Lang; mode?: CueMode; vars?: Vars } = {}): string {
  const lang = opts.lang ?? 'en';
  const keys = opts.mode === 'caregiver' ? [`cg.${key}`, key] : [key];
  for (const l of [lang, 'en'] as const) {
    for (const k of keys) {
      const template = PHRASES[l][k];
      if (template !== undefined) return fill(template, withSides(l, opts.vars));
    }
  }
  return '';
}

/** True if a phrase key exists (in English, for either mode). */
export function hasPhrase(key: string): boolean {
  return PHRASES.en[key] !== undefined || PHRASES.en[`cg.${key}`] !== undefined;
}

/** Short text for the on-screen pill. Falls back to the spoken phrase. */
export function pillText(key: string, opts: { lang?: Lang; mode?: CueMode; vars?: Vars } = {}): string {
  const lang = opts.lang ?? 'en';
  const keys = opts.mode === 'caregiver' ? [`cg.${key}`, key] : [key];
  for (const k of keys) {
    const template = PILLS[lang][k];
    if (template) return fill(template, withSides(lang, opts.vars));
  }
  return phrase(key, opts).replace(/\.$/, '');
}
