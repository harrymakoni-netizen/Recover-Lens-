import { describe, expect, it } from 'vitest';
import {
  angle, kneeValgusRatio, symmetry, toPixels, torsoAlignment, torsoLean, hipDrop,
} from '../geometry';

describe('geometry (SPEC §5.2 / §12.1)', () => {
  it('returns 90 for a right angle', () => {
    expect(angle({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90, 0);
    expect(Math.abs(angle({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: -7 }) - 90)).toBeLessThan(0.5);
  });

  it('returns 180 for a straight line', () => {
    expect(angle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(180, 5);
  });

  it('returns 0 for a degenerate angle', () => {
    expect(angle({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
  });

  it('pixel conversion corrects aspect-ratio distortion', () => {
    // On a 1280×720 frame, a 45° angle in normalized units is really ~29.4° on screen:
    // B→A is 0.1 across (128 px); B→C is 0.1 across and 0.1 up (128 px, 72 px).
    const W = 1280;
    const H = 720;
    const a = { x: 0.6, y: 0.5 };
    const b = { x: 0.5, y: 0.5 };
    const c = { x: 0.6, y: 0.4 };
    const normalized = angle(a, b, c);
    const pixels = angle(toPixels(a, W, H), toPixels(b, W, H), toPixels(c, W, H));
    expect(normalized).toBeCloseTo(45, 5);
    expect(pixels).toBeCloseTo((Math.atan(72 / 128) * 180) / Math.PI, 5);
    expect(pixels).toBeCloseTo(29.36, 1);
  });

  it('torso lean is 0 upright and grows with sideways lean', () => {
    expect(torsoLean({ x: 100, y: 200 }, { x: 100, y: 100 })).toBeCloseTo(0, 5);
    expect(torsoLean({ x: 100, y: 200 }, { x: 200, y: 100 })).toBeCloseTo(45, 5);
    expect(torsoAlignment(0)).toBe(100);
    expect(torsoAlignment(20)).toBe(0);
    expect(torsoAlignment(4)).toBe(80);
  });

  it('symmetry is 100 for equal angles', () => {
    expect(symmetry(90, 90)).toBe(100);
    expect(symmetry(90, 45)).toBeCloseTo(50, 5);
    expect(symmetry(0, 0)).toBe(100);
  });

  it('valgus is positive when the knee moves towards the midline', () => {
    // Left leg on the right of the image (unmirrored camera); midline at x=100.
    const hip = { x: 120, y: 200 };
    const ankle = { x: 120, y: 400 };
    expect(kneeValgusRatio(hip, { x: 120, y: 300 }, ankle, 100, 40)).toBeCloseTo(0, 5);
    expect(kneeValgusRatio(hip, { x: 110, y: 300 }, ankle, 100, 40)).toBeCloseTo(0.25, 5);
    expect(kneeValgusRatio(hip, { x: 130, y: 300 }, ankle, 100, 40)).toBeCloseTo(-0.25, 5);
    // Right leg on the other side mirrors the sign convention.
    expect(kneeValgusRatio({ x: 80, y: 200 }, { x: 90, y: 300 }, { x: 80, y: 400 }, 100, 40)).toBeCloseTo(0.25, 5);
  });

  it('hip drop is the vertical hip difference over hip width', () => {
    expect(hipDrop({ x: 0, y: 100 }, { x: 50, y: 110 }, 50)).toBeCloseTo(0.2, 5);
  });
});
