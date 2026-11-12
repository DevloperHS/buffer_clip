import { describe, expect, it } from 'vitest';
import type { InputEvent } from './types';
import { detectIdle } from './idle';

const moves = (from: number, to: number, step = 100): InputEvent[] => {
  const out: InputEvent[] = [];
  for (let t = from; t <= to; t += step) out.push({ type: 'move', t, x: t / 10, y: 0 });
  return out;
};
const strip = (clips: ReturnType<typeof detectIdle>) =>
  clips.map(({ srcStart, srcEnd, speed }) => ({ srcStart, srcEnd, speed }));

describe('detectIdle', () => {
  it('cuts long gaps and trailing silence, keeping 400ms pads', () => {
    const ev = [...moves(0, 1000), ...moves(6000, 7000)];
    expect(strip(detectIdle(ev, 8000))).toEqual([
      { srcStart: 0, srcEnd: 1400, speed: 1 },
      { srcStart: 5600, srcEnd: 7400, speed: 1 },
    ]);
  });
  it('speeds up medium gaps 8x', () => {
    const ev = [...moves(0, 1000), ...moves(3000, 4000)];
    expect(strip(detectIdle(ev, 4000))).toEqual([
      { srcStart: 0, srcEnd: 1400, speed: 1 },
      { srcStart: 1400, srcEnd: 2600, speed: 8 },
      { srcStart: 2600, srcEnd: 4000, speed: 1 },
    ]);
  });
  it('ignores gaps shorter than minIdleMs', () => {
    const ev = [...moves(0, 1000), ...moves(2000, 3000)];
    expect(strip(detectIdle(ev, 3000))).toEqual([{ srcStart: 0, srcEnd: 3000, speed: 1 }]);
  });
  it('cuts leading silence', () => {
    expect(strip(detectIdle(moves(2000, 3000), 3000))).toEqual([
      { srcStart: 1600, srcEnd: 3000, speed: 1 },
    ]);
  });
  it('keeps everything when there are no events', () => {
    expect(strip(detectIdle([], 5000))).toEqual([{ srcStart: 0, srcEnd: 5000, speed: 1 }]);
  });
  it('gives every clip an id', () => {
    for (const c of detectIdle(moves(0, 1000), 1000)) expect(c.id).toBeTruthy();
  });
  it('marks sped-up clips as idle and leaves kept clips unmarked', () => {
    const ev = [...moves(0, 1000), ...moves(3000, 4000)];
    const out = detectIdle(ev, 4000);
    expect(out.map((c) => c.idle ?? false)).toEqual([false, true, false]);
  });
});
