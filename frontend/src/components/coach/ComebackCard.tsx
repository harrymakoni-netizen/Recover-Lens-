// Welcome back after missed days (SPEC §17.5). Progress is kept, never reset. The barrier the person
// names presets today's check-in (which still asks the safety questions). "Not now" closes it.
import { BellRing, HeartHandshake, MessageCircle, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { sendComebackMessage } from '../../api/coach';
import {
  ADAPTATIONS,
  BARRIERS,
  type Barrier,
  type ComebackMessage,
  type LapseStatus,
  type Nudge,
  chooseNudge,
  comebackMessage,
  parseBandit,
  resolvePending,
  showNudge,
} from '../../coach';
import { useApp } from '../../lib/appContext';
import { cn } from '../../lib/format';
import { Card } from '../ui';

const TIMES = ['morning', 'afternoon', 'evening'] as const;
type ReminderTime = (typeof TIMES)[number];

function load<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort, per device
  }
}

export function ComebackCard({
  status,
  sessionTimes,
  useAi,
  onBarrier,
  onDismiss,
}: {
  status: LapseStatus;
  sessionTimes: string[];
  useAi: boolean;
  onBarrier: (b: Barrier) => void;
  onDismiss: () => void;
}) {
  const { t, lang, patientId } = useApp();
  const ids = { title: useId(), barrier: useId() };
  const banditKey = `rl.coach.bandit.${patientId}`;
  const reminderKey = `rl.coach.reminder.${patientId}`;
  const [message, setMessage] = useState<ComebackMessage | null>(null);
  const [barrier, setBarrier] = useState<Barrier | null>(null);
  const [time, setTime] = useState<ReminderTime | null>(() => load<ReminderTime>(reminderKey));

  // Settle the last nudge against the sessions since, then pick today's: once per visit.
  const nudge = useMemo<Nudge>(() => {
    let state = resolvePending(parseBandit(load(banditKey)), sessionTimes);
    const pick = state.pending?.nudge ?? chooseNudge(state);
    if (!state.pending) state = showNudge(state, pick);
    save(banditKey, state);
    return pick;
  }, [banditKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    comebackMessage({ language: lang, nudge, barrier: null, status }, useAi ? sendComebackMessage(patientId ?? undefined) : null).then((m) => alive && setMessage(m));
    return () => {
      alive = false;
    };
  }, [lang, nudge, useAi]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickBarrier = (b: Barrier) => {
    setBarrier(b);
    onBarrier(b);
  };
  const pickTime = (tm: ReminderTime) => {
    setTime(tm);
    save(reminderKey, tm);
  };

  const c = status.consistency;
  const max = Math.max(1, ...c.weeks);
  const text = message?.text ?? (message ? t(message.key, message.params) : '');
  const whatsapp = time
    ? `https://wa.me/?text=${encodeURIComponent(t('comeback.whatsapp_text', { time: t(`comeback.time.${time}`), url: window.location.origin }))}`
    : null;

  return (
    <Card className="border-l-4 border-l-mint">
      <section aria-labelledby={ids.title}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal">
              <HeartHandshake size={18} aria-hidden />
            </span>
            <h2 id={ids.title} className="text-lg font-semibold text-navy">
              {t('comeback.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-sm text-navy-soft hover:bg-navy/5"
          >
            <X size={16} aria-hidden /> {t('comeback.not_now')}
          </button>
        </div>

        <p className="mt-3 min-h-6 text-navy" aria-live="polite">
          {text}
        </p>
        {message?.model && <p className="mt-1 text-xs text-navy-soft">{t('comeback.ai_note', { model: message.model })}</p>}

        <div className="mt-4 rounded-xl bg-navy/5 p-3">
          <p className="text-sm text-navy-soft">{t('comeback.kept', { active: c.activeDays28, total: c.totalActiveDays })}</p>
          <div className="mt-2 flex h-10 items-end gap-1.5" role="img" aria-label={t('comeback.weeks_label', { weeks: c.weeks.join(', ') })}>
            {c.weeks.map((n, i) => (
              <div key={i} className="flex-1 rounded-t bg-teal/70" style={{ height: `${Math.max(8, (n / max) * 100)}%`, opacity: n ? 1 : 0.25 }} />
            ))}
          </div>
        </div>

        <fieldset className="mt-4">
          <legend id={ids.barrier} className="mb-2 text-sm font-medium text-navy-soft">
            {t('comeback.barrier_q')}
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BARRIERS.map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={barrier === b}
                onClick={() => pickBarrier(b)}
                className={cn(
                  'min-h-11 rounded-xl border px-3 text-sm font-medium',
                  barrier === b ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line bg-white',
                )}
              >
                {t(`comeback.barrier.${b}`)}
              </button>
            ))}
          </div>
        </fieldset>

        {barrier && (
          <p className="mt-3 rounded-xl bg-teal-soft/60 p-3 text-sm text-navy">{t('comeback.adapted', { n: ADAPTATIONS[barrier].minutes })}</p>
        )}

        {barrier && ADAPTATIONS[barrier].reminder && (
          <fieldset className="mt-4">
            <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-navy-soft">
              <BellRing size={16} aria-hidden /> {t('comeback.reminder_q')}
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {TIMES.map((tm) => (
                <button
                  key={tm}
                  type="button"
                  aria-pressed={time === tm}
                  onClick={() => pickTime(tm)}
                  className={cn(
                    'min-h-11 rounded-xl border px-2 text-sm font-medium',
                    time === tm ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line bg-white',
                  )}
                >
                  {t(`comeback.time.${tm}`)}
                </button>
              ))}
            </div>
            {time && whatsapp && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-sm text-navy-soft">{t('comeback.reminder_set', { time: t(`comeback.time.${time}`) })}</span>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-white px-3 text-sm font-medium text-navy hover:bg-teal-soft"
                >
                  <MessageCircle size={16} aria-hidden /> {t('comeback.whatsapp')}
                </a>
              </div>
            )}
          </fieldset>
        )}
      </section>
    </Card>
  );
}
