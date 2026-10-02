// Locally saved sessions/screenings, merged with server data so the user sees their own result
// instantly, even offline (SPEC §9.5).
import { useEffect, useMemo, useState } from 'react';
import { localScreenings, localSessions, onQueueChange } from '../api/offlineQueue';
import type { Screening, SessionRecord } from '../api/types';

export function useLocalSessions(patientId?: string) {
  const [items, setItems] = useState<Array<SessionRecord & { synced: boolean }>>([]);
  useEffect(() => {
    let alive = true;
    const load = () => void localSessions(patientId).then((s) => alive && setItems(s));
    load();
    const off = onQueueChange(load);
    return () => {
      alive = false;
      off();
    };
  }, [patientId]);
  return items;
}

export function useLocalScreenings() {
  const [items, setItems] = useState<Array<Screening & { synced: boolean }>>([]);
  useEffect(() => {
    let alive = true;
    const load = () => void localScreenings().then((s) => alive && setItems(s));
    load();
    const off = onQueueChange(load);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return items;
}

/** Merge by id (server wins), newest first. */
export function useMerged<T extends { id: string }>(server: T[] | undefined, local: T[], dateKey: keyof T): T[] {
  return useMemo(() => {
    const byId = new Map<string, T>();
    for (const l of local) byId.set(l.id, l);
    for (const s of server ?? []) byId.set(s.id, s);
    return [...byId.values()].sort((a, b) => String(b[dateKey]).localeCompare(String(a[dateKey])));
  }, [server, local, dateKey]);
}
