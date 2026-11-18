// Early warning on Home (SPEC §17.9). Shown before any lapse when the person's own recent sessions,
// check-ins or habits suggest strain or drop-off. It suggests a lighter session and says exactly why;
// the person can start it, keep their usual programme, or close the card. Nothing is ever blocked.
import { ChevronDown, Gauge, Play, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type DriftReason, type DriftStatus, type LibraryEntry, type PlanItem, lighterPlan } from '../../coach';
import { exerciseName } from '../../i18n';
import { useApp } from '../../lib/appContext';
import { cn } from '../../lib/format';
import { voice } from '../../voice/voiceEngine';
import { Badge, Button, Card } from '../ui';

export function reasonText(t: ReturnType<typeof useApp>['t'], r: DriftReason): string {
  return t(`drift.reason.${r.signal}`, {
    recent: r.recent,
    usual: r.usual,
    n: r.n,
    exercise: r.exerciseId ? exerciseName(t, r.exerciseId) : '',
  });
}

export function HeadsUpCard({
  status,
  library,
  onUsual,
  onDismiss,
}: {
  status: DriftStatus;
  library: LibraryEntry[];
  onUsual: () => void;
  onDismiss: () => void;
}) {
  const { t, patientId } = useApp();
  const navigate = useNavigate();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const result = useMemo(() => lighterPlan(library, status), [library, status]);
  const act = status.level === 'act';
  const name = (id: string | null) => (id ? exerciseName(t, id) : '');

  const start = (it: PlanItem) => {
    voice.unlock(); // this tap is the gesture iOS needs before speech (SPEC §6.1)
    navigate(`/mirror/${it.exerciseId}?sets=${it.sets}&reps=${it.reps}`, { state: { patientId } });
  };

  return (
    <Card className="border-l-4 border-l-amber-400">
      <section aria-labelledby={titleId}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Gauge size={18} aria-hidden />
            </span>
            <h2 id={titleId} className="text-lg font-semibold text-navy">
              {act ? t('drift.title_act') : t('drift.title_watch')}
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

        <p className="mt-3 text-navy">{act ? t('drift.body_act') : t('drift.body_watch')}</p>
        <ul className="mt-3 space-y-1.5">
          {status.reasons.map((r) => (
            <li key={r.signal} className="flex gap-2 text-sm text-navy">
              <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <span>{reasonText(t, r)}</span>
            </li>
          ))}
        </ul>

        {result.plan.items.length > 0 && (
          <>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-navy">{t('drift.plan_title')}</h3>
              <Badge tone="teal">{result.minutes <= 1 ? t('checkin.plan_minute') : t('checkin.plan_minutes', { n: result.minutes })}</Badge>
            </div>
            <ul className="mt-2 space-y-2">
              {result.plan.items.map((it) => (
                <li key={it.exerciseId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <div className="min-w-0">
                    <div className="font-medium">{name(it.exerciseId)}</div>
                    <div className="text-sm text-navy-soft">
                      {it.holdSeconds
                        ? it.sets === 1
                          ? t('plan.one_set_hold', { seconds: it.holdSeconds })
                          : t('plan.sets_hold', { sets: it.sets, seconds: it.holdSeconds })
                        : it.sets === 1
                          ? t('plan.one_set_reps', { reps: it.reps })
                          : t('plan.sets_reps', { sets: it.sets, reps: it.reps })}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => start(it)}>
                    <Play size={16} className="fill-current" /> {t('checkin.start')}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-4 rounded-xl border border-line">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm font-medium text-navy"
          >
            {t('checkin.why_title')}
            <ChevronDown size={18} aria-hidden className={cn('transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <div className="space-y-3 border-t border-line p-3 text-sm text-navy-soft">
              <p>{t('drift.why_source')}</p>
              <p>
                <span className="font-medium text-navy">{t('checkin.technique_label')}:</span> {t(`checkin.technique.${result.plan.technique}`)}
              </p>
              <p>{act ? t('drift.why_act') : t('drift.why_watch')}</p>
              {result.changes.length > 0 && (
                <div>
                  <div className="font-medium text-navy">{t('checkin.changes_title')}</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {result.changes.map((c, i) => (
                      <li key={i}>{t(`checkin.change.${c.reason}`, { exercise: name(c.exerciseId), from: c.from ?? '', to: c.to ?? '' })}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs">{t('drift.limits')}</p>
            </div>
          )}
        </div>

        <Button variant="secondary" className="mt-4 w-full" onClick={onUsual}>
          {t('drift.keep_usual')}
        </Button>
      </section>
    </Card>
  );
}
