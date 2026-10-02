import { X } from 'lucide-react';
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useId, useRef } from 'react';
import { cn } from '../../lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'care';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-teal text-white hover:bg-teal-dark disabled:bg-teal/50',
  secondary: 'bg-white text-navy border border-line hover:bg-page disabled:text-navy/40',
  ghost: 'text-navy hover:bg-navy/5',
  danger: 'bg-alert text-white hover:bg-alert/90',
  care: 'bg-care text-white hover:bg-care/90',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed',
        size === 'sm' && 'min-h-9 px-3 text-sm',
        size === 'md' && 'min-h-11 px-4',
        size === 'lg' && 'min-h-14 px-6 text-lg',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('min-w-0 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5', className)}>{children}</div>;
}

export function CardTitle({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {icon && <span className="text-teal">{icon}</span>}
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'review' | 'alert' | 'teal' | 'care'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-navy/5 text-navy-soft',
    good: 'bg-emerald-50 text-emerald-700',
    review: 'bg-amber-50 text-amber-700',
    alert: 'bg-alert-soft text-alert',
    teal: 'bg-teal-soft text-teal-dark',
    care: 'bg-care-soft text-care',
  } as const;
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4', className)} />;
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-navy-soft">
      {icon && <div className="text-navy/30">{icon}</div>}
      <p className="font-medium text-navy">{title}</p>
      {children && <div className="text-sm">{children}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input,select,button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button type="button" aria-label="Close" className="rounded-lg p-2 hover:bg-page" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PainSlider({
  value,
  onChange,
  label = 'Pain level',
  dark,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  dark?: boolean;
}) {
  const id = useId();
  const tone = value >= 8 ? 'text-alert' : value >= 4 ? 'text-amber-500' : 'text-teal';
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className={cn('text-sm font-medium', dark ? 'text-white/80' : 'text-navy-soft')}>
          {label} <span className="font-normal opacity-70">(0 = none, 10 = worst)</span>
        </label>
        <span className={cn('text-2xl font-semibold tabular-nums', tone)}>{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full"
      />
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl bg-page p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-navy-soft">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums', tone)}>{value}</div>
      {sub && <div className="text-xs text-navy-soft">{sub}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-navy-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-navy-soft">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full min-h-11 rounded-xl border border-line bg-white px-3 text-navy placeholder:text-navy/40 focus:border-teal focus:outline-none';
