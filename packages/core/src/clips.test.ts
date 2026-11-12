import { describe, expect, it } from 'vitest';
import type { Clip } from './types';
import { deleteClip, setClipSpeed, splitClip, trimClip } from './clips';

const base = (): Clip[] => [
  { id: 'a', srcStart: 0, srcEnd: 1000, speed: 1 },
  { id: 'b', srcStart: 1000, srcEnd: 3000, speed: 2 },
];

describe('clip ops', () => {
  it('splitClip splits the clip under the playhead at the mapped source time', () => {
    const out = splitClip(base(), 1500); // 1500 out → clip b, src 1000 + 500*2 = 2000
    expect(out).toHaveLength(3);
    expect(out[1]).toMatchObject({ id: 'b', srcStart: 1000, srcEnd: 2000, speed: 2 });
    expect(out[2]).toMatchObject({ srcStart: 2000, srcEnd: 3000, speed: 2 });
    expect(out[2].id).not.toBe('b');
  });
  it('splitClip is a no-op on a boundary or outside', () => {
    expect(splitClip(base(), 1000)).toHaveLength(2);
    expect(splitClip(base(), 0)).toHaveLength(2);
    expect(splitClip(base(), 99999)).toHaveLength(2);
  });
  it('deleteClip removes by id', () => {
    expect(deleteClip(base(), 'a').map((c) => c.id)).toEqual(['b']);
  });
  it('trimClip clamps to neighbours and minimum length', () => {
    expect(trimClip(base(), 'b', 'start', 500, 3000)[1].srcStart).toBe(1000); // cannot pass prev end
    expect(trimClip(base(), 'b', 'start', 2990, 3000)[1].srcStart).toBe(2900); // min 100ms
    expect(trimClip(base(), 'a', 'end', 1500, 3000)[0].srcEnd).toBe(1000); // cannot pass next start
    expect(trimClip(base(), 'b', 'end', 5000, 3000)[1].srcEnd).toBe(3000); // cannot pass duration
    expect(trimClip(base(), 'a', 'end', 600, 3000)[0].srcEnd).toBe(600);
  });
  it('setClipSpeed clamps to 0.25..16', () => {
    expect(setClipSpeed(base(), 'a', 100)[0].speed).toBe(16);
    expect(setClipSpeed(base(), 'a', 0)[0].speed).toBe(0.25);
    expect(setClipSpeed(base(), 'a', 3)[0].speed).toBe(3);
  });
});
