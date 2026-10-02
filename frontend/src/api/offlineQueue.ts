// Offline-first saving (SPEC §9.5): every finished session/screening is written to IndexedDB
// first, then POSTed. Failed items are retried on the `online` event and every 30 s.
import { createStore, get, set } from 'idb-keyval';
import { ApiError, post } from './client';
import { setSyncState } from './syncStatus';
import type { Screening, SessionRecord } from './types';

export type QueueKind = 'session' | 'screening';

export interface QueueItem<T = unknown> {
  id: string;
  kind: QueueKind;
  payload: T;
  createdAt: string;
  synced: boolean;
  /** The server rejected the item (4xx); it will not be retried. */
  failed?: string;
}

const store = typeof indexedDB !== 'undefined' ? createStore('recoverlens', 'queue') : null;
const KEY = 'items';
const KEEP_SYNCED = 200;
const listeners = new Set<() => void>();

// IndexedDB can be unavailable (private mode); fall back to memory so the session still works.
let memory: QueueItem[] = [];

async function load(): Promise<QueueItem[]> {
  if (!store) return memory;
  try {
    return ((await get(KEY, store)) as QueueItem[] | undefined) ?? [];
  } catch {
    return memory;
  }
}

async function save(items: QueueItem[]): Promise<void> {
  const synced = items.filter((i) => i.synced);
  const trimmed = [...items.filter((i) => !i.synced), ...synced.slice(-KEEP_SYNCED)];
  memory = trimmed;
  if (store) {
    try {
      await set(KEY, trimmed, store);
    } catch {
      // keep in memory
    }
  }
  setSyncState({ pending: trimmed.filter((i) => !i.synced && !i.failed).length });
  listeners.forEach((l) => l());
}

/** Notified whenever the local queue changes (so screens can merge local data instantly). */
export function onQueueChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function enqueue<T>(kind: QueueKind, id: string, payload: T): Promise<void> {
  const items = await load();
  const existing = items.findIndex((i) => i.id === id);
  const item: QueueItem = { id, kind, payload, createdAt: new Date().toISOString(), synced: false };
  if (existing >= 0) items[existing] = item;
  else items.push(item);
  await save(items);
  void syncNow();
}

let syncing: Promise<void> | null = null;

export function syncNow(): Promise<void> {
  syncing ??= (async () => {
    try {
      const items = await load();
      let changed = false;
      for (const item of items) {
        if (item.synced || item.failed) continue;
        try {
          await post(item.kind === 'session' ? '/sessions' : '/screenings', item.payload);
          item.synced = true;
          changed = true;
        } catch (err) {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
            item.failed = err.message;
            changed = true;
            continue;
          }
          break; // offline: stop and retry later
        }
      }
      if (changed) await save(items);
      else setSyncState({ pending: items.filter((i) => !i.synced && !i.failed).length });
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

let started = false;

export function startSyncLoop(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('online', () => void syncNow());
  setInterval(() => void syncNow(), 30_000);
  void syncNow();
}

export async function localSessions(patientId?: string): Promise<Array<SessionRecord & { synced: boolean }>> {
  const items = await load();
  return items
    .filter((i) => i.kind === 'session')
    .map((i) => ({ ...(i.payload as SessionRecord), synced: i.synced }))
    .filter((s) => !patientId || s.patient_id === patientId);
}

export async function localScreenings(): Promise<Array<Screening & { synced: boolean }>> {
  const items = await load();
  return items
    .filter((i) => i.kind === 'screening')
    .map((i) => ({ ...(i.payload as Screening), synced: i.synced }));
}
