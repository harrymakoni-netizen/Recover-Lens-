// Clinician Portal (SPEC §8.5). Fetch on mount + poll every 5 s; cached data when offline.
import { AlertTriangle, Bell, CheckCircle2, FlaskConical, RotateCcw, Search, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, clearCache, post } from '../api/client';
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

/**
 * "Reset demo data" (SPEC §9.5): puts the demo patients, sessions and alerts back with today's dates,
 * as the nightly job does. Also clears this device's check-in and comeback state, so a recording
 * starts clean. Language, the patient being viewed and display settings are kept.
 */
function DemoResetButton() {
  const { t, lang } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{ seeded_at: string | null; source: string | null } | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    api<{ seeded_at: string | null; source: string | null }>('/demo').then(setLast, () => setLast(null));
  }, [open]);

  const reset = async () => {
    setBusy(true);
    setError(null);
    try {
      await post('/seed', {});
      clearCache();
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith('rl.coach')) localStorage.removeItem(k);
      } catch {
        // storage blocked: the server data is still reset
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 429 ? t('demo.too_soon') : t('demo.failed'));
      setBusy(false);
    }
  };

  const source = last?.source === 'nightly' || last?.source === 'button' || last?.source === 'start' ? last.source : null;
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm text-navy-soft print:hidden">
        <span>{t('demo.note')}</span>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <RotateCcw size={16} aria-hidden /> {t('demo.reset')}
        </Button>
      </div>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title={t('demo.title')}>
        <p className="text-navy-soft">{t('demo.body')}</p>
        {last?.seeded_at && (
          <p className="mt-3 rounded-xl bg-page p-3 text-sm">
            {t('demo.last', { when: formatDateTime(last.seeded_at, lang) })}
            {source && ` · ${t(`demo.source.${source}`)}`}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void reset()} disabled={busy}>
            <RotateCcw size={18} aria-hidden /> {busy ? t('demo.resetting') : t('demo.confirm')}
          </Button>
        </div>
      </Modal>
    </>
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
        <div className="flex flex-wrap gap-2">
          <Link
            to="/outcomes"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-white px-4 font-medium text-navy hover:bg-teal-soft"
          >
            <FlaskConical size={18} aria-hidden /> {t('out.link')}
          </Link>
          <Button onClick={() => setAdding(true)}>
            <UserPlus size={18} /> {t('clin.add_patient')}
          </Button>
        </div>
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
                      <div className="font-semibold leading-snug">{p.name}</div>
                      <div className="line-clamp-2 text-sm text-navy-soft">{p.condition}</div>
                      {/* The last-session column needs width; below that it sits under the condition. */}
                      <div className="text-xs text-navy-soft xl:hidden">{relativeDays(t, p.last_session_at)}</div>
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
                    <div className="hidden w-24 text-right text-xs text-navy-soft xl:block">{relativeDays(t, p.last_session_at)}</div>
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

      <DemoResetButton />

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
