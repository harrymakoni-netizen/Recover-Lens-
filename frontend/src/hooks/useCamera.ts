// getUserMedia wrapper with clear error states (SPEC §14: camera denied → clear message).
import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'starting' | 'ready' | 'denied' | 'notfound' | 'insecure' | 'error';
export type FacingMode = 'user' | 'environment';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [error, setError] = useState<string | null>(null);

  const fileUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = null;
    }
  }, []);

  /**
   * Play a recorded video through the same pipeline instead of the live camera (testing, or a
   * demo backup when the venue camera or lighting fails). Not mirrored.
   */
  const startFile = useCallback(
    async (file: File) => {
      stop();
      const video = videoRef.current;
      if (!video) return;
      setStatus('starting');
      const url = URL.createObjectURL(file);
      fileUrlRef.current = url;
      video.srcObject = null;
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      try {
        await video.play();
        setFacingMode('environment');
        setStatus('ready');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [stop],
  );

  const start = useCallback(
    async (facing: FacingMode = facingMode) => {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setStatus('insecure');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('notfound');
        return;
      }
      stop();
      setStatus('starting');
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          await video.play().catch(() => undefined);
        }
        setFacingMode(facing);
        setStatus('ready');
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') setStatus('denied');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setStatus('notfound');
        else setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [facingMode, stop],
  );

  const switchCamera = useCallback(() => start(facingMode === 'user' ? 'environment' : 'user'), [facingMode, start]);

  useEffect(() => stop, [stop]);

  /** Stop and go back to the not-started state (e.g. to pick another video). */
  const reset = useCallback(() => {
    stop();
    videoRef.current?.removeAttribute('src');
    setError(null);
    setStatus('idle');
  }, [stop]);

  return { videoRef, status, facingMode, error, start, startFile, stop, reset, switchCamera };
}
