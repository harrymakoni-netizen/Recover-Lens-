import { Link } from 'react-router-dom';
import { useApp } from '../lib/appContext';

export default function NotFound() {
  const { t } = useApp();
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold">{t('common.page_not_found')}</h1>
      <Link to="/" className="font-medium text-teal underline">
        {t('common.back_home')}
      </Link>
    </div>
  );
}
