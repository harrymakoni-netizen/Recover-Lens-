// Physio view of the adaptive coach for one patient (SPEC §17.3): switch the AI coach off or on, and
// read the audit log of every model call (what was sent after redaction, what came back, which model).
import { ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { put } from '../../api/client';
import type { CoachEvent } from '../../api/types';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../i18n';
import { useApp } from '../../lib/appContext';
import { cn } from '../../lib/format';
import { Badge, Card, CardTitle } from '../ui';

function summary(e: CoachEvent): { sent: string; got: string } {
  const inp = (e.input ?? {}) as Record<string, unknown>;
  const out = (e.output ?? {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.join(', ') : '');
  if (e.kind === 'extract') {
    const areas = list(out.bodyAreas ?? out.body_areas);
    const pain = out.painLevel ?? out.pain_level;
    return { sent: String(inp.text ?? ''), got: [pain != null ? `pain ${pain}` : '', areas, list(out.barriers), list(out.redFlags ?? out.red_flags)].filter(Boolean).join(' · ') };
  }
  if (e.kind === 'plan') {
    const items = Array.isArray(out.items) ? (out.items as Array<Record<string, unknown>>).map((i) => `${i.exerciseId ?? i.exercise_id} ${i.sets}×${i.reps}`).join(', ') : '';
    return { sent: list(inp.library_ids), got: [items, String(out.why ?? '')].filter(Boolean).join(' — ') };
  }
  return { sent: [inp.nudge, inp.barrier].filter(Boolean).join(' · '), got: String(out.message ?? '') };
}

export function CoachAuditCard({ patientId, allowed, onChanged }: { patientId: string; allowed: boolean; onChanged: () => Promise<void> }) {
  const { t, lang } = useApp();
  const events = useApi<CoachEvent[]>(`/coach/events?patient_id=${encodeURIComponent(patientId)}&limit=20`);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggle = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await put(`/patients/${patientId}/coach`, { ai_allowed: !allowed });
      await onChanged();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const list = events.data ?? [];
  return (
    <Card>
      <CardTitle
        icon={<Sparkles size={18} />}
        action={
          <button
            type="button"
            role="switch"
            aria-checked={allowed}
            disabled={saving}
            onClick={() => void toggle()}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-sm font-medium text-navy-soft hover:bg-teal-soft disabled:opacity-60 print:hidden"
          >
            <span aria-hidden className={cn('relative h-5 w-9 rounded-full transition-colors', allowed ? 'bg-teal' : 'bg-navy/25')}>
              <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', allowed ? 'left-[1.125rem]' : 'left-0.5')} />
            </span>
            {allowed ? t('pd.coach_ai_on') : t('pd.coach_ai_off')}
          </button>
        }
      >
        {t('pd.coach_title')}
      </CardTitle>
      <p className="text-sm text-navy-soft">{allowed ? t('pd.coach_on_body') : t('pd.coach_off_body')}</p>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {t('pd.coach_failed')}
        </p>
      )}

      <h3 className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-navy">
        <ShieldCheck size={16} aria-hidden /> {t('pd.coach_log')}
      </h3>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-navy-soft">{t('pd.coach_log_empty')}</p>
      ) : (
        <ul className="mt-2 max-h-96 space-y-2 overflow-y-auto pr-1" tabIndex={0} aria-label={t('pd.coach_log')}>
          {list.map((e) => {
            const s = summary(e);
            return (
              <li key={e.id} className="rounded-xl bg-page p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t(`pd.coach_kind.${e.kind === 'extract' || e.kind === 'plan' ? e.kind : 'message'}`)}</span>
                  <Badge tone={e.ok ? 'good' : 'review'}>{e.ok ? t('pd.coach_ok') : t('pd.coach_fell_back')}</Badge>
                  <span className="text-xs text-navy-soft">
                    {formatDateTime(e.created_at, lang)} · {e.model ?? '—'} · {t('pd.coach_ms', { n: e.latency_ms })}
                  </span>
                </div>
                {s.sent && (
                  <p className="mt-1 [overflow-wrap:anywhere]">
                    <span className="text-navy-soft">{t('pd.coach_sent')}</span> {s.sent}
                  </p>
                )}
                {e.ok && s.got && (
                  <p className="mt-0.5 [overflow-wrap:anywhere]">
                    <span className="text-navy-soft">{t('pd.coach_got')}</span> {s.got}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
