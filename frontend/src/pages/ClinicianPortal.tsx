// Clinician Portal (SPEC §8.5). Fetch on mount + poll every 5 s; cached data when offline.
import { AlertTriangle, Bell, CheckCircle2, Search, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../api/client';
import type { Alert, Patient } from '../api/types';
import { ProgramEditor, type ProgramDraft, draftFor } from '../components/dashboard/ProgramEditor';
import { Badge, Button, Card, CardTitle, Empty, Field, Modal, Skeleton, Stat, inputClass } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { formatDateTime, relativeDays } from '../i18n';
import { alertMessage, alertType } from '../i18n/records';
import { useApp } from '../lib/appContext';
import { cn } from '../lib/format';

export function Avatar({ initials, alert }: { initials: string; alert?: boolean }) {
  const { t } = useApp();
  return (
    <div className="relative">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-teal-soft to-[#dbe8f3] font-semibold text-teal-dark ring-2 ring-white">
        {initials}
      </div>
      {alert && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-alert" role="img" aria-label={t('clin.has_alerts')} />}
    </div>
  );
}

function AddPatientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: Patient) => void }) {
  const { t } = useApp();
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
      setError(err instanceof Error && err.name !== 'AbortError' ? err.message : t('clin.server_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('clin.modal_title')} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('clin.full_name')}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('clin.name_example')} />
        </Field>
        <Field label={t('clin.contact')}>
          <input className={inputClass} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+263 77 123 4567" />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t('clin.condition')}>
            <input
              className={inputClass}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder={t('clin.condition_example')}
            />
          </Field>
        </div>
      </div>
      <h3 className="mb-2 mt-5 font-semibold">{t('clin.assign')}</h3>
      <ProgramEditor value={programs} onChange={setPrograms} />
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={save} disabled={saving || name.trim().length < 2 || condition.trim().length < 2}>
          {saving ? t('common.saving') : t('clin.save_patient')}
        </Button>
      </div>
    </Modal>
  );
}

export function AlertsList({ alerts, onResolved, showPatient = true }: { alerts: Alert[]; onResolved: () => void; showPatient?: boolean }) {
  const { t, lang } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  if (alerts.length === 0) {
    return <Empty icon={<CheckCircle2 size={28} />} title={t('alert.none')} />;
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
              <div className="text-xs font-medium uppercase tracking-wide text-alert">{alertType(t, a)}</div>
              <p className="text-sm">{alertMessage(t, a)}</p>
              <div className="mt-1 text-xs text-navy-soft">{formatDateTime(a.created_at, lang)}</div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 w-full print:hidden"
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
            <CheckCircle2 size={16} /> {t('alert.mark_reviewed')}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export default function ClinicianPortal() {
  const { t } = useApp();
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
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('nav.clinician')}</h1>
          <p className="text-navy-soft">{t('clin.subtitle', { clinician: 'Dr. Demo', n: all.length })}</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <UserPlus size={18} /> {t('clin.add_patient')}
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t('clin.stat_patients')} value={all.length} />
        <Stat
          label={t('clin.stat_alerts')}
          value={alerts.data?.length ?? '—'}
          tone={alerts.data?.length ? 'text-alert' : undefined}
        />
        <Stat
          label={t('clin.stat_adherence')}
          value={all.length ? `${Math.round(all.reduce((a, p) => a + p.adherence, 0) / all.length)}%` : '—'}
        />
        <Stat
          label={t('clin.stat_score')}
          value={(() => {
            const scored = all.filter((p) => p.latest_score !== null);
            return scored.length ? Math.round(scored.reduce((a, p) => a + (p.latest_score ?? 0), 0) / scored.length) : '—';
          })()}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle icon={<Users size={18} />}>{t('clin.patients')}</CardTitle>
          <label className="relative mb-3 block">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-soft" aria-hidden />
            <input
              className={cn(inputClass, 'pl-10')}
              placeholder={t('clin.search')}
              aria-label={t('clin.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {patients.loading && !patients.data ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <Empty title={q ? t('clin.no_match') : t('clin.no_patients')}>{!q && t('clin.add_hint')}</Empty>
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
                      <Badge>{t('clin.awaiting')}</Badge>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 text-right">
                        <div>
                          <div className="font-semibold tabular-nums">{p.latest_score === null ? '—' : Math.round(p.latest_score)}</div>
                          <div className="text-xs text-navy-soft">{t('common.score')}</div>
                        </div>
                        <div>
                          <div className="font-semibold tabular-nums">{Math.round(p.adherence)}%</div>
                          <div className="text-xs text-navy-soft">{t('common.adherence')}</div>
                        </div>
                      </div>
                    )}
                    <div className="hidden w-24 text-right text-xs text-navy-soft sm:block">{relativeDays(t, p.last_session_at)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle icon={<Bell size={18} />} action={alerts.data && alerts.data.length > 0 && <Badge tone="alert">{alerts.data.length}</Badge>}>
            {t('clin.alerts')}
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
