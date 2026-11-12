import { describe, expect, it } from 'vitest';
import { cycleIdleClip, fillGap, listGaps } from './gaps';
import type { Clip } from './types';

const clips: Clip[] = [
  { id: 'a', srcStart: 0, srcEnd: 1000, speed: 1 },
  { id: 'b', srcStart: 1000, srcEnd: 3000, speed: 1 },
  { id: 'c', srcStart: 5000, srcEnd: 6000, speed: 1 },
];

describe('gaps', () => {
  it('lists uncovered ranges including leading and trailing', () => {
    expect(listGaps(clips, 7000)).toEqual([
      { srcStart: 3000, srcEnd: 5000 },
      { srcStart: 6000, srcEnd: 7000 },
    ]);
    expect(listGaps([{ id: 'x', srcStart: 500, srcEnd: 1000, speed: 1 }], 1000)).toEqual([{ srcStart: 0, srcEnd: 500 }]);
    expect(listGaps([{ id: 'x', srcStart: 0, srcEnd: 1000, speed: 1 }], 1000)).toEqual([]);
  });
  it('fills a gap with a sped-up idle clip in source order', () => {
    const out = fillGap(clips, { srcStart: 3000, srcEnd: 5000 });
    expect(out).toHaveLength(4);
    expect(out[2]).toMatchObject({ srcStart: 3000, srcEnd: 5000, speed: 8, idle: true });
  });
  it('cycles idle clips: sped up → normal → removed', () => {
    const filled = fillGap(clips, { srcStart: 3000, srcEnd: 5000 });
    const id = filled[2].id;
    const normal = cycleIdleClip(filled, id);
    expect(normal[2]).toMatchObject({ id, speed: 1, idle: true });
    expect(cycleIdleClip(normal, id).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
  it('ignores non-idle clips and never removes the last clip', () => {
    expect(cycleIdleClip(clips, 'a')).toBe(clips);
    const only: Clip[] = [{ id: 'z', srcStart: 0, srcEnd: 10, speed: 1, idle: true }];
    expect(cycleIdleClip(only, 'z')).toBe(only);
  });
});
