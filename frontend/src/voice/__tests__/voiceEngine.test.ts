import { describe, expect, it } from 'vitest';
import { phrase } from '../phrases';
import { COOLDOWN_MS, REPEAT_MS, type SpeechLike, type UtteranceLike, VoiceEngine } from '../voiceEngine';

class MockSynth implements SpeechLike {
  speaking = false;
  pending = false;
  spoken: string[] = [];
  cancels = 0;
  speak(u: UtteranceLike) {
    this.spoken.push(u.text);
    if (u.text) this.speaking = true;
  }
  cancel() {
    this.cancels += 1;
    this.speaking = false;
  }
  finish() {
    this.speaking = false;
  }
}

function setup() {
  const synth = new MockSynth();
  let t = 0;
  const engine = new VoiceEngine({
    synth,
    createUtterance: (text) => ({ text, lang: '', rate: 1, pitch: 1, voice: null }),
    now: () => t,
    storage: null,
  });
  return { synth, engine, advance: (ms: number) => (t += ms) };
}

describe('VoiceEngine (SPEC §6.1 / §12.5)', () => {
  it('a rep announcement interrupts a correction', () => {
    const { synth, engine } = setup();
    expect(engine.speak('Keep your torso upright.', 2)).toBe(true);
    expect(synth.speaking).toBe(true);
    expect(engine.speak('Rep 3 of 10.', 1)).toBe(true);
    expect(synth.cancels).toBe(1);
    expect(synth.spoken).toEqual(['Keep your torso upright.', 'Rep 3 of 10.']);
  });

  it('never repeats the same cue within 6 s', () => {
    const { synth, engine, advance } = setup();
    engine.speak('Keep your torso upright.', 2);
    synth.finish();
    advance(COOLDOWN_MS + 100);
    expect(engine.speak('Keep your torso upright.', 2)).toBe(false);
    advance(REPEAT_MS - COOLDOWN_MS);
    expect(engine.speak('Keep your torso upright.', 2)).toBe(true);
    expect(synth.spoken.filter((t) => t === 'Keep your torso upright.')).toHaveLength(2);
  });

  it('allows at most one low-priority cue every 2.5 s', () => {
    const { synth, engine, advance } = setup();
    engine.speak('Keep your torso upright.', 2);
    synth.finish();
    advance(1000);
    expect(engine.speak('Raise both arms evenly.', 2)).toBe(false);
    advance(COOLDOWN_MS);
    expect(engine.speak('Raise both arms evenly.', 2)).toBe(true);
  });

  it('skips low-priority cues while anything is speaking', () => {
    const { synth, engine, advance } = setup();
    engine.speak('Rep 1 of 10.', 1);
    advance(5000);
    expect(synth.speaking).toBe(true);
    expect(engine.speak('Hold.', 3)).toBe(false);
  });

  it('never skips rep announcements, even back to back', () => {
    const { synth, engine } = setup();
    for (let n = 1; n <= 10; n++) expect(engine.speak(`Rep ${n} of 10.`, 1, 'rep')).toBe(true);
    expect(synth.spoken).toHaveLength(10);
  });

  it('when muted it records the text but does not speak', () => {
    const { synth, engine } = setup();
    engine.setMuted(true);
    expect(engine.speak('Rep 1 of 10.', 1)).toBe(true);
    expect(synth.spoken).toEqual([]);
    expect(engine.lastText).toBe('Rep 1 of 10.');
  });

  it('remembers the mute choice', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    new VoiceEngine({ synth: null, storage }).setMuted(true);
    expect(new VoiceEngine({ synth: null, storage }).muted).toBe(true);
  });

  it('unlock speaks an empty utterance once', () => {
    const { synth, engine } = setup();
    engine.unlock();
    engine.unlock();
    expect(synth.spoken).toEqual(['']);
    expect(synth.speaking).toBe(false);
  });
});

describe('phrases (SPEC §6.2)', () => {
  it('fills templates', () => {
    expect(phrase('rep_of', { vars: { n: 3, total: 10 } })).toBe('Rep 3 of 10.');
  });

  it('uses caregiver variants in caregiver mode', () => {
    expect(phrase('keep_torso_upright', { mode: 'caregiver' })).toBe('Ask them to keep their back straight.');
    expect(phrase('rep_of', { mode: 'caregiver', vars: { n: 3, total: 10 } })).toBe("That's a rep. 3 of 10.");
  });

  it('falls back to English for missing keys', () => {
    expect(phrase('rep_of', { lang: 'sn', vars: { n: 1, total: 5 } })).toBe('Nhamba 1 pa5.');
    expect(phrase('dont_arch_back', { lang: 'nd' })).toBe("Don't arch your back.");
  });
});
