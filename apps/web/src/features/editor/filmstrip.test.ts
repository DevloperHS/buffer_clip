import { describe, expect, it } from 'vitest';
import { clipTiles, sampleTimes } from './filmstrip';

describe('sampleTimes', () => {
  it('samples about every 200ms, at slice centres', () => {
    const { times, stepMs } = sampleTimes(8000);
    expect(times).toHaveLength(40);
    expect(stepMs).toBe(200);
    expect(times[0]).toBe(100);
    expect(times[39]).toBe(7900);
  });
  it('keeps short recordings readable and long ones bounded', () => {
    expect(sampleTimes(1000).times).toHaveLength(24);
    expect(sampleTimes(600_000).times).toHaveLength(160);
  });
});

describe('clipTiles', () => {
  const strip = { count: 40, stepMs: 200 };
  it('fills the block from the left, cutting the last tile at the edge', () => {
    const tiles = clipTiles(strip, { start: 0, end: 4000 }, 130, 50);
    expect(tiles.map((t) => [t.left, t.width])).toEqual([[0, 50], [50, 50], [100, 30]]);
  });
  it('shows the frame under each tile centre, within the clip source range', () => {
    // 2s..6s across 200px: tile centres at 25, 75, 125, 175px -> 2.5s, 3.5s, 4.5s, 5.5s.
    const tiles = clipTiles(strip, { start: 2000, end: 6000 }, 200, 50);
    expect(tiles.map((t) => t.frame)).toEqual([12, 17, 22, 27]);
  });
  it('clamps to the frames that exist and handles empty sizes', () => {
    expect(clipTiles(strip, { start: 7900, end: 9000 }, 50, 50)[0].frame).toBe(39);
    expect(clipTiles(strip, { start: 0, end: 1000 }, 0, 50)).toEqual([]);
  });
});
