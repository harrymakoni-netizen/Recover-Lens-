// Sports Screening (SPEC §8.4). The summary panel and the recent list both read from the same
// stored results (server + local queue). Never hard-coded.
import { ClipboardList, Dumbbell, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Athlete, Screening } from '../api/types';
import { ObservationList } from '../components/dashboard/ScreeningResult';
import { Disclaimer } from '../components/layout/Disclaimer';
import { Badge, Button, Card, CardTitle, Empty, Field, Skeleton, inputClass } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useLocalScreenings, useMerged } from '../hooks/useLocalData';
import { cn, formatDateTime } from '../lib/format';
import { BATTERIES, SPORTS, type Sport } from '../pose/screening';
import { voice } from '../voice/voiceEngine';

export const sportName = (s: string) => SPORTS.find((x) => x.id === s)?.name ?? s;

export default function SportsScreening() {
  const navigate = useNavigate();
  const [sport, setSport] = useState<Sport>('football');
  const [athleteId, setAthleteId] = useState('');
  const [newName, setNewName] = useState('');
  const { data: athletes } = useApi<Athlete[]>('/athletes', { poll: false });
  const { data: server, loading } = useApi<Screening[]>('/screenings');
  const local = useLocalScreenings();
  const screenings = useMerged<Screening>(server, local, 'created_at');
  const latest = screenings[0];

  const sportAthletes = useMemo(() => (athletes ?? []).filter((a) => a.sport === sport), [athletes, sport]);
  const chosen = athletes?.find((a) => a.id === athleteId);
  const canStart = !!chosen || newName.trim().length > 1;

  const start = () => {
    voice.unlock();
    navigate(`/sports/run/${sport}`, {
      state: chosen ? { athleteId: chosen.id, athleteName: chosen.name } : { athleteName: newName.trim() },
    });
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold">Sports Screening</h1>
      <p className="mt-1 text-navy-soft">A short movement screen. Results are observations for a coach or physio to review, not a diagnosis.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardTitle icon={<Dumbbell size={20} />}>1. Choose a sport</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {SPORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={sport === s.id}
                onClick={() => {
                  setSport(s.id);
                  setAthleteId('');
                }}
                className={cn(
                  'min-h-20 rounded-xl border-2 p-3 text-left transition-colors',
                  sport === s.id ? 'border-teal bg-teal-soft' : 'border-line bg-white hover:border-teal/40',
                )}
              >
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-navy-soft">{s.blurb}</div>
              </button>
            ))}
          </div>

          <h3 className="mt-6 font-semibold">Tests</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-navy-soft">
            {BATTERIES[sport].map((s) => (
              <li key={s.id}>{s.label}</li>
            ))}
          </ol>

          <h3 className="mt-6 font-semibold">2. Athlete</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Field label="Existing athlete">
              <select className={inputClass} value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
                <option value="">— New athlete —</option>
                {sportAthletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.team ? ` (${a.team})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            {!athleteId && (
              <Field label="New athlete name">
                <input className={inputClass} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Tendai Moyo" />
              </Field>
            )}
          </div>
          <Button size="lg" className="mt-5 w-full sm:w-auto" disabled={!canStart} onClick={start}>
            <Play size={18} /> Start screening
          </Button>
        </Card>

        <Card>
          <CardTitle icon={<ClipboardList size={20} />}>Latest result</CardTitle>
          {loading && !latest ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : !latest ? (
            <Empty title="No screenings yet">Run a screening to see results here.</Empty>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{latest.athlete_name}</div>
                  <div className="text-sm text-navy-soft">
                    {sportName(latest.sport)} · {formatDateTime(latest.created_at)}
                  </div>
                </div>
                <Badge tone={latest.overall === 'review' ? 'review' : 'good'}>{latest.overall === 'review' ? 'Needs review' : 'Good'}</Badge>
              </div>
              <ObservationList observations={latest.results_json.observations} />
            </>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle icon={<ClipboardList size={20} />}>Recent screenings</CardTitle>
        {screenings.length === 0 ? (
          <Empty title="No screenings yet">Run a screening to see results here.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {screenings.slice(0, 10).map((s) => {
              const flags = s.results_json.observations.filter((o) => o.status === 'review');
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-medium">{s.athlete_name}</div>
                    <div className="text-sm text-navy-soft">
                      {sportName(s.sport)} · {formatDateTime(s.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {flags.length > 0 && <span className="text-sm text-navy-soft">{flags.length} to review</span>}
                    <Badge tone={s.overall === 'review' ? 'review' : 'good'}>{s.overall === 'review' ? 'Review' : 'Good'}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Disclaimer />
    </div>
  );
}
