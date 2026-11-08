// Welcome-back message (SPEC §17.5): from the model when the AI coach is on, otherwise a translated
// template for the chosen nudge. Model text is length-checked; anything odd falls back.
import type { Nudge } from './bandit';
import type { CoachLanguage } from './flow';
import type { LapseStatus } from './lapse';
import type { Barrier } from './types';

export const MAX_MESSAGE_CHARS = 300;

export interface MessageRequest {
  language: CoachLanguage;
  nudge: Nudge;
  barrier: Barrier | null;
  days_since: number;
  active_days_28: number;
  total_active_days: number;
}

export interface ComebackMessage {
  /** Model text, when the AI wrote it. */
  text: string | null;
  /** Template key and values, always set so the UI can fall back. */
  key: string;
  params: { days: number; active: number; total: number };
  model: string | null;
}

export function cleanMessage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.replace(/\s+/g, ' ').trim();
  if (!t || t.length > MAX_MESSAGE_CHARS) return null;
  // The prompt forbids guilt and streak talk; a reply that ignores it is not shown.
  if (/\bstreak\b|\bfail(ed|ure)?\b|\blazy\b/i.test(t)) return null;
  return t;
}

export async function comebackMessage(
  req: Omit<MessageRequest, 'days_since' | 'active_days_28' | 'total_active_days'> & { status: LapseStatus },
  send: ((body: MessageRequest) => Promise<{ message: unknown; model: string }>) | null,
): Promise<ComebackMessage> {
  const { status, ...rest } = req;
  const params = { days: status.daysSince ?? 0, active: status.consistency.activeDays28, total: status.consistency.totalActiveDays };
  const base: ComebackMessage = { text: null, key: `comeback.msg.${req.nudge}`, params, model: null };
  if (!send) return base;
  try {
    const res = await send({ ...rest, days_since: params.days, active_days_28: params.active, total_active_days: params.total });
    const text = cleanMessage(res.message);
    return text ? { ...base, text, model: res.model } : base;
  } catch {
    return base;
  }
}
