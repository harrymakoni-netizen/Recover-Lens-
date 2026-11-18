// Recent check-in answers, kept on this device only, for the early warning's low-energy signal
// (SPEC §17.9). Only the date and the energy tap are kept; never the free text.
import type { DriftCheckIn, Energy } from '../coach';

const key = (patientId: string | null) => `rl.coach.history.${patientId ?? 'anon'}`;

export function readCheckIns(patientId: string | null): DriftCheckIn[] {
  try {
    const v = JSON.parse(localStorage.getItem(key(patientId)) ?? '[]') as DriftCheckIn[];
    return Array.isArray(v) ? v.filter((c) => typeof c?.at === 'string') : [];
  } catch {
    return [];
  }
}

export function recordCheckIn(patientId: string | null, energy: Energy | null, now = new Date()): void {
  try {
    const list = [...readCheckIns(patientId), { at: now.toISOString(), energy }].slice(-14);
    localStorage.setItem(key(patientId), JSON.stringify(list));
  } catch {
    // best-effort, per device
  }
}
