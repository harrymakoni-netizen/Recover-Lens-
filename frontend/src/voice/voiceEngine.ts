// Web Speech wrapper with priorities and cooldowns (SPEC §6.1).
//
// Priority 1 interrupts everything (rep announcements, set/session complete, safety) and is never
// skipped. Priority 2 (form corrections) and 3 (encouragement, phase cues) are skipped while
// anything is speaking, at most one every 2.5 s, and the same cue never twice within 6 s.

export type Priority = 1 | 2 | 3;

export interface UtteranceLike {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  voice: unknown;
}

export interface SpeechLike {
  speaking: boolean;
  pending: boolean;
  speak(u: UtteranceLike): void;
  cancel(): void;
  getVoices?(): Array<{ lang: string; name: string }>;
}

export interface VoiceEngineOptions {
  synth?: SpeechLike | null;
  createUtterance?: (text: string) => UtteranceLike;
  now?: () => number;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
}

export const COOLDOWN_MS = 2500;
export const REPEAT_MS = 6000;
const MUTE_KEY = 'recoverlens.muted';

const LANG_CODES: Record<string, string[]> = {
  en: ['en-GB', 'en-ZA', 'en-US', 'en'],
  sn: ['sn-ZW', 'sn'],
  nd: ['nd-ZW', 'nd', 'nr', 'zu-ZA', 'zu'],
};

export class VoiceEngine {
  muted: boolean;
  lang = 'en';
  /** Text of the most recent cue, spoken or not (the InstructionPill shows it). */
  lastText = '';
  unlocked = false;

  private readonly synth: SpeechLike | null;
  private readonly createUtterance: ((text: string) => UtteranceLike) | null;
  private readonly now: () => number;
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  private lastLowPriorityAt = -Infinity;
  private readonly lastByKey = new Map<string, number>();
  private listeners = new Set<(text: string) => void>();

  constructor(opts: VoiceEngineOptions = {}) {
    const hasWindow = typeof window !== 'undefined';
    this.synth = opts.synth !== undefined ? opts.synth : hasWindow && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.createUtterance =
      opts.createUtterance ??
      (hasWindow && 'SpeechSynthesisUtterance' in window
        ? (text: string) => new SpeechSynthesisUtterance(text) as unknown as UtteranceLike
        : null);
    this.now = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
    this.storage = opts.storage !== undefined ? opts.storage : hasWindow ? safeStorage() : null;
    this.muted = this.storage?.getItem(MUTE_KEY) === '1';
  }

  get supported(): boolean {
    return !!this.synth && !!this.createUtterance;
  }

  /** iOS/Safari only allow speech after a user gesture: call this inside a click handler. */
  unlock(): void {
    if (this.unlocked || !this.synth || !this.createUtterance) return;
    try {
      const u = this.createUtterance('');
      u.rate = 1;
      this.synth.speak(u);
      this.unlocked = true;
    } catch {
      // ignore
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.storage?.setItem(MUTE_KEY, muted ? '1' : '0');
    if (muted) this.synth?.cancel();
  }

  onText(listener: (text: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Speak `text`. `key` identifies the cue for the repeat rule (defaults to the text).
   * `display` is the shorter text for the on-screen pill (defaults to `text`).
   * Returns true if it was spoken (or would have been, when muted).
   */
  speak(text: string, priority: Priority, key: string = text, display: string = text): boolean {
    if (!text) return false;
    const now = this.now();

    if (priority > 1) {
      if (this.synth && (this.synth.speaking || this.synth.pending)) return false;
      if (now - this.lastLowPriorityAt < COOLDOWN_MS) return false;
      const last = this.lastByKey.get(key);
      if (last !== undefined && now - last < REPEAT_MS) return false;
      this.lastLowPriorityAt = now;
    }
    this.lastByKey.set(key, now);
    this.setText(display);

    if (this.muted || !this.synth || !this.createUtterance) return true;
    try {
      if (priority === 1) this.synth.cancel();
      const u = this.createUtterance(text);
      u.lang = this.voiceLang();
      u.rate = 1;
      u.pitch = 1;
      const voice = this.pickVoice();
      if (voice) u.voice = voice;
      this.synth.speak(u);
    } catch {
      // Speech failing must never break the session.
    }
    return true;
  }

  /** Show text in the pill without speaking it. */
  setText(text: string): void {
    this.lastText = text;
    for (const l of this.listeners) l(text);
  }

  cancel(): void {
    this.synth?.cancel();
  }

  private voiceLang(): string {
    const voices = this.synth?.getVoices?.() ?? [];
    for (const code of LANG_CODES[this.lang] ?? []) {
      if (voices.some((v) => v.lang.toLowerCase().startsWith(code.toLowerCase()))) return code;
    }
    return 'en-GB';
  }

  private pickVoice(): unknown {
    const voices = this.synth?.getVoices?.() ?? [];
    const codes = [...(LANG_CODES[this.lang] ?? []), ...LANG_CODES.en];
    for (const code of codes) {
      const v = voices.find((voice) => voice.lang.toLowerCase().startsWith(code.toLowerCase()));
      if (v) return v;
    }
    return null;
  }
}

function safeStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** One shared engine for the app, so the unlock from a click on Home carries into the Mirror. */
export const voice = new VoiceEngine();
