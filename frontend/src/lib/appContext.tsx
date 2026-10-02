// App-wide preferences: UI language and which patient the patient-facing screens show.
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import en from '../i18n/en.json';
import nd from '../i18n/nd.json';
import sn from '../i18n/sn.json';
import type { Lang } from '../voice/phrases';
import { voice } from '../voice/voiceEngine';

const TABLES: Record<Lang, Record<string, string>> = { en, sn, nd };
export const LANGUAGES: Array<{ code: Lang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'sn', label: 'chiShona' },
  { code: 'nd', label: 'isiNdebele' },
];

export const DEFAULT_PATIENT_ID = 'tariro';

interface AppContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  patientId: string;
  setPatientId: (id: string) => void;
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

  voice.lang = lang;

  const setLang = useCallback((l: Lang) => {
    store('rl.lang', l);
    setLangState(l);
  }, []);

  const setPatientId = useCallback((id: string) => {
    store('rl.patient', id);
    setPatientIdState(id);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const template = TABLES[lang][key] ?? TABLES.en[key] ?? key;
      return vars ? template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : template;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t, patientId, setPatientId }), [lang, setLang, t, patientId, setPatientId]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
