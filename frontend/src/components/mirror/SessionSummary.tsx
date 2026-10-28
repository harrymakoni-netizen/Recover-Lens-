// Session summary card that replaces the camera at the end (SPEC §7.2). Saves automatically if the
// user leaves without pressing Save.
import { Check, Share2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { enqueue } from '../../api/offlineQueue';
import type { PatientDetail, SessionMode, SessionRecord } from '../../api/types';
import { useApi } from '../../hooks/useApi';
import { useLocalSessions, useMerged } from '../../hooks/useLocalData';
import { exerciseName } from '../../i18n';
import { useApp } from '../../lib/appContext';
import { compareWithBaseline, personalBaseline } from '../../lib/baseline';
import { fatigueLine } from '../../lib/fatigueText';
import { cn, round } from '../../lib/format';
import { buildSessionRecord, faultLabel, recommendationFor, shareText } from '../../lib/sessionRecord';
import type { SessionSummary as Summary } from '../../pose/sessionEngine';
import { BrandMark } from '../layout/Brand';
import { Button, PainSlider } from '../ui';

interface Props {
  sessionId: string;
  summary: Summary;
  patientId: string;
  patientName?: string;
  mode: SessionMode;
  startedAt: string;
  painBefore: number | null;
  /** Caregiver mode: patient confirmed the pain check-in. */
  painConfirmed?: boolean;
  onDone: () => void;
  /** Guided timer sessions have no measured score. */
  guided?: boolean;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 border-t border-white/10 py-2.5">
      <dt className="text-white/75">{label}</dt>
      <dd className="font-medium text-white">{value}</dd>
    </div>
  );
}

/** A big number with an optional "vs usual" line underneath. */
function Tile({ label, value, note, tone }: { label: string; value: string; note?: string | null; tone?: 'up' | 'down' | null }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
      <dt className="text-xs font-medium uppercase tracking-wide text-white/70">{label}</dt>
      <dd className="mt-1">
        <span className="text-2xl font-bold tabular-nums text-white">{value}</span>
        {note && (
          <span className={cn('mt-0.5 block text-xs', tone === 'up' ? 'text-emerald-300' : tone === 'down' ? 'text-amber-200' : 'text-white/70')}>
            {note}
          </span>
        )}
      </dd>
    </div>
  );
}

export function SessionSummaryCard({
  sessionId, summary, patientId, patientName, mode, startedAt, painBefore, painConfirmed, onDone, guided,
}: Props) {
  const { t } = useApp();
  const caregiver = mode === 'caregiver';
  const name = exerciseName(t, summary.exerciseId);
  const [painAfter, setPainAfter] = useState(painBefore ?? 0);
  const [confirmed, setConfirmed] = useState(painConfirmed ?? false);
  const [saved, setSaved] = useState(false);
  const [shareState, setShareState] = useState<string | null>(null);
  const savedRef = useRef(false);
  const latest = useRef({ painAfter, confirmed });
  latest.current = { painAfter, confirmed };

  const record = useCallback(
    (): SessionRecord => ({
      ...buildSessionRecord({
        id: sessionId,
        summary,
        patientId,
        mode,
        startedAt,
        painBefore,
        painAfter: latest.current.painAfter,
        painConfirmed: latest.current.confirmed,
      }),
      ...(guided ? { movement_score: null, avg_top_angle: null, torso_alignment_avg: null, symmetry_avg: null } : {}),
    }),
    [sessionId, summary, patientId, mode, startedAt, painBefore, guided],
  );

  const save = useCallback(async () => {
    if (savedRef.current) return;
    savedRef.current = true;
    await enqueue('session', sessionId, record());
    setSaved(true);
  }, [record, sessionId]);

  // Auto-save if the user leaves (SPEC §7.2).
  useEffect(() => {
    const onHide = () => void save();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      void save();
    };
  }, [save]);

  const share = async () => {
    const text = shareText(t, record(), name, patientName);
    try {
      if (navigator.share) {
        await navigator.share({ title: t('share.title'), text });
        setShareState(t('sum.shared'));
      } else {
        await navigator.clipboard.writeText(text);
        setShareState(t('sum.copied'));
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setShareState(t('sum.copied'));
      } catch {
        setShareState(t('sum.share_failed'));
      }
    }
  };

  const topFault = summary.topFault;
  const accent = caregiver ? 'text-orange-300' : 'text-good';

  // Personal baseline: this session against the person's own recent sessions of the same exercise.
  const { data: patient } = useApi<PatientDetail>(guided ? null : `/patients/${patientId}`, { poll: false });
  const local = useLocalSessions(guided ? undefined : patientId);
  const history = useMerged<SessionRecord>(patient?.sessions, local, 'started_at');
  const base = useMemo(
    () => (guided ? null : personalBaseline(history, summary.exerciseId, { excludeId: sessionId, before: startedAt })),
    [guided, history, summary.exerciseId, sessionId, startedAt],
  );
  const cmp = base
    ? compareWithBaseline(
        { score: summary.movementScore, angle: summary.avgTopAngle, reps: summary.reps, correct: summary.correctReps },
        base,
        summary.exerciseId,
      )
    : null;
  const delta = (d: number | null | undefined, up: string, down: string) =>
    d === null || d === undefined ? null : d > 0 ? t(up, { n: d }) : d < 0 ? t(down, { n: -d }) : t('base.same');
  const toneOf = (d: number | null | undefined) => (!d ? null : d > 0 ? 'up' : 'down');

  return (
    <div className="flex min-h-full items-center justify-center p-4 pt-16">
      <div className="rise w-full max-w-xl rounded-3xl border border-white/15 bg-[#0d1626]/95 p-6 text-white shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3">
          <BrandMark size={34} onDark />
          <div>
            <h1 className={`text-2xl font-bold tracking-wide ${accent}`}>{t('sum.title')}</h1>
            <p className="text-sm text-white/75">{name}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3">
          {summary.kind === 'reps' ? (
            <>
              <Tile label={t('sum.total_reps')} value={String(summary.reps)} />
              {!guided && (
                <Tile
                  label={t('sum.correct_reps')}
                  value={String(summary.correctReps)}
                  note={delta(cmp?.correctDelta, 'base.correct_up', 'base.correct_down')}
                  tone={toneOf(cmp?.correctDelta)}
                />
              )}
            </>
          ) : (
            <Tile label={t('sum.holds')} value={t('sum.holds_value', { done: summary.setsCompleted, total: summary.sets })} />
          )}
          {!guided && (
            <Tile
              label={t('sum.movement_score')}
              value={summary.movementScore === null ? '—' : `${round(summary.movementScore, 1)}%`}
              note={delta(cmp?.scoreDelta, 'base.up', 'base.down')}
              tone={toneOf(cmp?.scoreDelta)}
            />
          )}
          {!guided && summary.avgTopAngle !== null && (
            <Tile
              label={t('sum.avg_angle')}
              value={`${round(summary.avgTopAngle, 1)}°`}
              note={delta(cmp?.rangeDelta, 'base.range_more', 'base.range_less')}
              tone={toneOf(cmp?.rangeDelta)}
            />
          )}
          {!guided && summary.effort && (
            <Tile
              label={t('effort.title')}
              value={t('effort.value', { n: Math.round(summary.effort.peakNm) })}
              note={
                summary.effort.loadKg > 0
                  ? t('effort.with_load', { n: summary.effort.loadKg })
                  : t('effort.no_load')
              }
            />
          )}
        </dl>
        {!guided && (
          <dl className="mt-4 text-[15px]">
            <Row
              label={topFault ? t('sum.most_common', { fault: faultLabel(t, topFault) }) : t('sum.form')}
              value={recommendationFor(t, topFault)}
            />
            {summary.fatigue && (
              <Row
                label={t('fatigue.title')}
                value={`${fatigueLine(t, {
                  level: summary.fatigue.level,
                  slowerPct: summary.fatigue.slowerPct,
                  shorterPct: summary.fatigue.shorterPct,
                  formPoints: summary.fatigue.formPoints,
                })}${summary.fatigue.level === 'clear' ? ` ${t('fatigue.tip')}` : ''}`}
              />
            )}
          </dl>
        )}
        {!guided && (
          <p className="mt-2 text-xs text-white/70">
            {base ? t('base.caption') : t('base.first')}
            {summary.effort && ` ${t('effort.explain')}`}
          </p>
        )}

        <div className="mt-5 rounded-xl bg-white/5 p-4">
          <PainSlider
            dark
            value={painAfter}
            onChange={(v) => {
              setPainAfter(v);
              savedRef.current = false;
              setSaved(false);
            }}
            label={caregiver ? t('sum.pain_after_cg') : t('sum.pain_after')}
          />
          {caregiver && (
            <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-6 w-6 shrink-0 accent-[var(--color-care)]"
                checked={confirmed}
                onChange={(e) => {
                  setConfirmed(e.target.checked);
                  savedRef.current = false;
                  setSaved(false);
                }}
              />
              {t('common.confirmed_by_patient')}
            </label>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant={caregiver ? 'care' : 'primary'}
            size="lg"
            className="flex-1"
            onClick={async () => {
              await save();
              onDone();
            }}
          >
            {saved ? <Check size={20} /> : null} {saved ? t('sum.saved_done') : t('common.save')}
          </Button>
          <Button variant="secondary" size="lg" onClick={share}>
            <Share2 size={18} /> {t('sum.share')}
          </Button>
        </div>
        {shareState && <p className="mt-2 text-sm text-white/70">{shareState}</p>}
      </div>
    </div>
  );
}
