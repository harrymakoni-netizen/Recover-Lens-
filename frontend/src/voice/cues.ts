// Maps SessionEngine events to spoken cues (SPEC §6). Pure, so it can be tested.
import type { ExerciseConfig } from '../exercises/types';
import type { EngineEvent } from '../pose/sessionEngine';
import { type CueMode, type Lang, phrase, pillText } from './phrases';
import type { Priority } from './voiceEngine';

export interface Cue {
  text: string;
  pill: string;
  priority: Priority;
  key: string;
}

export interface CueContext {
  config: ExerciseConfig;
  mode: CueMode;
  lang: Lang;
  targetReps: number;
  sets: number;
  side?: 'left' | 'right';
  holdSeconds?: number;
}

const CALIBRATION_KEYS: Record<string, string> = {
  no_person: 'cal_no_person',
  step_back: 'cal_step_back',
  move_closer: 'cal_move_closer',
  move_center: 'cal_move_center',
  low_light: 'cal_low_light',
};

/** Cues for one frame's events. Priority-1 cues in the same frame are merged into one utterance. */
export function cuesForEvents(events: EngineEvent[], ctx: CueContext): Cue[] {
  const { config, mode, lang } = ctx;
  const vars = { side: ctx.side ?? 'left', seconds: ctx.holdSeconds ?? config.holdSeconds ?? 30 };
  const make = (key: string, priority: Priority, extra: Record<string, string | number> = {}): Cue | null => {
    const v = { ...vars, ...extra };
    const text = phrase(key, { lang, mode, vars: v });
    if (!text) return null;
    return { text, pill: pillText(key, { lang, mode, vars: v }), priority, key };
  };

  const out: Cue[] = [];
  const add = (c: Cue | null) => c && out.push(c);
  const sessionDone = events.some((e) => e.type === 'sessionComplete');

  for (const e of events) {
    switch (e.type) {
      case 'calibration':
        add(make(CALIBRATION_KEYS[e.issue], 2));
        break;
      case 'ready':
        add(make('cal_ready', 1));
        break;
      case 'countdown':
        out.push({ text: String(e.n), pill: String(e.n), priority: 1, key: `count${e.n}` });
        break;
      case 'start':
        add(make(config.cues.intro, 1));
        break;
      case 'phase': {
        const key = e.state === 'RAISING' ? config.cues.onRaising : e.state === 'AT_TOP' ? config.cues.onTop : config.cues.onLowering;
        add(make(key, 3));
        break;
      }
      case 'fault': {
        const key = config.cues.faults[e.id];
        if (key) add(make(key, 2));
        break;
      }
      case 'turnedBackEarly': {
        const key = config.cues.faults.not_high_enough;
        if (key) add(make(key, 2));
        break;
      }
      case 'rep': {
        const isLast = e.repNumber >= ctx.targetReps;
        const key = isLast && config.cues.onRep === 'rep_of' && !config.screeningOnly ? 'rep_last' : config.cues.onRep;
        add(make(key, 1, { n: e.repNumber, total: ctx.targetReps }));
        break;
      }
      case 'setComplete':
        if (!sessionDone) {
          // Rep exercises already said "Set complete" in the rep announcement.
          const key = config.kind === 'hold' ? config.cues.onSetComplete : 'set_complete';
          if (config.kind === 'hold' || e.set < e.sets) add(make(key, 1, { set: e.set, sets: e.sets }));
        }
        break;
      case 'sessionComplete':
        add(make(config.cues.onSessionComplete, 1));
        break;
      case 'paused':
        add(make('step_back_into_view', 1));
        break;
      case 'resumed':
        add(make('resumed', 3));
        break;
      case 'holdStart':
        add(make(config.cues.onTop, 3));
        break;
      case 'holdBroken':
        add(make('hold_paused', 2));
        break;
      case 'holdRemaining':
        add(make('hold_seconds_left', 1, { n: e.seconds }));
        break;
      case 'feetDown':
        add(make(config.cues.onRaising, 3));
        break;
    }
  }

  // Merge priority-1 cues so one does not cancel the other.
  const p1 = out.filter((c) => c.priority === 1);
  const rest = out.filter((c) => c.priority !== 1);
  if (p1.length <= 1) return out;
  return [
    {
      text: p1.map((c) => c.text).join(' '),
      pill: p1[p1.length - 1].pill,
      priority: 1,
      key: p1.map((c) => c.key).join('+'),
    },
    ...rest,
  ];
}
