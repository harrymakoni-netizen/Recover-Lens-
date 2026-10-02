import { useSyncState } from '../../api/syncStatus';
import { useApp } from '../../lib/appContext';
import { cn } from '../../lib/format';

/** Green "Synced" / grey "Offline — N waiting to sync" (SPEC §8.7). Never "Reconnecting". */
export function ConnectionDot({ className }: { className?: string }) {
  const { online, pending } = useSyncState();
  const { t } = useApp();
  const synced = online && pending === 0;
  const label = synced
    ? t('synced')
    : online
      ? t('waiting_to_sync', { n: pending })
      : `${t('offline')}${pending ? ` — ${t('waiting_to_sync', { n: pending })}` : ''}`;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-navy-soft', className)} role="status">
      <span className={cn('h-2 w-2 rounded-full', synced ? 'bg-emerald-500' : 'bg-gray-400')} aria-hidden />
      {label}
    </span>
  );
}
