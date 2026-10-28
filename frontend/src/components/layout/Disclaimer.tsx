import { Link } from 'react-router-dom';
import { useApp } from '../../lib/appContext';

/** The one muted disclaimer line (SPEC §8.1), with the privacy page. No gating, no banners. */
export function Disclaimer() {
  const { t } = useApp();
  return (
    <p className="mt-8 text-center text-xs text-navy-soft">
      {t('disclaimer')}{' '}
      <Link to="/privacy" className="inline-flex min-h-6 items-center underline underline-offset-2 hover:text-navy">
        {t('priv.link')}
      </Link>
    </p>
  );
}
