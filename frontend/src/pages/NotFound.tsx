import { Link } from 'react-router-dom';
import { Empty } from '../components/ui';
import { useApp } from '../lib/appContext';

export default function NotFound() {
  const { t } = useApp();
  return (
    <Empty title={t('common.page_not_found')}>
      <Link to="/" className="text-teal underline">
        {t('common.back_home')}
      </Link>
    </Empty>
  );
}
