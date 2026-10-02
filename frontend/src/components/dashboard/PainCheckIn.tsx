// Pain check-in before starting (SPEC §8.1). The only allowed interruption, and it is about
// safety: high pain shows advice with "Continue anyway" / "Skip today". It never blocks.
import { AlertTriangle, Play } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/format';
import { Button, Modal, PainSlider } from '../ui';

export interface CheckInResult {
  pain: number;
  redFlags: boolean;
  confirmedByPatient: boolean;
}

export function PainCheckIn({
  open,
  exerciseName,
  caregiver,
  onStart,
  onClose,
}: {
  open: boolean;
  exerciseName: string;
  caregiver?: boolean;
  onStart: (r: CheckInResult) => void;
  onClose: () => void;
}) {
  const [pain, setPain] = useState(2);
  const [redFlags, setRedFlags] = useState<boolean | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [advise, setAdvise] = useState(false);

  const close = () => {
    setAdvise(false);
    onClose();
  };

  const start = () => onStart({ pain, redFlags: !!redFlags, confirmedByPatient: !caregiver || confirmed });

  const next = () => {
    if (pain >= 8 || redFlags) setAdvise(true);
    else start();
  };

  return (
    <Modal open={open} onClose={close} title={advise ? 'Before you exercise' : `Pain check-in · ${exerciseName}`}>
      {advise ? (
        <div>
          <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
            <AlertTriangle className="shrink-0" />
            <p>We recommend contacting your physiotherapist before exercising today.</p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={close}>
              Skip today
            </Button>
            <Button variant={caregiver ? 'care' : 'primary'} className="flex-1" onClick={start}>
              Continue anyway
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <PainSlider value={pain} onChange={setPain} label={caregiver ? 'Their pain right now' : 'Your pain right now'} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-navy-soft">Any swelling, numbness or sharp pain?</legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: false, label: 'No' },
                { v: true, label: 'Yes' },
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
              <input type="checkbox" className="h-5 w-5 accent-[#E07A10]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              Confirmed by patient
            </label>
          )}
          <Button variant={caregiver ? 'care' : 'primary'} size="lg" className="w-full" onClick={next} disabled={redFlags === null}>
            <Play size={18} /> Start Exercise
          </Button>
        </div>
      )}
    </Modal>
  );
}
