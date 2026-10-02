// Bottom-anchored HUD (SPEC §7.2). Nothing sits over the middle of the frame.
import { useEffect, useRef, useState } from 'react';
import type { ExerciseConfig } from '../../exercises/types';
import type { HudState } from '../../hooks/useSession';
import { cn, round } from '../../lib/format';
import { SKELETON_COLORS } from './drawSkeleton';

const pad = (n: number) => String(n).padStart(2, '0');

/** One-line live instruction, directly above the status panel. Dot matches the skeleton colour. */
export function InstructionPill({
  text,
  color,
  countdown,
}: {
  text: string;
  color: HudState['skeletonColor'];
  countdown?: number | null;
}) {
  if (countdown) {
    return (
      <div className="hud-panel inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-white" role="status" aria-live="polite">
        <span className="text-sm text-white/80">Starting in</span>
        <span key={countdown} className="rep-pop text-2xl font-bold tabular-nums">
          {countdown}
        </span>
      </div>
    );
  }
  if (!text) return null;
  return (
    <div
      className="hud-panel inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-white sm:text-base md:text-[17px]"
      role="status"
      aria-live="polite"
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SKELETON_COLORS[color] }} aria-hidden />
      <span className="truncate">{text}</span>
    </div>
  );
}

/** Rep counter that "pops" each time a rep is counted. */
function RepCount({ value, total }: { value: number; total: number }) {
  const [popKey, setPopKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (value > prev.current) setPopKey((k) => k + 1);
    prev.current = value;
  }, [value]);
  return (
    <span className="tabular-nums">
      <span key={popKey} className={popKey ? 'rep-pop' : undefined}>
        {pad(value)}
      </span>
      /{pad(total)}
    </span>
  );
}

function statusColor(hud: HudState): string {
  if (hud.skeletonColor === 'amber') return 'text-warn';
  if (hud.phase === 'active') return 'text-good';
  return 'text-white/80';
}

function holdText(hud: HudState): string | null {
  if (!hud.hold) return null;
  return `${Math.floor(hud.hold.elapsed)}s / ${hud.hold.target}s`;
}

export function HudStatusPanel({
  hud,
  config,
  caregiver,
  title,
}: {
  hud: HudState;
  config: ExerciseConfig;
  caregiver: boolean;
  title?: string;
}) {
  const hold = holdText(hud);
  return (
    <div className="hud-panel max-h-[22vh] w-[min(320px,42vw)] overflow-hidden rounded-xl px-4 py-3 text-white">
      <div className={cn('text-[11px] font-semibold tracking-[0.18em]', caregiver ? 'text-care' : 'text-teal-300')}>
        {caregiver ? 'CAREGIVER MODE' : 'AI REHAB MIRROR'}
      </div>
      <div className="truncate text-sm text-white/90">{title ?? config.name}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xs text-white/60">STATUS</span>
        <span className={cn('truncate text-lg font-semibold', statusColor(hud))}>{hud.status}</span>
      </div>
      <div className="flex items-baseline gap-4 text-sm">
        <span>
          Score <span className="font-semibold tabular-nums">{hud.score === null ? '--' : Math.round(hud.score)}</span>
        </span>
        {config.kind === 'reps' ? (
          <span>
            Rep <span className="font-semibold">{<RepCount value={hud.repsInSet} total={hud.targetReps} />}</span>
          </span>
        ) : (
          <span>
            Hold <span className="font-semibold tabular-nums">{hold}</span>
          </span>
        )}
        {hud.sets > 1 && (
          <span className="text-white/70">
            Set {hud.set}/{hud.sets}
          </span>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-white/70">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function HudMetricsPanel({ hud, config }: { hud: HudState; config: ExerciseConfig }) {
  const m = hud.metrics;
  const joint = config.primaryAngle && 'joint' in config.primaryAngle ? config.primaryAngle.joint : 'knee';
  const [l, r] = joint === 'shoulder' ? [m.shoulderL, m.shoulderR] : [m.kneeL, m.kneeR];
  const short = joint === 'shoulder' ? 'Shoulder' : 'Knee';
  const single = config.side !== 'both' && config.kind === 'reps';
  return (
    <div className="hud-panel max-h-[22vh] w-[min(260px,38vw)] overflow-hidden rounded-xl px-4 py-3 text-sm text-white">
      <div className="mb-1 text-[11px] font-semibold tracking-[0.18em] text-teal-300">LIVE METRICS</div>
      {single ? (
        <Metric
          label={`${hud.trackedSide === 'right' ? 'Right' : 'Left'} ${short}`}
          value={`${round(hud.trackedSide === 'right' ? r : l)}°`}
        />
      ) : (
        <>
          <Metric label={`Left ${short}`} value={`${round(l)}°`} />
          <Metric label={`Right ${short}`} value={`${round(r)}°`} />
        </>
      )}
      <Metric label="Torso" value={`${round(m.torsoAlignment)}%`} />
      {m.symmetry !== null && <Metric label="Symmetry" value={`${round(m.symmetry)}%`} />}
    </div>
  );
}

/** Under 640 px: one bar with Status, Rep, Score, Symmetry only. */
export function HudCompactBar({ hud, config, caregiver }: { hud: HudState; config: ExerciseConfig; caregiver: boolean }) {
  return (
    <div className={cn('hud-panel grid grid-cols-4 gap-2 rounded-xl px-3 py-2 text-white', caregiver && 'ring-2 ring-care')}>
      <div className="min-w-0">
        <div className="text-[10px] text-white/60">STATUS</div>
        <div className={cn('truncate text-sm font-semibold', statusColor(hud))}>{hud.status}</div>
      </div>
      <div>
        <div className="text-[10px] text-white/60">{config.kind === 'reps' ? 'REP' : 'HOLD'}</div>
        <div className="text-sm font-semibold">
          {config.kind === 'reps' ? <RepCount value={hud.repsInSet} total={hud.targetReps} /> : holdText(hud)}
        </div>
      </div>
      <div>
        <div className="text-[10px] text-white/60">SCORE</div>
        <div className="text-sm font-semibold tabular-nums">{hud.score === null ? '--' : Math.round(hud.score)}</div>
      </div>
      <div>
        <div className="text-[10px] text-white/60">SYM</div>
        <div className="text-sm font-semibold tabular-nums">
          {hud.metrics.symmetry === null ? '—' : `${Math.round(hud.metrics.symmetry)}%`}
        </div>
      </div>
    </div>
  );
}

/**
 * Calibration guide: a faint dashed frame showing where the body should fit. The 3-2-1 countdown
 * is shown in the instruction pill, never over the person.
 */
export function CalibrationOverlay({ hud }: { hud: HudState }) {
  if (hud.phase !== 'calibrating') return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="h-[86%] w-[min(42%,320px)] rounded-[40%_40%_12%_12%/18%_18%_6%_6%] border-2 border-dashed border-white/40" />
    </div>
  );
}

export function DebugPanel({
  hud,
  delegate,
  recording,
  onRecord,
}: {
  hud: HudState;
  delegate: string;
  recording: boolean;
  onRecord: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute left-2 top-14 z-20 w-56 rounded-lg bg-black/75 p-2 font-mono text-[11px] leading-tight text-lime-300">
      <div>FPS {round(hud.fps)} · detect {round(hud.detectMs, 1)}ms · {delegate}</div>
      <div>phase {hud.phase} · state {hud.repState}</div>
      <div>raw {round(hud.primaryRaw, 1)} · smooth {round(hud.primaryAngle, 1)}</div>
      <div>progress {round(hud.progress, 2)}</div>
      <div>visibility {round(hud.visibility, 2)} · side {hud.trackedSide ?? 'both'}</div>
      <div>faults {hud.faults.join(',') || '—'}</div>
      <button
        type="button"
        onClick={onRecord}
        className={cn('mt-1 w-full rounded px-2 py-1 font-sans text-xs font-semibold', recording ? 'bg-red-500 text-white' : 'bg-lime-300 text-black')}
      >
        {recording ? '■ Stop & download' : '● Record landmarks'}
      </button>
    </div>
  );
}
