import { describe, expect, it } from 'vitest';
import { DisplayScore, frameScore } from '../scoring';

describe('scoring (SPEC §5.6 / §12.4)', () => {
  it('a perfect frame scores ≈ 100', () => {
    expect(frameScore({ progress: 1, torsoAlignment: 100, symmetry: 100, activeFaults: 0 })).toBeCloseTo(100, 5);
  });

  it('progress above 1 does not raise the score past 100', () => {
    expect(frameScore({ progress: 1.2, torsoAlignment: 100, symmetry: 100, activeFaults: 0 })).toBe(100);
  });

  it('two active faults reduce the score by 30', () => {
    const clean = frameScore({ progress: 0.8, torsoAlignment: 90, symmetry: 95, activeFaults: 0 });
    const faulty = frameScore({ progress: 0.8, torsoAlignment: 90, symmetry: 95, activeFaults: 2 });
    expect(clean - faulty).toBeCloseTo(30, 5);
  });

  it('never goes below 0', () => {
    expect(frameScore({ progress: 0, torsoAlignment: 0, symmetry: 0, activeFaults: 5 })).toBe(0);
  });

  it('the displayed score is smoothed', () => {
    const d = new DisplayScore();
    expect(d.update(100)).toBe(100);
    expect(d.update(0)).toBeCloseTo(80, 5);
  });
});
