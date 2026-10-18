import { Camera, CameraOff, Film, Lock, ShieldCheck } from 'lucide-react';
import type { CameraStatus } from '../../hooks/useCamera';
import { useApp } from '../../lib/appContext';
import { Button } from '../ui';

/** "Chrome / Android: tap …" with the browser name in bold. */
function BrowserTip({ text }: { text: string }) {
  const i = text.indexOf(': ');
  if (i < 0) return <li>{text}</li>;
  return (
    <li>
      <b>{text.slice(0, i + 1)}</b> {text.slice(i + 2)}
    </li>
  );
}

/** Shown while asking for camera permission, and for every camera error (SPEC §10, §14). */
export function CameraMessage({
  status,
  exerciseName,
  steps,
  onStart,
  onFile,
  onRetry,
  caregiver,
  modelError,
}: {
  status: CameraStatus | 'intro';
  exerciseName: string;
  steps: string[];
  onStart?: () => void;
  onRetry?: () => void;
  caregiver?: boolean;
  modelError?: string | null;
  /** Test/demo mode: pick a recorded video instead of starting the camera. */
  onFile?: (file: File) => void;
}) {
  const { t } = useApp();
  const accent = caregiver ? 'text-care' : 'text-good';
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[#0b0d10] p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        {status === 'intro' || status === 'idle' || status === 'starting' ? (
          <>
            <div className={`mb-3 text-[11px] font-semibold tracking-[0.2em] ${accent}`}>
              {caregiver ? t('common.caregiver_mode') : t('hud.title')}
            </div>
            <h1 className="text-2xl font-semibold">{exerciseName}</h1>
            <ol className="mt-4 space-y-2 text-white/85">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">{steps.length + 1}</span>
                <span>{caregiver ? t('cam.stand_back_cg') : t('cam.stand_back')}</span>
              </li>
            </ol>
            <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {caregiver ? t('cam.safety_cg') : t('cam.safety')}
            </p>
            <p className="mt-3 flex gap-2 text-sm text-white/70">
              <ShieldCheck size={18} className="shrink-0 text-good" /> {t('cam.privacy')}
            </p>
            {status === 'starting' ? (
              <p className="mt-5 flex items-center gap-2 text-white/80">
                <Camera size={18} className="animate-pulse" /> {t('cam.waiting')}
              </p>
            ) : onFile ? (
              <label className="mt-5 flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal px-6 text-lg font-medium text-white hover:bg-teal-dark">
                <Film size={20} /> {t('cam.choose_video')}
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                  }}
                />
              </label>
            ) : (
              <Button variant={caregiver ? 'care' : 'primary'} size="lg" className="mt-5 w-full" onClick={onStart}>
                <Camera size={20} /> {t('cam.start')}
              </Button>
            )}
          </>
        ) : (
          <>
            <CameraOff size={36} className="mb-3 text-warn" />
            {status === 'denied' && (
              <>
                <h1 className="text-xl font-semibold">{t('cam.denied_title')}</h1>
                <p className="mt-2 text-white/80">{t('cam.denied_body')}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
                  <BrowserTip text={t('cam.denied_chrome')} />
                  <BrowserTip text={t('cam.denied_safari')} />
                  <li>{t('cam.denied_then')}</li>
                </ul>
              </>
            )}
            {status === 'notfound' && (
              <>
                <h1 className="text-xl font-semibold">{t('cam.notfound_title')}</h1>
                <p className="mt-2 text-white/80">{t('cam.notfound_body')}</p>
              </>
            )}
            {status === 'insecure' && (
              <>
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                  <Lock size={20} /> {t('cam.insecure_title')}
                </h1>
                <p className="mt-2 text-white/80">{t('cam.insecure_body')}</p>
              </>
            )}
            {status === 'error' && (
              <>
                <h1 className="text-xl font-semibold">{t('cam.error_title')}</h1>
                <p className="mt-2 text-white/80">{t('cam.error_body')}</p>
              </>
            )}
            {modelError && <p className="mt-3 text-sm text-red-300">{t('cam.model_error', { error: modelError })}</p>}
            <Button size="lg" className="mt-5 w-full" onClick={onRetry}>
              {t('common.try_again')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
