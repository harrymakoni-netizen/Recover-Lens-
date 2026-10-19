import { afterEach, describe, expect, it, vi } from 'vitest';
import { readDisplay, saveDisplay } from '../display';

function stubStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  });
  return data;
}

function stubContrast(more: boolean) {
  vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: more && q.includes('prefers-contrast') }) });
}

describe('display settings (WCAG 2.2 low-vision options)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to normal text, and high contrast only when the system asks for it', () => {
    stubStorage();
    stubContrast(false);
    expect(readDisplay()).toEqual({ textSize: 'normal', highContrast: false });
    stubContrast(true);
    expect(readDisplay()).toEqual({ textSize: 'normal', highContrast: true });
  });

  it('keeps a saved choice, even over the system setting', () => {
    stubStorage();
    stubContrast(true);
    saveDisplay({ textSize: 'xl', highContrast: false });
    expect(readDisplay()).toEqual({ textSize: 'xl', highContrast: false });
  });

  it('ignores damaged or unknown saved values', () => {
    stubStorage({ 'rl.display': '{"textSize":"huge","highContrast":"yes"}' });
    stubContrast(false);
    expect(readDisplay()).toEqual({ textSize: 'normal', highContrast: false });
    stubStorage({ 'rl.display': 'not json' });
    expect(readDisplay()).toEqual({ textSize: 'normal', highContrast: false });
  });
});
