import { describe, expect, it } from 'vitest';
import { resolvePlayback, srcToOutClamped } from './time';
import type { Clip } from './types';

const clips: Clip[] = [
  { id: 'a', srcStart: 0, srcEnd: 1000, speed: 1 },
  { id: 'b', srcStart: 1000, srcEnd: 3000, speed: 4 },
  { id: 'c', srcStart: 5000, srcEnd: 6000, speed: 1 },
];

describe('resolvePlayback', () => {
  it('stays inside the current clip', () => {
    expect(resolvePlayback(clips, 500)).toEqual({ clipIndex: 0, srcT: 500, outT: 500, jumped: false });
    expect(resolvePlayback(clips, 2000)).toEqual({ clipIndex: 1, srcT: 2000, outT: 1250, jumped: false });
  });
  it('jumps over a cut to the next clip', () => {
    expect(resolvePlayback(clips, 3000)).toEqual({ clipIndex: 2, srcT: 5000, outT: 1500, jumped: true });
    expect(resolvePlayback(clips, 4000)).toEqual({ clipIndex: 2, srcT: 5000, outT: 1500, jumped: true });
  });
  it('returns null past the end', () => {
    expect(resolvePlayback(clips, 6000)).toBeNull();
  });
});

describe('srcToOutClamped', () => {
  it('maps inside clips and pins gaps to their output position', () => {
    expect(srcToOutClamped(clips, -5)).toBe(0);
    expect(srcToOutClamped(clips, 2000)).toBe(1250);
    expect(srcToOutClamped(clips, 4000)).toBe(1500);
    expect(srcToOutClamped(clips, 9000)).toBe(2500);
  });
});
