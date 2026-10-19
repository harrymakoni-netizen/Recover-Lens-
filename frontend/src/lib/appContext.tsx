// App-wide preferences: UI language and which patient the patient-facing screens show.
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { type T, type Vars, translate } from '../i18n';
import type { Lang } from '../voice/phrases';
import { voice } from '../voice/voiceEngine';
import { type DisplayPrefs, applyDisplay, readDisplay, saveDisplay } from './display';

export { LANGUAGES } from '../i18n';

export const DEFAULT_PATIENT_ID = 'tariro';

interface AppContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: T;
  patientId: string;
  setPatientId: (id: string) => void;
  display: DisplayPrefs;
  setDisplay: (prefs: DisplayPrefs) => void;
}

const Ctx = createContext<AppContextValue | null>(null);

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const l = stored('rl.lang');
    return l === 'sn' || l === 'nd' ? l : 'en';
  });
  const [patientId, setPatientIdState] = useState(() => stored('rl.patient') ?? DEFAULT_PATIENT_ID);
  const [display, setDisplayState] = useState<DisplayPrefs>(() => {
    const prefs = readDisplay();
    applyDisplay(prefs); // before the first paint, so text never jumps in size
    return prefs;
  });

  voice.lang = lang;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    store('rl.lang', l);
    setLangState(l);
  }, []);

  const setPatientId = useCallback((id: string) => {
    store('rl.patient', id);
    setPatientIdState(id);
  }, []);

  const setDisplay = useCallback((prefs: DisplayPrefs) => {
    saveDisplay(prefs);
    applyDisplay(prefs);
    setDisplayState(prefs);
  }, []);

  const t = useCallback((key: string, vars?: Vars) => translate(lang, key, vars), [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t, patientId, setPatientId, display, setDisplay }),
    [lang, setLang, t, patientId, setPatientId, display, setDisplay],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
