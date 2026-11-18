// Physiotherapist view of the early warning and shared habits for one patient (SPEC §17.9, §17.10).
// The same signs the patient sees, before any missed session; habits only if the patient shares them.
import { CalendarCheck, Gauge } from 'lucide-react';
import { useMemo } from 'react';
import type { SessionRecord } from '../../api/types';
import { driftStatus, HABIT_IDS, HABITS, type HabitDay, type HabitId } from '../../coach';
import { useApi } from '../../hooks/useApi';
import { formatDate } from '../../i18n';
import { useApp } from '../../lib/appContext';
import { reasonText } from '../coach/HeadsUpCard';
import { Badge, Card, CardTitle } from '../ui';

export function EarlyWarningCard({ patientId, sessions }: { patientId: string; sessions: SessionRecord[] }) {
  const { t, lang } = useApp();
  const status = useMemo(() => driftStatus(sessions), [sessions]);
  const shared = useApi<HabitDay[]>(`/habits/${encodeURIComponent(patientId)}`);
  const days = shared.data ?? [];
  const habits = HABIT_IDS.filter((h) => days.some((d) => d.values[h] !== undefined));
  const unit = (id: HabitId, v: number) => t(v === 1 ? `habit.unit1.${HABITS[id].unit}` : `habit.unit.${HABITS[id].unit}`, { n: v });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardTitle icon={<Gauge size={18} />} action={status.level !== 'steady' && <Badge tone="review">{t('pd.early_badge')}</Badge>}>
          {t('pd.early_title')}
        </CardTitle>
        {status.level === 'steady' ? (
          <p className="text-navy-soft">{status.enoughHistory ? t('pd.early_none') : t('pd.early_few')}</p>
        ) : (
          <>
            <p className="text-navy-soft">{t('pd.early_body', { n: status.reasons.length })}</p>
            <ul className="mt-3 space-y-1.5">
              {status.reasons.map((r) => (
                <li key={r.signal} className="flex gap-2 text-sm text-navy">
                  <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  <span>{reasonText(t, r)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-3 text-xs text-navy-soft">{t('pd.early_limits')}</p>
      </Card>
      <Card>
        <CardTitle icon={<CalendarCheck size={18} />}>{t('pd.habits_title')}</CardTitle>
        {habits.length === 0 ? (
          <p className="text-navy-soft">{t('pd.habits_none')}</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t('pd.habits_title')}>
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="text-left text-navy-soft">
                  <th scope="col" className="py-1.5 pr-3 font-medium">{t('pd.habits_day')}</th>
                  {habits.map((h) => (
                    <th key={h} scope="col" className="py-1.5 pr-3 font-medium">{t(`habit.name.${h}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...days].reverse().slice(0, 7).map((d) => (
                  <tr key={d.day} className="border-t border-line">
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium">{formatDate(`${d.day}T12:00:00`, lang)}</th>
                    {habits.map((h) => (
                      <td key={h} className="py-1.5 pr-3 tabular-nums">{d.values[h] === undefined ? '—' : unit(h, d.values[h]!)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-navy-soft">{t('pd.habits_note')}</p>
      </Card>
    </div>
  );
}
