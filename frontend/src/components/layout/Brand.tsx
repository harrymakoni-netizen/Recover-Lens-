// The RecoverLens logo: the mark (from the brand artwork) and the wordmark set in Outfit.
import { cn } from '../../lib/format';

/** `onDark` uses the version of the mark drawn for navy backgrounds. Decorative: the name is text. */
export function BrandMark({ size = 36, onDark, className }: { size?: number; onDark?: boolean; className?: string }) {
  return (
    <img
      src={onDark ? '/brand/mark-dark.webp' : '/brand/mark.webp'}
      alt=""
      width={Math.round(size * 1.13)}
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
