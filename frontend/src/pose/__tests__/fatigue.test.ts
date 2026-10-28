import { describe, expect, it } from 'vitest';
import { MIN_REPS_FOR_FATIGUE, analyseFatigue, tiringInSet } from '../fatigue';

const rep = (durationS: number, maxProgress = 1, quality = 90) => ({ durationS, maxProgress, quality });
const times = (n: number, r: ReturnType<typeof rep>) => Array.from({ length: n }, () => r);

describe('fatigue signs (session)', () => {
  it('needs enough reps to compare', () => {
    expect(analyseFatigue(times(MIN_REPS_FOR_FATIGUE - 1, rep(2)))).toBeNull();
    expect(analyseFatigue(times(MIN_REPS_FOR_FATIGUE, rep(2)))).not.toBeNull();
  });

  it('reports none for steady reps', () => {
    const f = analyseFatigue(times(12, rep(2)))!;
    expect(f.level).toBe('none');
    expect(f.signs).toEqual([]);
  });

  it('flags reps that slow down as slight', () => {
    const f = analyseFatigue([...times(4, rep(2)), ...times(4, rep(2.2)), ...times(4, rep(2.6))])!;
    expect(f.signs).toEqual(['slower']);
    expect(f.level).toBe('slight');
    expect(f.slowerPct).toBe(30);
  });

  it('is clear when two or more signs show together', () => {
    const f = analyseFatigue([...times(4, rep(2, 1, 92)), ...times(4, rep(2.2, 0.97, 88)), ...times(4, rep(2.6, 0.85, 78))])!;
    expect(f.level).toBe('clear');
    expect(f.signs).toEqual(['slower', 'shorter', 'form']);
    expect(f.shorterPct).toBe(15);
    expect(f.formPoints).toBe(14);
  });

  it('never calls getting faster or better a sign of tiring', () => {
    const f = analyseFatigue([...times(4, rep(3, 0.9, 70)), ...times(4, rep(2.4, 1, 85))])!;
    expect(f.level).toBe('none');
    expect([f.slowerPct, f.shorterPct, f.formPoints]).toEqual([0, 0, 0]);
  });

  it('caps progress above 1 so overshooting early does not hide lost range', () => {
    expect(analyseFatigue([...times(3, rep(2, 1.4)), ...times(3, rep(2, 0.9))])!.signs).toContain('shorter');
  });
});

describe('tiring within a set (live coach)', () => {
  it('waits for six reps', () => {
    expect(tiringInSet([...times(3, rep(2)), ...times(2, rep(4))])).toBe(false);
  });

  it('notices a clear slow-down', () => {
    expect(tiringInSet([...times(3, rep(2)), ...times(3, rep(2.6))])).toBe(true);
  });

  it('notices reps falling short of the target', () => {
    expect(tiringInSet([...times(3, rep(2, 1)), ...times(3, rep(2, 0.85))])).toBe(true);
  });

  it('ignores small natural variation', () => {
    expect(tiringInSet([...times(3, rep(2)), ...times(4, rep(2.3, 0.95))])).toBe(false);
  });
});
