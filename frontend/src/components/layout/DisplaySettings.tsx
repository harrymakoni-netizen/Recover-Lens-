// "Display and reading" settings for people with low vision (WCAG 2.2): text size and contrast.
import { Eye, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../lib/appContext';
import type { TextSize } from '../../lib/display';
import { cn } from '../../lib/format';
import { Modal } from '../ui';

const SIZES: Array<{ value: TextSize; label: string; sample: string }> = [
  { value: 'normal', label: 'a11y.size_normal', sample: 'text-base' },
  { value: 'large', label: 'a11y.size_large', sample: 'text-lg' },
  { value: 'xl', label: 'a11y.size_xl', sample: 'text-xl' },
];

export function DisplaySettingsButton({ className }: { className?: string }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-2.5 text-sm text-navy hover:bg-page',
          className,
        )}
      >
        <Eye size={18} aria-hidden />
        <span className="hidden sm:inline">{t('a11y.display')}</span>
        <span className="sr-only sm:hidden">{t('a11y.display')}</span>
      </button>
      <DisplaySettingsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function DisplaySettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, display, setDisplay } = useApp();
  return (
    <Modal open={open} onClose={onClose} title={t('a11y.display')}>
      <fieldset>
        <legend className="mb-2 font-medium">{t('a11y.text_size')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {SIZES.map((s) => (
            <label
              key={s.value}
              className={cn(
                'flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-2 py-2 text-center has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal',
                display.textSize === s.value ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line-strong text-navy',
              )}
            >
              <input
                type="radio"
                name="text-size"
                value={s.value}
                checked={display.textSize === s.value}
                onChange={() => setDisplay({ ...display, textSize: s.value })}
                className="sr-only"
              />
              <span aria-hidden className={cn('font-semibold leading-none', s.sample)}>
                Aa
              </span>
              <span className="mt-1 text-sm">{t(s.label)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={display.highContrast}
          onChange={(e) => setDisplay({ ...display, highContrast: e.target.checked })}
          className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-teal)]"
        />
        <span>
          <span className="block font-medium">{t('a11y.contrast')}</span>
          <span className="block text-sm text-navy-soft">{t('a11y.contrast_hint')}</span>
        </span>
      </label>

      <p className="mt-5 flex items-start gap-3 rounded-xl bg-page p-3 text-sm text-navy-soft">
        <Volume2 size={20} className="mt-0.5 shrink-0 text-teal" aria-hidden />
        {t('a11y.voice_note')}
      </p>
    </Modal>
  );
}
