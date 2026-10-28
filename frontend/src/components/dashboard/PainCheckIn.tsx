// Pain check-in before starting (SPEC §8.1). The only allowed interruption, and it is about
// safety: high pain shows advice with "Continue anyway" / "Skip today". It never blocks.
import { AlertTriangle, Play, Weight } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../lib/appContext';
import { LOAD_CHOICES } from '../../pose/effort';
import { cn } from '../../lib/format';
import { Button, Modal, PainSlider } from '../ui';

export interface CheckInResult {
  pain: number;
  redFlags: boolean;
  confirmedByPatient: boolean;
  /** One arm chosen for a two-arm exercise; undefined = both. */
  side?: 'left' | 'right';
  /** Weight held in the hand, kg (0 = nothing). */
  loadKg?: number;
}

export function PainCheckIn({
  open,
  exerciseName,
  caregiver,
  armChoice,
  loadChoice,
  onStart,
  onClose,
}: {
  open: boolean;
  exerciseName: string;
  caregiver?: boolean;
  /** Offer Both / Left / Right (shoulder rehab is usually one arm). */
  armChoice?: boolean;
  /** Ask what is held in the hand (exercises with a joint-load estimate). */
  loadChoice?: boolean;
  onStart: (r: CheckInResult) => void;
  onClose: () => void;
}) {
  const { t } = useApp();
  const [pain, setPain] = useState(2);
  const [redFlags, setRedFlags] = useState<boolean | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [advise, setAdvise] = useState(false);
  const [arm, setArm] = useState<'both' | 'left' | 'right'>('both');
  const [load, setLoad] = useState<number>(0);

  const close = () => {
    setAdvise(false);
    onClose();
  };

  const start = () =>
    onStart({
      pain,
      redFlags: !!redFlags,
      confirmedByPatient: !caregiver || confirmed,
      side: armChoice && arm !== 'both' ? arm : undefined,
      loadKg: loadChoice ? load : undefined,
    });

  const next = () => {
    if (pain >= 8 || redFlags) setAdvise(true);
    else start();
  };

  return (
    <Modal open={open} onClose={close} title={advise ? t('pain.before_title') : t('pain.title', { exercise: exerciseName })}>
      {advise ? (
        <div>
          <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
            <AlertTriangle className="shrink-0" />
            <p>{t('pain.advice')}</p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={close}>
              {t('pain.skip_today')}
            </Button>
            <Button variant={caregiver ? 'care' : 'primary'} className="flex-1" onClick={start}>
              {t('pain.continue_anyway')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {armChoice && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-navy-soft">{t('pain.which_arm')}</legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['both', t('pain.both_arms')],
                    ['left', caregiver ? t('pain.their_left') : t('pain.left_arm')],
                    ['right', caregiver ? t('pain.their_right') : t('pain.right_arm')],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={arm === value}
                    onClick={() => setArm(value)}
                    className={cn(
                      'min-h-12 rounded-xl border text-sm font-medium',
                      arm === value ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line bg-white',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {loadChoice && (
            <fieldset>
              <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-navy-soft">
                <Weight size={16} aria-hidden /> {caregiver ? t('load.question_cg') : t('load.question')}
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {LOAD_CHOICES.map((kg) => (
                  <button
                    key={kg}
                    type="button"
                    aria-pressed={load === kg}
                    onClick={() => setLoad(kg)}
                    className={cn(
                      'min-h-12 rounded-xl border px-2 text-sm font-medium',
                      load === kg ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line bg-white',
                    )}
                  >
                    {kg === 0 ? t('load.none') : kg === 0.5 ? t('load.bottle') : t('load.kg', { n: kg })}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <PainSlider value={pain} onChange={setPain} label={caregiver ? t('pain.now_cg') : t('pain.now')} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-navy-soft">{t('pain.red_flags')}</legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: false, label: t('common.no') },
                { v: true, label: t('common.yes') },
              ].map(({ v, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={redFlags === v}
                  onClick={() => setRedFlags(v)}
                  className={cn(
                    'min-h-12 rounded-xl border text-base font-medium',
                    redFlags === v ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line bg-white',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {caregiver && (
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="h-6 w-6 shrink-0 accent-[var(--color-care)]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              {t('common.confirmed_by_patient')}
            </label>
          )}
          <Button variant={caregiver ? 'care' : 'primary'} size="lg" className="w-full" onClick={next} disabled={redFlags === null}>
            <Play size={18} /> {t('home.start_exercise')}
          </Button>
        </div>
      )}
    </Modal>
  );
}
