// Habit planner state for one patient (SPEC §17.10). Logs and settings stay on this device; only the
// habits the person switched to "share" are sent to their physiotherapist, and always as the full set,
// so switching sharing off or deleting the data removes it from the server too.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import {
  DEFAULT_PREFS,
  type HabitDay,
  type HabitId,
  type HabitPrefs,
  dayKey,
  parsePrefs,
  setValue as setDayValue,
  sharedDays,
} from '../coach';

const prefsKey = (id: string) => `rl.habits.${id}.prefs`;
const logsKey = (id: string) => `rl.habits.${id}.logs`;

function load<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // storage blocked: the planner still works for this visit
  }
}

export type ShareState = 'idle' | 'saving' | 'saved' | 'offline';

export function useHabits(patientId: string | null) {
  const id = patientId ?? 'anon';
  const [prefs, setPrefs] = useState<HabitPrefs>(() => parsePrefs(load(prefsKey(id), DEFAULT_PREFS)));
  const [logs, setLogs] = useState<HabitDay[]>(() => load<HabitDay[]>(logsKey(id), []));
  const [share, setShare] = useState<ShareState>('idle');
  const today = dayKey(new Date());

  useEffect(() => {
    setPrefs(parsePrefs(load(prefsKey(id), DEFAULT_PREFS)));
    setLogs(load<HabitDay[]>(logsKey(id), []));
  }, [id]);

  // Send the shared set (or nothing) after changes settle. Skipped when nothing was ever shared.
  const sharedOnce = useRef(false);
  useEffect(() => {
    if (!patientId) return;
    const anyShared = prefs.enabled.some((h) => prefs.share[h]);
    if (!anyShared && !sharedOnce.current) return;
    sharedOnce.current = sharedOnce.current || anyShared;
    const days = sharedDays(logs, prefs, today);
    const timer = setTimeout(() => {
      setShare('saving');
      api(`/habits/${encodeURIComponent(patientId)}`, { method: 'PUT', body: JSON.stringify({ days }) }).then(
        () => setShare('saved'),
        () => setShare('offline'),
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [patientId, prefs, logs, today]);

  const updatePrefs = useCallback(
    (next: HabitPrefs) => {
      setPrefs(next);
      save(prefsKey(id), next);
    },
    [id],
  );

  const setValue = useCallback(
    (habit: HabitId, value: number | undefined, day = dayKey(new Date())) => {
      setLogs((cur) => {
        const next = setDayValue(cur, day, habit, value);
        save(logsKey(id), next);
        return next;
      });
    },
    [id],
  );

  const deleteAll = useCallback(async () => {
    try {
      localStorage.removeItem(prefsKey(id));
      localStorage.removeItem(logsKey(id));
    } catch {
      // nothing stored
    }
    setPrefs(DEFAULT_PREFS);
    setLogs([]);
    if (patientId) {
      sharedOnce.current = false;
      await api(`/habits/${encodeURIComponent(patientId)}`, { method: 'DELETE' }).catch(() => undefined);
    }
  }, [id, patientId]);

  return { prefs, logs, today, share, updatePrefs, setValue, deleteAll };
}
