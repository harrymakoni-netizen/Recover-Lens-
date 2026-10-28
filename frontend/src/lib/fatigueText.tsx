// Words for fatigue signs (pose/fatigue.ts), shared by the summary card, Home and Patient Detail.
import { BatteryMedium } from 'lucide-react';
import { Badge } from '../components/ui';
import type { T } from '../i18n';
import { FATIGUE_THRESHOLDS, type FatigueLevel } from '../pose/fatigue';
import { useApp } from './appContext';

export interface FatigueValues {
  level: FatigueLevel | null | undefined;
  slowerPct?: number | null;
  shorterPct?: number | null;
  formPoints?: number | null;
}

/** "Slight: reps slowed 22%" / "None: the reps stayed steady." */
export function fatigueLine(t: T, f: FatigueValues): string {
  if (!f.level) return '';
  if (f.level === 'none') return t('fatigue.none_line');
  const parts: string[] = [];
  if ((f.slowerPct ?? 0) >= FATIGUE_THRESHOLDS.slowerPct) parts.push(t('fatigue.slower', { n: f.slowerPct ?? 0 }));
  if ((f.shorterPct ?? 0) >= FATIGUE_THRESHOLDS.shorterPct) parts.push(t('fatigue.shorter', { n: f.shorterPct ?? 0 }));
  if ((f.formPoints ?? 0) >= FATIGUE_THRESHOLDS.formPoints) parts.push(t('fatigue.form', { n: f.formPoints ?? 0 }));
  return t('fatigue.line', { level: t(`fatigue.${f.level}`), details: parts.join(', ') });
}

/** Small badge; nothing for steady sessions unless `showNone`. */
export function FatigueBadge({ level, showNone, details }: { level?: FatigueLevel | null; showNone?: boolean; details?: string }) {
  const { t } = useApp();
  if (!level || (level === 'none' && !showNone)) return null;
  return (
    <Badge tone={level === 'clear' ? 'alert' : level === 'slight' ? 'review' : 'good'}>
      <BatteryMedium size={13} aria-hidden />
      {t(`fatigue.badge_${level}`)}
      {details && <span className="sr-only">: {details}</span>}
    </Badge>
  );
}
