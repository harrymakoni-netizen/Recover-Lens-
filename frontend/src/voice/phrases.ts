// Spoken phrase tables (SPEC §6.2). Keys referenced by ExerciseConfig.cues.
//
// Caregiver mode (SPEC §8.3) uses a `cg.` variant when one exists, addressed to the helper.
// Shona (sn) and Ndebele (nd) are a proof of concept covering the intro, rep announcement and the
// most common fault cues. They need checking by a native speaker. Missing keys fall back to English.

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

// Shona — proof of concept, needs native-speaker review.
const sn: Record<string, string> = {
  abd_intro: 'Mira wakatwasuka, maoko ari parutivi. Simudza maoko ese kurutivi kusvika pamapfudzi.',
  squat_intro: 'Tsoka dzakaparadzana. Kotamisa mabvi zvishoma, wozosimuka zvakare.',
  rep_of: 'Nhamba {n} pa{total}.',
  rep_last: 'Nhamba {n}. Seti yapera.',
  keep_torso_upright: 'Chengeta muviri wako wakatwasuka.',
  raise_both_evenly: 'Simudza maoko ese zvakaenzana.',
  keep_elbows_straight: 'Tambanudza magokora ako.',
  knees_over_toes: 'Ita kuti mabvi ako ave pamusoro pezvigunwe.',
  abd_raise_higher: 'Edza kusvika pamapfudzi.',
  session_complete: 'Wapedza. Waita zvakanaka.',
  cal_step_back: 'Dzokera shure kusvikira muviri wese waonekwa.',
};

// Ndebele — proof of concept, needs native-speaker review.
const nd: Record<string, string> = {
  abd_intro: 'Ma uqonde, izingalo eceleni. Phakamisa izingalo zombili eceleni kuze kufike emahlombe.',
  squat_intro: 'Inyawo zehlukene. Goba amadolo kancane, ubusuphakama futhi.',
  rep_of: 'Inombolo {n} ku-{total}.',
  rep_last: 'Inombolo {n}. Isethi iphelile.',
  keep_torso_upright: 'Gcina umzimba wakho uqondile.',
  raise_both_evenly: 'Phakamisa izingalo zombili ngokulinganayo.',
  keep_elbows_straight: 'Gcina izingalo zakho ziqondile.',
  knees_over_toes: 'Gcina amadolo akho phezu kwamazwane.',
  abd_raise_higher: 'Zama ukufika emahlombe.',
  session_complete: 'Usuqedile. Wenze kahle.',
  cal_step_back: 'Buyela emuva kuze kubonakale umzimba wonke.',
};

export const PHRASES: Record<Lang, Record<string, string>> = { en, sn, nd };

function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

/**
 * Resolve a phrase key. Order: caregiver variant in the UI language, phrase in the UI language,
 * then the same two in English.
 */
export function phrase(
  key: string,
  opts: { lang?: Lang; mode?: CueMode; vars?: Record<string, string | number> } = {},
): string {
  const lang = opts.lang ?? 'en';
  const keys = opts.mode === 'caregiver' ? [`cg.${key}`, key] : [key];
  for (const table of [PHRASES[lang], PHRASES.en]) {
    for (const k of keys) {
      if (table[k] !== undefined) return fill(table[k], opts.vars);
    }
  }
  return '';
}

/** Short text for the on-screen pill. Falls back to the spoken phrase. */
export function pillText(
  key: string,
  opts: { lang?: Lang; mode?: CueMode; vars?: Record<string, string | number> } = {},
): string {
  const lang = opts.lang ?? 'en';
  if (lang === 'en') {
    const keys = opts.mode === 'caregiver' ? [`cg.${key}`, key] : [key];
    for (const k of keys) if (pillEn[k]) return fill(pillEn[k], opts.vars);
  }
  return phrase(key, opts).replace(/\.$/, '');
}
