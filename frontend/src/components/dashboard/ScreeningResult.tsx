import { CheckCircle2, Eye } from 'lucide-react';
import type { Observation } from '../../api/types';
import { cn } from '../../lib/format';

/** Observation list: Good / Review with icon + label, never colour alone. */
export function ObservationList({ observations, dark }: { observations: Observation[]; dark?: boolean }) {
  if (observations.length === 0) {
    return <p className={dark ? 'text-white/70' : 'text-navy-soft'}>No measurable reps were recorded in this screening.</p>;
  }
  return (
    <ul className="space-y-2">
      {observations.map((o) => (
        <li
          key={o.id}
          className={cn(
            'rounded-xl border p-3',
            dark
              ? o.status === 'review'
                ? 'border-amber-400/40 bg-amber-400/10'
                : 'border-white/10 bg-white/5'
              : o.status === 'review'
                ? 'border-amber-200 bg-amber-50'
                : 'border-line bg-white',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={cn('text-xs font-medium uppercase tracking-wide', dark ? 'text-white/60' : 'text-navy-soft')}>{o.label}</div>
              <div className="font-medium">{o.detail}</div>
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                o.status === 'review' ? 'bg-amber-400 text-amber-950' : dark ? 'bg-emerald-400/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
              )}
            >
              {o.status === 'review' ? <Eye size={12} /> : <CheckCircle2 size={12} />}
              {o.status === 'review' ? 'Review' : 'Good'}
            </span>
          </div>
          {o.recommendation && <p className={cn('mt-1.5 text-sm', dark ? 'text-white/75' : 'text-navy-soft')}>{o.recommendation}</p>}
        </li>
      ))}
    </ul>
  );
}
