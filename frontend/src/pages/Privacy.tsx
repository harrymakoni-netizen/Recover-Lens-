// Privacy: what RecoverLens keeps, where, and who sees it (SPEC §10), in plain words.
import { Brain, CloudOff, Database, Eye, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Card } from '../components/ui';
import { useApp } from '../lib/appContext';

const SECTIONS = [
  { icon: ShieldCheck, key: 'priv.video' },
  { icon: Database, key: 'priv.data' },
  { icon: Eye, key: 'priv.who' },
  { icon: CloudOff, key: 'priv.offline' },
  { icon: Brain, key: 'priv.ai' },
  { icon: SlidersHorizontal, key: 'priv.choices' },
] as const;

export default function Privacy() {
  const { t } = useApp();
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('priv.title')}</h1>
      <p className="mt-2 text-lg text-navy-soft">{t('priv.intro')}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ icon: Icon, key }) => (
          <Card key={key}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-soft text-teal" aria-hidden>
              <Icon size={20} />
            </span>
            <h2 className="mt-3 text-lg font-semibold">{t(`${key}_title`)}</h2>
            <p className="mt-1 text-navy-soft">{t(`${key}_body`)}</p>
          </Card>
        ))}
      </div>
      <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{t('priv.demo')}</p>
    </div>
  );
}
