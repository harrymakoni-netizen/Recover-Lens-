import { useApp } from '../../lib/appContext';

/** The one muted disclaimer line (SPEC §8.1). No gating, no banners. */
export function Disclaimer() {
  const { t } = useApp();
  return <p className="mt-8 text-center text-xs text-navy-soft/80">{t('disclaimer')}</p>;
}
