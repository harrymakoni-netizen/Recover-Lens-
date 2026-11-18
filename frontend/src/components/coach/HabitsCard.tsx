// Daily habits on Home (SPEC §17.10): sleep, water, fruit and vegetables, a walk. The person chooses
// which to follow and their own goals. Saved on this device; a habit reaches the physiotherapist only
// when its "share" switch is on. A missed day never resets progress: runs pause on a rest day.
import { Apple, CalendarCheck, ChevronDown, Footprints, GlassWater, Minus, Moon, Plus, Settings2, ShieldCheck, Trash2 } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { HABIT_IDS, HABITS, type HabitId, type HabitPrefs, summarise } from '../../coach';
import type { useHabits } from '../../hooks/useHabits';
import { useApp } from '../../lib/appContext';
import { cn } from '../../lib/format';
import { Button, Card, CardTitle } from '../ui';

const ICONS: Record<HabitId, ReactNode> = {
  sleep: <Moon size={18} aria-hidden />,
  water: <GlassWater size={18} aria-hidden />,
  veg: <Apple size={18} aria-hidden />,
  walk: <Footprints size={18} aria-hidden />,
};

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm text-navy-soft"
    >
      <span aria-hidden className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', on ? 'bg-teal' : 'bg-navy/25')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', on ? 'left-[1.125rem]' : 'left-0.5')} />
      </span>
      {label}
    </button>
  );
}

export function HabitsCard({ habits }: { habits: ReturnType<typeof useHabits> }) {
  const { t } = useApp();
  const { prefs, logs, today, share, updatePrefs, setValue, deleteAll } = habits;
  const [settings, setSettings] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [picked, setPicked] = useState<HabitId[]>(['sleep', 'water']);
  const settingsId = useId();
  const summaries = summarise(logs, prefs, today);
  const unit = (id: HabitId, v: number) => t(v === 1 ? `habit.unit1.${HABITS[id].unit}` : `habit.unit.${HABITS[id].unit}`, { n: v });
  const patch = (p: Partial<HabitPrefs>) => updatePrefs({ ...prefs, ...p });
  const anyShared = prefs.enabled.some((h) => prefs.share[h]);

  // First visit: choose habits. Nothing is assumed for the person.
  if (prefs.enabled.length === 0) {
    return (
      <Card>
        <CardTitle icon={<CalendarCheck size={18} />}>{t('habit.title')}</CardTitle>
        <p className="text-navy-soft">{t('habit.intro')}</p>
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium text-navy-soft">{t('habit.choose')}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {HABIT_IDS.map((id) => {
              const on = picked.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked(on ? picked.filter((x) => x !== id) : [...picked, id])}
                  className={cn(
                    'flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium',
                    on ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line bg-white',
                  )}
                >
                  {ICONS[id]} {t(`habit.name.${id}`)}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Button className="mt-4 w-full sm:w-auto" disabled={picked.length === 0} onClick={() => patch({ enabled: HABIT_IDS.filter((h) => picked.includes(h)) })}>
          {t('habit.start')}
        </Button>
        <p className="mt-3 flex items-start gap-2 text-xs text-navy-soft">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden /> {t('habit.privacy')}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle
        icon={<CalendarCheck size={18} />}
        action={
          <button
            type="button"
            aria-expanded={settings}
            aria-controls={settingsId}
            onClick={() => setSettings(!settings)}
            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-sm font-medium text-navy-soft hover:bg-navy/5"
          >
            <Settings2 size={16} aria-hidden /> {t('habit.settings')}
            <ChevronDown size={16} aria-hidden className={cn('transition-transform', settings && 'rotate-180')} />
          </button>
        }
      >
        {t('habit.title')}
      </CardTitle>

      <ul className="space-y-3">
        {summaries.map((s) => {
          const def = HABITS[s.id];
          const v = s.today;
          const step = (dir: 1 | -1) => setValue(s.id, v === undefined ? (dir > 0 ? s.target : s.target - def.step) : v + dir * def.step);
          return (
            <li key={s.id} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal">{ICONS[s.id]}</span>
                  <div className="min-w-0">
                    <div className="font-medium">{t(`habit.today.${s.id}`)}</div>
                    <div className="text-xs text-navy-soft">{t('habit.goal', { goal: unit(s.id, s.target) })}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2" role="group" aria-label={t(`habit.today.${s.id}`)}>
                  <button
                    type="button"
                    aria-label={t('habit.less', { habit: t(`habit.name.${s.id}`) })}
                    onClick={() => step(-1)}
                    disabled={v !== undefined && v <= def.min}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-line-strong bg-white disabled:opacity-40"
                  >
                    <Minus size={18} aria-hidden />
                  </button>
                  <output aria-live="polite" className={cn('min-w-[5.5rem] text-center font-semibold tabular-nums', v === undefined && 'text-navy-soft')}>
                    {v === undefined ? t('habit.not_logged') : unit(s.id, v)}
                  </output>
                  <button
                    type="button"
                    aria-label={t('habit.more', { habit: t(`habit.name.${s.id}`) })}
                    onClick={() => step(1)}
                    disabled={v !== undefined && v >= def.max}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-line-strong bg-white disabled:opacity-40"
                  >
                    <Plus size={18} aria-hidden />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-1.5" role="img" aria-label={t('habit.week_label', { met: s.thisWeek })}>
                  {s.week.map((m, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-3.5 w-3.5 rounded-full border',
                        m === true ? 'border-teal bg-teal' : m === false ? 'border-amber-500 bg-amber-100' : 'border-line-strong bg-white',
                      )}
                    />
                  ))}
                </div>
                <p className="text-sm text-navy-soft">
                  {t('habit.this_week', { met: s.thisWeek })}
                  {s.run > 0 && ` · ${s.paused ? t('habit.run_paused', { n: s.run }) : t('habit.run', { n: s.run })}`}
                  {s.run === 0 && s.keptDays > 0 && ` · ${t('habit.kept', { n: s.keptDays })}`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-navy-soft">{t('habit.no_reset')}</p>

      {settings && (
        <div id={settingsId} className="mt-4 space-y-4 rounded-xl bg-page p-4">
          {HABIT_IDS.map((id) => {
            const on = prefs.enabled.includes(id);
            return (
              <div key={id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <Switch on={on} label={t(`habit.follow`, { habit: t(`habit.name.${id}`) })} onChange={(v) => patch({ enabled: v ? HABIT_IDS.filter((h) => h === id || prefs.enabled.includes(h)) : prefs.enabled.filter((h) => h !== id) })} />
                {on && (
                  <div className="mt-1 space-y-2 pl-1">
                    <fieldset>
                      <legend className="mb-1 text-xs font-medium text-navy-soft">{t('habit.goal_label')}</legend>
                      <div className="flex flex-wrap gap-2">
                        {HABITS[id].targets.map((g) => (
                          <button
                            key={g}
                            type="button"
                            aria-pressed={prefs.targets[id] === g}
                            onClick={() => patch({ targets: { ...prefs.targets, [id]: g } })}
                            className={cn(
                              'min-h-10 rounded-lg border px-3 text-sm',
                              prefs.targets[id] === g ? 'border-teal bg-teal-soft font-medium text-teal-dark' : 'border-line bg-white',
                            )}
                          >
                            {unit(id, g)}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <Switch on={prefs.share[id]} label={t('habit.share')} onChange={(v) => patch({ share: { ...prefs.share, [id]: v } })} />
                  </div>
                )}
              </div>
            );
          })}
          <p className="flex items-start gap-2 text-xs text-navy-soft">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {t('habit.privacy')}
              {anyShared && share !== 'idle' && ` ${t(`habit.share_state.${share}`)}`}
            </span>
          </p>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2" role="alert">
              <span className="text-sm text-navy">{t('habit.delete_confirm')}</span>
              <Button size="sm" variant="danger" onClick={() => void deleteAll().then(() => setConfirmDelete(false))}>
                {t('habit.delete_yes')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden /> {t('habit.delete')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
