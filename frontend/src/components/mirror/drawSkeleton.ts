// Draws the skeleton on a canvas that exactly covers the rendered video rectangle.
import { BODY_JOINTS, type Landmark, SKELETON_CONNECTIONS, isVisible } from '../../pose/landmarks';
import type { SkeletonColor } from '../../pose/sessionEngine';

export const SKELETON_COLORS: Record<SkeletonColor, string> = {
  green: '#4ADE80',
  amber: '#F5B83D',
  grey: '#9CA3AF',
};

const MIN_DRAW_VISIBILITY = 0.3;

export function drawSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: Landmark[] | null,
  color: SkeletonColor,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (!landmarks || landmarks.length < 33) return;

  const scale = Math.max(1, Math.min(width, height) / 400);
  const stroke = SKELETON_COLORS[color];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Dark outline first so lines read on any background.
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass === 0 ? 'rgba(0,0,0,0.45)' : stroke;
    ctx.lineWidth = (pass === 0 ? 7 : 4) * scale;
    for (const [a, b] of SKELETON_CONNECTIONS) {
      const la = landmarks[a];
      const lb = landmarks[b];
      if (!isVisible(la, MIN_DRAW_VISIBILITY) || !isVisible(lb, MIN_DRAW_VISIBILITY)) continue;
      ctx.beginPath();
      ctx.moveTo(la.x * width, la.y * height);
      ctx.lineTo(lb.x * width, lb.y * height);
      ctx.stroke();
    }
  }
  // Neck: nose to mid-shoulder.
  const nose = landmarks[0];
  const ls = landmarks[11];
  const rs = landmarks[12];
  if ([nose, ls, rs].every((l) => isVisible(l, MIN_DRAW_VISIBILITY))) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(nose.x * width, nose.y * height);
    ctx.lineTo(((ls.x + rs.x) / 2) * width, ((ls.y + rs.y) / 2) * height);
    ctx.stroke();
  }

  for (const i of BODY_JOINTS) {
    const l = landmarks[i];
    if (!isVisible(l, MIN_DRAW_VISIBILITY)) continue;
    ctx.beginPath();
    ctx.arc(l.x * width, l.y * height, (i === 0 ? 6 : 5) * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#0A0C10';
    ctx.fill();
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
