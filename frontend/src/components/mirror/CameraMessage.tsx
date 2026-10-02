import { Camera, CameraOff, Lock, ShieldCheck } from 'lucide-react';
import type { CameraStatus } from '../../hooks/useCamera';
import { Button } from '../ui';

const PRIVACY = 'Your video stays on this phone. Only your exercise scores are shared with your physiotherapist.';
const SAFETY = 'Stop if you feel sharp pain, dizziness or numbness.';

/** Shown while asking for camera permission, and for every camera error (SPEC §10, §14). */
export function CameraMessage({
  status,
  exerciseName,
  steps,
  onStart,
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
}) {
  const accent = caregiver ? 'text-care' : 'text-good';
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[#0b0d10] p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        {status === 'intro' || status === 'idle' || status === 'starting' ? (
          <>
            <div className={`mb-3 text-[11px] font-semibold tracking-[0.2em] ${accent}`}>
              {caregiver ? 'CAREGIVER MODE' : 'AI REHAB MIRROR'}
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
                <span>Stand 2–3 metres back so your whole body is visible.</span>
              </li>
            </ol>
            <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{SAFETY}</p>
            <p className="mt-3 flex gap-2 text-sm text-white/70">
              <ShieldCheck size={18} className="shrink-0 text-good" /> {PRIVACY}
            </p>
            {status === 'starting' ? (
              <p className="mt-5 flex items-center gap-2 text-white/80">
                <Camera size={18} className="animate-pulse" /> Waiting for camera permission…
              </p>
            ) : (
              <Button variant={caregiver ? 'care' : 'primary'} size="lg" className="mt-5 w-full" onClick={onStart}>
                <Camera size={20} /> Start camera
              </Button>
            )}
          </>
        ) : (
          <>
            <CameraOff size={36} className="mb-3 text-warn" />
            {status === 'denied' && (
              <>
                <h1 className="text-xl font-semibold">Camera access is blocked</h1>
                <p className="mt-2 text-white/80">RecoverLens needs the camera to see your movement. To allow it:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
                  <li><b>Chrome / Android:</b> tap the lock or camera icon in the address bar → Permissions → Camera → Allow.</li>
                  <li><b>Safari / iPhone:</b> tap “aA” in the address bar → Website Settings → Camera → Allow.</li>
                  <li>Then tap Try again below.</li>
                </ul>
              </>
            )}
            {status === 'notfound' && (
              <>
                <h1 className="text-xl font-semibold">No camera found</h1>
                <p className="mt-2 text-white/80">Connect a camera, or open RecoverLens on a phone, then try again.</p>
              </>
            )}
            {status === 'insecure' && (
              <>
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                  <Lock size={20} /> Secure connection needed
                </h1>
                <p className="mt-2 text-white/80">
                  Browsers only allow the camera on <b>https://</b> pages (or localhost). Open the deployed HTTPS link instead.
                </p>
              </>
            )}
            {status === 'error' && (
              <>
                <h1 className="text-xl font-semibold">The camera could not start</h1>
                <p className="mt-2 text-white/80">Close other apps that may be using the camera, then try again.</p>
              </>
            )}
            {modelError && <p className="mt-3 text-sm text-red-300">Pose model failed to load: {modelError}</p>}
            <Button size="lg" className="mt-5 w-full" onClick={onRetry}>
              Try again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
