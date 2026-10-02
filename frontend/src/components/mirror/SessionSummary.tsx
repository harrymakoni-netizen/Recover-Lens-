// Session summary card that replaces the camera at the end (SPEC §7.2). Saves automatically if the
// user leaves without pressing Save.
import { Check, Share2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { enqueue } from '../../api/offlineQueue';
import type { SessionMode, SessionRecord } from '../../api/types';
import { round } from '../../lib/format';
import { FAULT_LABELS, buildSessionRecord, recommendationFor, shareText } from '../../lib/sessionRecord';
import type { FaultRuleId } from '../../pose/formRules';
import type { SessionSummary as Summary } from '../../pose/sessionEngine';
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
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 py-1.5">
      <dt className="text-white/65">{label}</dt>
      <dd className="font-semibold text-white">{value}</dd>
    </div>
  );
}

export function SessionSummaryCard({
  sessionId, summary, patientId, patientName, mode, startedAt, painBefore, painConfirmed, onDone, guided,
}: Props) {
  const caregiver = mode === 'caregiver';
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
    const text = shareText(record(), summary.exerciseName, patientName);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'RecoverLens session', text });
        setShareState('Shared');
      } else {
        await navigator.clipboard.writeText(text);
        setShareState('Copied — paste it into WhatsApp');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setShareState('Copied — paste it into WhatsApp');
      } catch {
        setShareState('Could not share');
      }
    }
  };

  const topFault = summary.topFault as FaultRuleId | null;
  const accent = caregiver ? 'text-care' : 'text-good';

  return (
    <div className="flex min-h-full items-center justify-center p-4 pt-16">
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#121510] p-6 text-white">
        <h1 className={`text-2xl font-bold tracking-wide ${accent}`}>SESSION COMPLETE</h1>
        <dl className="mt-4 text-[15px]">
          <Row label="Exercise" value={summary.exerciseName} />
          {summary.kind === 'reps' ? (
            <>
              <Row label="Total reps" value={String(summary.reps)} />
              {!guided && <Row label="Correct reps" value={String(summary.correctReps)} />}
            </>
          ) : (
            <Row label="Holds completed" value={`${summary.setsCompleted} of ${summary.sets}`} />
          )}
          {!guided && summary.avgTopAngle !== null && <Row label="Average angle at top" value={`${round(summary.avgTopAngle, 1)}°`} />}
          {!guided && <Row label="Movement score" value={summary.movementScore === null ? '—' : `${round(summary.movementScore, 1)}%`} />}
          {!guided && (
            <Row
              label={topFault ? `Most common: ${FAULT_LABELS[topFault]}` : 'Form'}
              value={recommendationFor(topFault)}
            />
          )}
        </dl>

        <div className="mt-5 rounded-xl bg-white/5 p-4">
          <PainSlider
            dark
            value={painAfter}
            onChange={(v) => {
              setPainAfter(v);
              savedRef.current = false;
              setSaved(false);
            }}
            label={caregiver ? 'Their pain after the session' : 'Pain after session'}
          />
          {caregiver && (
            <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[#E07A10]"
                checked={confirmed}
                onChange={(e) => {
                  setConfirmed(e.target.checked);
                  savedRef.current = false;
                  setSaved(false);
                }}
              />
              Confirmed by patient
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
            {saved ? <Check size={20} /> : null} {saved ? 'Saved — Done' : 'Save'}
          </Button>
          {caregiver && (
            <Button variant="secondary" size="lg" onClick={share}>
              <Share2 size={18} /> Share
            </Button>
          )}
        </div>
        {shareState && <p className="mt-2 text-sm text-white/70">{shareState}</p>}
      </div>
    </div>
  );
}
