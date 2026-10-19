// Coach Portal (SPEC §8.6): squad overview from stored screenings, filter by sport. Tap an athlete
// to see what their latest screening observed and what to work on.
import { ChevronDown, Users } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import type { Athlete, Screening } from '../api/types';
import { ObservationList } from '../components/dashboard/ScreeningResult';
import { Badge, Card, CardTitle, Empty, Skeleton, Stat } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useLocalScreenings, useMerged } from '../hooks/useLocalData';
import { formatDate } from '../i18n';
import { describeObservation, sportName } from '../i18n/records';
import { useApp } from '../lib/appContext';
import { cn, initials } from '../lib/format';
import { SPORTS } from '../pose/screening';
import { Avatar } from './ClinicianPortal';

export default function CoachPortal() {
  const { t, lang } = useApp();
  const athletes = useApi<Athlete[]>('/athletes');
  const server = useApi<Screening[]>('/screenings');
  const local = useLocalScreenings();
  const screenings = useMerged<Screening>(server.data, local, 'created_at');
  const [sport, setSport] = useState<string>('all');
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const latestByAthlete = new Map<string, Screening>();
    for (const s of screenings) if (!latestByAthlete.has(s.athlete_id)) latestByAthlete.set(s.athlete_id, s);
    const known = new Map((athletes.data ?? []).map((a) => [a.id, a]));
    // Athletes screened offline may not be on the server yet.
    for (const s of screenings) {
      if (!known.has(s.athlete_id)) known.set(s.athlete_id, { id: s.athlete_id, name: s.athlete_name ?? t('common.athlete'), sport: s.sport, team: null });
    }
    return [...known.values()]
      .filter((a) => sport === 'all' || a.sport === sport)
      .map((a) => ({ athlete: a, latest: latestByAthlete.get(a.id) }))
      .sort((x, y) => (y.latest?.created_at ?? '').localeCompare(x.latest?.created_at ?? ''));
  }, [athletes.data, screenings, sport, t]);

  const screened = rows.filter((r) => r.latest);
  const good = screened.filter((r) => r.latest!.overall === 'good').length;
  const review = screened.length - good;
  const loading = (athletes.loading && !athletes.data) || (server.loading && !server.data);

  return (
    <div>
      <h1 className="text-3xl font-semibold">{t('nav.coach')}</h1>
      <p className="text-navy-soft">{t('coach.subtitle')}</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label={t('coach.screened')} value={loading ? '…' : screened.length} />
        <Stat label={t('common.good')} value={loading ? '…' : good} tone="text-emerald-700" />
        <Stat label={t('common.needs_review')} value={loading ? '…' : review} tone={review ? 'text-amber-600' : undefined} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t('coach.filter')}>
        {[{ id: 'all', name: t('coach.all_sports') }, ...SPORTS.map((s) => ({ id: s.id, name: sportName(t, s.id) }))].map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={sport === s.id}
            onClick={() => setSport(s.id)}
            className={cn(
              'min-h-10 rounded-full border px-4 text-sm',
              sport === s.id ? 'border-teal bg-teal text-white' : 'border-line bg-white text-navy-soft hover:border-teal/40',
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      <Card className="mt-4">
        <CardTitle icon={<Users size={20} />}>{t('coach.athletes')}</CardTitle>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Empty title={t('coach.none')}>{t('coach.none_hint')}</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:-mx-5" role="region" tabIndex={0} aria-label={t('nav.coach')}>
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-navy-soft">
                <tr className="border-b border-line">
                  <th className="px-5 py-2 font-medium">{t('coach.col_athlete')}</th>
                  <th className="py-2 font-medium">{t('coach.col_sport')}</th>
                  <th className="py-2 font-medium">{t('coach.col_last')}</th>
                  <th className="px-5 py-2 font-medium">{t('coach.col_flags')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ athlete, latest }) => {
                  const observations = latest?.results_json.observations ?? [];
                  const flags = observations.filter((o) => o.status === 'review');
                  const expanded = open === athlete.id;
                  const detailsId = `screening-${athlete.id}`;
                  const who = (
                    <>
                      <Avatar initials={initials(athlete.name)} />
                      <div className="text-left">
                        <div className="font-semibold">{athlete.name}</div>
                        {athlete.team && <div className="text-xs text-navy-soft">{athlete.team}</div>}
                      </div>
                    </>
                  );
                  return (
                    <Fragment key={athlete.id}>
                      <tr className={cn('align-top', !expanded && 'border-b border-line last:border-0')}>
                        <td className="px-5 py-3">
                          {latest ? (
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-controls={detailsId}
                              onClick={() => setOpen(expanded ? null : athlete.id)}
                              className="-m-1 flex items-center gap-3 rounded-xl p-1 hover:bg-page"
                            >
                              {who}
                              <ChevronDown
                                size={18}
                                aria-hidden
                                className={cn('shrink-0 text-navy-soft transition-transform', expanded && 'rotate-180')}
                              />
                            </button>
                          ) : (
                            <div className="flex items-center gap-3">{who}</div>
                          )}
                        </td>
                        <td className="py-3">{sportName(t, athlete.sport)}</td>
                        <td className="py-3">
                          {latest ? formatDate(latest.created_at, lang) : <span className="text-navy-soft">{t('coach.not_screened')}</span>}
                        </td>
                        <td className="px-5 py-3">
                          {!latest ? null : flags.length === 0 ? (
                            <Badge tone="good">{t('common.good')}</Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {flags.map((f) => (
                                <Badge key={f.id} tone="review">
                                  {describeObservation(t, f).label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                      {expanded && latest && (
                        <tr id={detailsId} className="border-b border-line last:border-0">
                          <td colSpan={4} className="px-5 pb-4">
                            <h3 className="mb-2 text-sm font-semibold text-navy-soft">
                              {t('sports.latest')} · {formatDate(latest.created_at, lang)}
                            </h3>
                            {/* Items to review first, so the coach sees what to work on. */}
                            <ObservationList observations={[...flags, ...observations.filter((o) => o.status !== 'review')]} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
