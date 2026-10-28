// Coach insights card (lib/insights.ts): plain findings from the person's own sessions.
import { CircleCheck, Eye, Info, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import type { Program, SessionRecord } from '../../api/types';
import { exerciseName } from '../../i18n';
import { useApp } from '../../lib/appContext';
import { cn } from '../../lib/format';
import { type Insight, buildInsights } from '../../lib/insights';
import { faultLabel } from '../../lib/sessionRecord';
import { Card, CardTitle, Empty } from '../ui';

const TONES = {
  review: { icon: Eye, box: 'border-amber-200 bg-amber-50', ic: 'text-amber-700' },
  good: { icon: CircleCheck, box: 'border-emerald-200 bg-emerald-50', ic: 'text-emerald-700' },
  neutral: { icon: Info, box: 'border-line bg-page', ic: 'text-blue' },
} as const;

export function useInsightText() {
  const { t } = useApp();
  return (i: Insight) => {
    const { exerciseId, faultId, ...vars } = i.vars;
    return t(i.key, {
      ...vars,
      ...(exerciseId ? { exercise: exerciseName(t, String(exerciseId)) } : {}),
      ...(faultId ? { fault: faultLabel(t, String(faultId)) } : {}),
    });
  };
}

export function InsightsCard({
  sessions,
  programs,
  className,
  max = 4,
}: {
  sessions: SessionRecord[];
  /** Active programmes with target angles, for the progress projection. */
  programs?: Program[];
  className?: string;
  max?: number;
}) {
  const { t } = useApp();
  const items = useMemo(() => buildInsights(sessions, Date.now(), programs).slice(0, max), [sessions, programs, max]);
  const text = useInsightText();
  return (
    <Card className={className}>
      <CardTitle icon={<Sparkles size={18} />}>{t('ins.title')}</CardTitle>
      {items.length === 0 ? (
        <Empty title={t('ins.empty')} />
      ) : (
        <ul className="space-y-2.5">
          {items.map((i) => {
            const tone = TONES[i.tone];
            const Icon = tone.icon;
            return (
              <li key={i.id} className={cn('rise flex items-start gap-3 rounded-xl border p-3 text-[0.9375rem]', tone.box)}>
                <Icon size={18} className={cn('mt-0.5 shrink-0', tone.ic)} aria-hidden />
                <span>
                  <span className="sr-only">{t(`ins.tone_${i.tone}`)}: </span>
                  {text(i)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-navy-soft">{t('ins.subtitle')}</p>
    </Card>
  );
}
