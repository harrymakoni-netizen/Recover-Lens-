// Sidebar on ≥768 px, fixed bottom tab bar below (SPEC §7.1).
import { Activity, Dumbbell, HeartHandshake, House, Stethoscope, UsersRound } from 'lucide-react';
import { type ReactNode, type RefObject, Suspense, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { Patient } from '../../api/types';
import { useApi } from '../../hooks/useApi';
import { LANGUAGES, useApp } from '../../lib/appContext';
import { cn } from '../../lib/format';
import type { Lang } from '../../voice/phrases';
import { ConnectionDot } from './ConnectionDot';
import { DisplaySettingsButton } from './DisplaySettings';

const NAV = [
  { to: '/', icon: House, label: 'nav.home', short: 'nav.home', end: true },
  { to: '/caregiver', icon: HeartHandshake, label: 'nav.caregiver', short: 'nav.caregiver_short' },
  { to: '/sports', icon: Dumbbell, label: 'nav.sports', short: 'nav.sports_short' },
  { to: '/clinician', icon: Stethoscope, label: 'nav.clinician', short: 'nav.clinician_short' },
  { to: '/coach', icon: UsersRound, label: 'nav.coach', short: 'nav.coach_short' },
];

function Logo() {
  return (
    <div className="flex items-center gap-2 text-lg font-semibold">
      <Activity className="text-teal" size={24} strokeWidth={2.5} aria-hidden />
      RecoverLens
    </div>
  );
}

function UserPanel() {
  const { lang, setLang, t, patientId, setPatientId } = useApp();
  const { data: patients } = useApi<Patient[]>('/patients', { poll: false });
  return (
    <div className="space-y-3 border-t border-line p-4">
      <label className="block text-xs text-navy-soft">
        {t('viewing_as')}
        <select
          className="mt-1 block min-h-10 w-full rounded-lg border border-line-strong bg-white px-2 text-sm text-navy"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        >
          {(patients ?? [{ id: patientId, name: t('common.patient') } as Patient]).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-navy-soft">
        {t('language')}
        <select
          className="mt-1 block min-h-10 w-full rounded-lg border border-line-strong bg-white px-2 text-sm text-navy"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/**
 * Page title from the page's heading (WCAG 2.4.2), and after moving to another page, focus goes to
 * the main content so screen-reader users hear the new page instead of staying on the menu link.
 */
function usePageTitleAndFocus(main: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    const el = main.current;
    if (!el) return;
    const update = () => {
      const h1 = el.querySelector('h1')?.textContent?.trim();
      document.title = h1 ? `${h1} · RecoverLens` : 'RecoverLens';
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    if (first.current) first.current = false;
    else el.focus({ preventScroll: true });
    return () => observer.disconnect();
  }, [pathname, main]);
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { t, lang, setLang } = useApp();
  const main = useRef<HTMLElement | null>(null);
  usePageTitleAndFocus(main);
  return (
    <div className="min-h-full md:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-navy px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t('a11y.skip')}
      </a>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white md:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2" aria-label={t('nav.main')}>
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] transition-colors',
                  isActive ? 'bg-teal-soft font-medium text-teal-dark' : 'text-navy-soft hover:bg-page hover:text-navy',
                )
              }
            >
              <Icon size={20} aria-hidden />
              {t(label)}
            </NavLink>
          ))}
        </nav>
        <UserPanel />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header (connection dot; logo + language on phones) */}
        <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line bg-white/90 px-4 backdrop-blur md:bg-page md:px-8 md:backdrop-blur-none md:border-none">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ConnectionDot />
            <DisplaySettingsButton />
            <select
              aria-label={t('language')}
              className="min-h-10 rounded-lg border border-line-strong bg-white px-2 text-sm md:hidden"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.code.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main
          id="main"
          ref={main}
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 focus:outline-none md:px-8 md:pb-10"
        >{children ?? (
            <Suspense fallback={<div className="skeleton h-40 w-full" />}>
              <Outlet />
            </Suspense>
          )}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav
        aria-label={t('nav.main')}
        className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-white md:hidden"
      >
        {NAV.map(({ to, icon: Icon, short, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs',
                isActive ? 'font-semibold text-teal' : 'text-navy-soft',
              )
            }
          >
            <Icon size={22} aria-hidden />
            <span className="max-w-full truncate px-1">{t(short)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
