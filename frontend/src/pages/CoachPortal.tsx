// Coach Portal (SPEC §8.6): squad overview from stored screenings, filter by sport.
import { Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Athlete, Screening } from '../api/types';
import { Badge, Card, CardTitle, Empty, Skeleton, Stat } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useLocalScreenings, useMerged } from '../hooks/useLocalData';
import { cn, formatDate } from '../lib/format';
import { SPORTS } from '../pose/screening';
import { sportName } from './SportsScreening';
import { Avatar } from './ClinicianPortal';
import { initials } from '../lib/format';

export default function CoachPortal() {
  const athletes = useApi<Athlete[]>('/athletes');
  const server = useApi<Screening[]>('/screenings');
  const local = useLocalScreenings();
  const screenings = useMerged<Screening>(server.data, local, 'created_at');
  const [sport, setSport] = useState<string>('all');

  const rows = useMemo(() => {
    const latestByAthlete = new Map<string, Screening>();
    for (const s of screenings) if (!latestByAthlete.has(s.athlete_id)) latestByAthlete.set(s.athlete_id, s);
    const known = new Map((athletes.data ?? []).map((a) => [a.id, a]));
    // Athletes screened offline may not be on the server yet.
    for (const s of screenings) {
      if (!known.has(s.athlete_id)) known.set(s.athlete_id, { id: s.athlete_id, name: s.athlete_name ?? 'Athlete', sport: s.sport, team: null });
    }
    return [...known.values()]
      .filter((a) => sport === 'all' || a.sport === sport)
      .map((a) => ({ athlete: a, latest: latestByAthlete.get(a.id) }))
      .sort((x, y) => (y.latest?.created_at ?? '').localeCompare(x.latest?.created_at ?? ''));
  }, [athletes.data, screenings, sport]);

  const screened = rows.filter((r) => r.latest);
  const good = screened.filter((r) => r.latest!.overall === 'good').length;
  const review = screened.length - good;
  const loading = (athletes.loading && !athletes.data) || (server.loading && !server.data);

  return (
    <div>
      <h1 className="text-3xl font-semibold">Coach Portal</h1>
      <p className="text-navy-soft">Squad movement screening overview.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Screened" value={loading ? '…' : screened.length} />
        <Stat label="Good" value={loading ? '…' : good} tone="text-emerald-700" />
        <Stat label="Needs review" value={loading ? '…' : review} tone={review ? 'text-amber-600' : undefined} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by sport">
        {[{ id: 'all', name: 'All sports' }, ...SPORTS].map((s) => (
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
        <CardTitle icon={<Users size={20} />}>Athletes</CardTitle>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Empty title="No athletes for this sport">Run a screening to add one.</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-navy-soft">
                <tr className="border-b border-line">
                  <th className="px-5 py-2 font-medium">Athlete</th>
                  <th className="py-2 font-medium">Sport</th>
                  <th className="py-2 font-medium">Last screening</th>
                  <th className="px-5 py-2 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ athlete, latest }) => {
                  const flags = latest?.results_json.observations.filter((o) => o.status === 'review') ?? [];
                  return (
                    <tr key={athlete.id} className="border-b border-line align-top last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials(athlete.name)} />
                          <div>
                            <div className="font-semibold">{athlete.name}</div>
                            {athlete.team && <div className="text-xs text-navy-soft">{athlete.team}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3">{sportName(athlete.sport)}</td>
                      <td className="py-3">{latest ? formatDate(latest.created_at) : <span className="text-navy-soft">Not screened</span>}</td>
                      <td className="px-5 py-3">
                        {!latest ? null : flags.length === 0 ? (
                          <Badge tone="good">Good</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {flags.map((f) => (
                              <Badge key={f.id} tone="review">
                                {f.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
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
