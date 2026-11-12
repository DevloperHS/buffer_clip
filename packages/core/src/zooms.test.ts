import { describe, expect, it } from 'vitest';
import type { InputEvent } from './types';
import { suggestZooms } from './zooms';

const click = (t: number, x: number, y: number): InputEvent => ({ type: 'click', t, x, y, button: 0 });
const key = (t: number): InputEvent => ({ type: 'key', t, key: 'a', mods: [] });
const strip = (z: ReturnType<typeof suggestZooms>) =>
  z.map(({ start, end, scale, target }) => ({ start, end, scale, target }));

describe('suggestZooms', () => {
  it('groups nearby clicks into one zoom targeting the centroid', () => {
    expect(strip(suggestZooms([click(1000, 100, 100), click(2000, 150, 120)], 10000))).toEqual([
      { start: 400, end: 3000, scale: 1.8, target: { x: 125, y: 110 } },
    ]);
  });
  it('separates clicks far apart in time', () => {
    expect(suggestZooms([click(1000, 100, 100), click(10000, 100, 100)], 20000)).toHaveLength(2);
  });
  it('merges overlapping zooms with distant targets into a follow zoom', () => {
    expect(strip(suggestZooms([click(1000, 100, 100), click(2000, 900, 100)], 10000))).toEqual([
      { start: 400, end: 3000, scale: 1.8, target: 'follow' },
    ]);
  });
  it('zooms on key bursts at the last pointer position', () => {
    const ev: InputEvent[] = [{ type: 'move', t: 500, x: 400, y: 300 }, key(5000), key(5200), key(5400)];
    expect(strip(suggestZooms(ev, 10000))).toEqual([
      { start: 4400, end: 6400, scale: 1.8, target: { x: 400, y: 300 } },
    ]);
  });
  it('ignores bursts of fewer than 3 keys', () => {
    const ev: InputEvent[] = [{ type: 'move', t: 500, x: 1, y: 1 }, key(5000), key(5200)];
    expect(suggestZooms(ev, 10000)).toEqual([]);
  });
  it('clamps to [0, duration]', () => {
    expect(strip(suggestZooms([click(300, 10, 10)], 800))[0]).toMatchObject({ start: 0, end: 800 });
  });
  it('marks zooms auto with ids and ease', () => {
    const [z] = suggestZooms([click(1000, 1, 1)], 5000);
    expect(z).toMatchObject({ auto: true, easeMs: 700 });
    expect(z.id).toBeTruthy();
  });
});
