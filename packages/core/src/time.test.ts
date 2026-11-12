import { describe, expect, it } from 'vitest';
import type { Clip } from './types';
import { outputDuration, outToSrc, srcToOut } from './time';

const clips: Clip[] = [
  { id: 'a', srcStart: 0, srcEnd: 1000, speed: 1 },
  { id: 'b', srcStart: 1000, srcEnd: 3000, speed: 4 }, // 500ms of output
  { id: 'c', srcStart: 5000, srcEnd: 6000, speed: 1 }, // 3000..5000 is cut
];

describe('time mapping', () => {
  it('outputDuration sums clip lengths divided by speed', () => {
    expect(outputDuration(clips)).toBe(2500);
    expect(outputDuration([])).toBe(0);
  });
  it('outToSrc maps through normal, sped-up and post-cut clips', () => {
    expect(outToSrc(clips, 500)).toBe(500);
    expect(outToSrc(clips, 1250)).toBe(2000);
    expect(outToSrc(clips, 1500)).toBe(5000);
    expect(outToSrc(clips, 2000)).toBe(5500);
  });
  it('outToSrc clamps outside range', () => {
    expect(outToSrc(clips, -10)).toBe(0);
    expect(outToSrc(clips, 99999)).toBe(6000);
    expect(outToSrc([], 100)).toBe(0);
  });
  it('srcToOut is the inverse and returns null inside cuts', () => {
    expect(srcToOut(clips, 2000)).toBe(1250);
    expect(srcToOut(clips, 5500)).toBe(2000);
    expect(srcToOut(clips, 4000)).toBeNull();
  });
});
