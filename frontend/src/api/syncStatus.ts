// Global connection state for the header dot (SPEC §8.7).
import { useSyncExternalStore } from 'react';

export interface SyncState {
  /** Last API request succeeded. */
  online: boolean;
  /** Sessions/screenings saved locally but not yet on the server. */
  pending: number;
}

let state: SyncState = { online: true, pending: 0 };
const listeners = new Set<() => void>();

export function setSyncState(patch: Partial<SyncState>): void {
  const next = { ...state, ...patch };
  if (next.online === state.online && next.pending === state.pending) return;
  state = next;
  listeners.forEach((l) => l());
}

export function getSyncState(): SyncState {
  return state;
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
