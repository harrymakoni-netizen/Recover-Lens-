// <video> + <canvas> aligned to the rendered video rectangle (SPEC §7.2).
// Video uses object-fit: contain so the whole frame (head to feet) is always visible.
import { type MutableRefObject, type ReactNode, useEffect, useRef } from 'react';

interface Props {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  mirrored: boolean;
  children?: ReactNode;
}

/** The rectangle the video actually occupies inside its container with object-fit: contain. */
export function containRect(cw: number, ch: number, vw: number, vh: number) {
  if (!vw || !vh || !cw || !ch) return { left: 0, top: 0, width: cw, height: ch };
  const scale = Math.min(cw / vw, ch / vh);
  const width = vw * scale;
  const height = vh * scale;
  return { left: (cw - width) / 2, top: (ch - height) / 2, width, height };
}

export function CameraView({ videoRef, canvasRef, mirrored, children }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!container || !video || !canvas) return;

    const layout = () => {
      const rect = containRect(container.clientWidth, container.clientHeight, video.videoWidth, video.videoHeight);
      const dpr = window.devicePixelRatio || 1;
      canvas.style.left = `${rect.left}px`;
      canvas.style.top = `${rect.top}px`;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(container);
    video.addEventListener('loadedmetadata', layout);
    video.addEventListener('resize', layout);
    return () => {
      ro.disconnect();
      video.removeEventListener('loadedmetadata', layout);
      video.removeEventListener('resize', layout);
    };
  }, [videoRef, canvasRef]);

  const flip = mirrored ? { transform: 'scaleX(-1)' } : undefined;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain"
        style={flip}
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute" style={flip} />
      {children}
    </div>
  );
}
