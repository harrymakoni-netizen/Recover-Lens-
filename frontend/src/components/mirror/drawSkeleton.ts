// Draws the skeleton on a canvas that exactly covers the rendered video rectangle.
import { BODY_JOINTS, type Landmark, SKELETON_CONNECTIONS, isVisible } from '../../pose/landmarks';
import type { SkeletonColor } from '../../pose/sessionEngine';

export const SKELETON_COLORS: Record<SkeletonColor, string> = {
  green: '#4ADE80',
  amber: '#F5B83D',
  grey: '#9CA3AF',
};

const MIN_DRAW_VISIBILITY = 0.3;

export interface DrawOverlay {
  /** Camera setup check: rings on the joints the exercise needs (amber while not visible). */
  setup?: { required: number[]; missing: number[] } | null;
  /** Live movement target (seated reach), in normalised image coordinates. */
  target?: { x: number; y: number; r: number; hit: boolean; holdProgress: number } | null;
}

function drawTarget(ctx: CanvasRenderingContext2D, t: NonNullable<DrawOverlay['target']>, width: number, height: number, scale: number): void {
  const cx = t.x * width;
  const cy = t.y * height;
  const r = Math.max(14 * scale, t.r * height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = t.hit ? 'rgba(74,222,128,0.30)' : 'rgba(45,212,191,0.14)';
  ctx.fill();
  ctx.lineWidth = 5 * scale;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.stroke();
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = t.hit ? '#4ADE80' : '#5EEAD4';
  ctx.setLineDash(t.hit ? [] : [10 * scale, 7 * scale]);
  ctx.stroke();
  ctx.setLineDash([]);
  if (t.holdProgress > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8 * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t.holdProgress);
    ctx.lineWidth = 5 * scale;
    ctx.strokeStyle = '#4ADE80';
    ctx.stroke();
  }
  ctx.restore();
}

function drawSetup(ctx: CanvasRenderingContext2D, landmarks: Landmark[], setup: NonNullable<DrawOverlay['setup']>, width: number, height: number, scale: number): void {
  ctx.save();
  for (const i of setup.required) {
    const l = landmarks[i];
    if (!l || l.x < 0 || l.x > 1 || l.y < 0 || l.y > 1) continue;
    const missing = setup.missing.includes(i);
    ctx.beginPath();
    ctx.arc(l.x * width, l.y * height, (missing ? 15 : 11) * scale, 0, Math.PI * 2);
    ctx.lineWidth = 3 * scale;
    ctx.strokeStyle = missing ? SKELETON_COLORS.amber : SKELETON_COLORS.green;
    ctx.setLineDash(missing ? [6 * scale, 5 * scale] : []);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: Landmark[] | null,
  color: SkeletonColor,
  overlay: DrawOverlay = {},
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
  if (overlay.setup) drawSetup(ctx, landmarks, overlay.setup, width, height, scale);
  if (overlay.target) drawTarget(ctx, overlay.target, width, height, scale);
}
