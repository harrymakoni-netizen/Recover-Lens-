// The RecoverLens logo: the pulse-line tile (public/brand/mark*.svg) and the wordmark set in Outfit.
import { cn } from '../../lib/format';

/** `onDark` drops the hairline edge the tile needs on light backgrounds. Decorative: the name is text. */
export function BrandMark({ size = 36, onDark, className }: { size?: number; onDark?: boolean; className?: string }) {
  return (
    <img
      src={onDark ? '/brand/mark-dark.svg' : '/brand/mark.svg'}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 select-none', className)}
      draggable={false}
    />
  );
}

export function Wordmark({ onDark, className }: { onDark?: boolean; className?: string }) {
  return (
    <span className={cn('font-bold tracking-tight', onDark ? 'text-white' : 'text-brand', className)}>
      Recover<span className={onDark ? 'text-mint' : 'text-teal'}>Lens</span>
    </span>
  );
}

export function Logo({ onDark, size = 36, compact }: { onDark?: boolean; size?: number; compact?: boolean }) {
  return (
    <span className={cn('flex items-center', compact ? 'gap-2' : 'gap-2.5')}>
      <BrandMark size={size} onDark={onDark} />
      <Wordmark onDark={onDark} className={compact ? 'text-[1.05rem]' : 'text-[1.3rem]'} />
    </span>
  );
}

/** The pulse line on its own, drawn in the current text colour (decorative watermarks). */
export function PulseLine({ className, strokeWidth = 6.3 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="10 10 80 80" className={className} aria-hidden focusable="false">
      <path
        d="M16.7 50.3H28.7L40.8 19.9L59.9 80.4L69.9 50.3H83.8"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
