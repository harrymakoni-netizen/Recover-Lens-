// Clinician Portal (SPEC §8.5). Fetch on mount + poll every 5 s; cached data when offline.
import { AlertTriangle, Bell, CheckCircle2, Search, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../api/client';
import type { Alert, Patient } from '../api/types';
import { ProgramEditor, type ProgramDraft, draftFor } from '../components/dashboard/ProgramEditor';
import { Badge, Button, Card, CardTitle, Empty, Field, Modal, Skeleton, inputClass } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { cn, formatDateTime, relativeDays } from '../lib/format';

export function Avatar({ initials, alert }: { initials: string; alert?: boolean }) {
  return (
    <div className="relative">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-soft font-semibold text-teal-dark">{initials}</div>
      {alert && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-alert" aria-label="Has alerts" />}
    </div>
  );
}

function AddPatientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: Patient) => void }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [condition, setCondition] = useState('');
  const [programs, setPrograms] = useState<ProgramDraft[]>([draftFor('shoulder_abduction')]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await post<Patient>('/patients', { name: name.trim(), contact: contact.trim(), condition: condition.trim(), programs });
      onCreated(created);
      setName('');
      setContact('');
      setCondition('');
      setPrograms([draftFor('shoulder_abduction')]);
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.name !== 'AbortError' ? err.message : 'Could not reach the server. Check the connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add patient" wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rudo Chikore" />
        </Field>
        <Field label="Phone or email">
          <input className={inputClass} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+263 77 123 4567" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Condition">
            <input className={inputClass} value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Shoulder rehabilitation" />
          </Field>
        </div>
      </div>
      <h3 className="mb-2 mt-5 font-semibold">Assign exercises</h3>
      <ProgramEditor value={programs} onChange={setPrograms} />
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving || name.trim().length < 2 || condition.trim().length < 2}>
          {saving ? 'Saving…' : 'Save patient'}
        </Button>
      </div>
    </Modal>
  );
}

export function AlertsList({ alerts, onResolved, showPatient = true }: { alerts: Alert[]; onResolved: () => void; showPatient?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (alerts.length === 0) {
    return <Empty icon={<CheckCircle2 size={28} />} title="No open alerts" />;
  }
  return (
    <ul className="space-y-3">
      {alerts.map((a) => (
        <li key={a.id} className="rounded-xl border border-alert/20 bg-alert-soft/60 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-alert" />
            <div className="min-w-0 flex-1">
              {showPatient && (
                <Link to={`/clinician/${a.patient_id}`} className="font-semibold hover:underline">
                  {a.patient_name}
                </Link>
              )}
              <div className="text-xs font-medium uppercase tracking-wide text-alert">{a.type}</div>
              <p className="text-sm">{a.message}</p>
              <div className="mt-1 text-xs text-navy-soft">{formatDateTime(a.created_at)}</div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 w-full"
            disabled={busy === a.id}
            onClick={async () => {
              setBusy(a.id);
              try {
                await post(`/alerts/${a.id}/resolve`, {});
                onResolved();
              } finally {
                setBusy(null);
              }
            }}
          >
            <CheckCircle2 size={16} /> Mark reviewed
          </Button>
        </li>
      ))}
    </ul>
  );
}

export default function ClinicianPortal() {
  const patients = useApi<Patient[]>('/patients');
  const alerts = useApi<Alert[]>('/alerts?resolved=false');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState<Patient[]>([]);

  const all = [...(patients.data ?? []), ...justAdded.filter((p) => !patients.data?.some((x) => x.id === p.id))];
  const q = query.trim().toLowerCase();
  const list = all.filter((p) => !q || p.name.toLowerCase().includes(q) || p.condition.toLowerCase().includes(q));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Clinician Portal</h1>
          <p className="text-navy-soft">Dr. Demo · {all.length} patients</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <UserPlus size={18} /> Add Patient
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle icon={<Users size={20} />}>Patients</CardTitle>
          <label className="relative mb-3 block">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
            <input className={cn(inputClass, 'pl-10')} placeholder="Search name or condition" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {patients.loading && !patients.data ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <Empty title={q ? 'No matching patients' : 'No patients yet'}>{!q && 'Add a patient to get started.'}</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {list.map((p) => (
                <li key={p.id}>
                  <Link to={`/clinician/${p.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-page">
                    <Avatar initials={p.initials} alert={p.unresolved_alerts > 0} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{p.name}</div>
                      <div className="truncate text-sm text-navy-soft">{p.condition}</div>
                    </div>
                    {p.session_count === 0 ? (
                      <Badge>Awaiting first session</Badge>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 text-right">
                        <div>
                          <div className="font-semibold tabular-nums">{p.latest_score === null ? '—' : Math.round(p.latest_score)}</div>
                          <div className="text-xs text-navy-soft">score</div>
                        </div>
                        <div>
                          <div className="font-semibold tabular-nums">{Math.round(p.adherence)}%</div>
                          <div className="text-xs text-navy-soft">adherence</div>
                        </div>
                      </div>
                    )}
                    <div className="hidden w-24 text-right text-xs text-navy-soft sm:block">{relativeDays(p.last_session_at)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle icon={<Bell size={20} />} action={alerts.data && alerts.data.length > 0 && <Badge tone="alert">{alerts.data.length}</Badge>}>
            Alerts
          </CardTitle>
          {alerts.loading && !alerts.data ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <AlertsList
              alerts={alerts.data ?? []}
              onResolved={() => {
                void alerts.refresh();
                void patients.refresh();
              }}
            />
          )}
        </Card>
      </div>

      <AddPatientModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(p) => {
          setJustAdded((x) => [...x, p]);
          void patients.refresh();
        }}
      />
    </div>
  );
}
