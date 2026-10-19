// Display settings for people with low vision (WCAG 2.2): larger text and high contrast.
// Stored per device; with nothing saved, high contrast follows the system "increase contrast" setting.

export type TextSize = 'normal' | 'large' | 'xl';

export interface DisplayPrefs {
  textSize: TextSize;
  highContrast: boolean;
}

const KEY = 'rl.display';
const SIZES: TextSize[] = ['normal', 'large', 'xl'];

function systemPrefersContrast(): boolean {
  try {
    return window.matchMedia('(prefers-contrast: more)').matches;
  } catch {
    return false;
  }
}

export function readDisplay(): DisplayPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<DisplayPrefs> | null;
    if (saved) {
      return {
        textSize: SIZES.includes(saved.textSize as TextSize) ? (saved.textSize as TextSize) : 'normal',
        highContrast: saved.highContrast === true,
      };
    }
  } catch {
    // fall through to defaults
  }
  return { textSize: 'normal', highContrast: systemPrefersContrast() };
}

export function saveDisplay(prefs: DisplayPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // private mode: the setting still applies until the page closes
  }
}

/** Sets the classes index.css uses on <html>. */
export function applyDisplay(prefs: DisplayPrefs): void {
  const html = document.documentElement;
  html.classList.toggle('text-large', prefs.textSize === 'large');
  html.classList.toggle('text-xl', prefs.textSize === 'xl');
  html.classList.toggle('high-contrast', prefs.highContrast);
}
