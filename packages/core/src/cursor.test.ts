import { describe, expect, it } from 'vitest';
import type { CursorStyle, InputEvent } from './types';
import { buildCursorTrack, cursorAt, rawPositionAt } from './cursor';

const style = (o: Partial<CursorStyle> = {}): CursorStyle => ({
  visible: true, size: 1.5, smoothing: 0, clickRipple: true, hideWhenIdleMs: 2000, ...o,
});
const mv = (t: number, x: number, y: number): InputEvent => ({ type: 'move', t, x, y });

describe('cursor', () => {
  it('rawPositionAt interpolates between samples and clamps at ends', () => {
    const tr = buildCursorTrack([mv(0, 0, 0), mv(100, 100, 100)]);
    expect(rawPositionAt(tr, 50)).toEqual({ x: 50, y: 50 });
    expect(rawPositionAt(tr, -10)).toEqual({ x: 0, y: 0 });
    expect(rawPositionAt(tr, 500)).toEqual({ x: 100, y: 100 });
    expect(rawPositionAt(buildCursorTrack([]), 0)).toBeNull();
  });
  it('lands exactly on clicks even with full smoothing', () => {
    const tr = buildCursorTrack([mv(0, 0, 0), { type: 'click', t: 500, x: 300, y: 200, button: 0 }, mv(1000, 600, 600)]);
    const s = cursorAt(tr, 500, style({ smoothing: 1 }));
    expect(s.x).toBeCloseTo(300);
    expect(s.y).toBeCloseTo(200);
  });
  it('presses and ripples after a click', () => {
    const tr = buildCursorTrack([{ type: 'click', t: 1000, x: 10, y: 10, button: 0 }]);
    expect(cursorAt(tr, 1120, style()).pressScale).toBeCloseTo(0.85);
    expect(cursorAt(tr, 2000, style()).pressScale).toBe(1);
    expect(cursorAt(tr, 1150, style()).ripples).toEqual([{ x: 10, y: 10, progress: 0.5 }]);
    expect(cursorAt(tr, 1150, style({ clickRipple: false })).ripples).toEqual([]);
  });
  it('fades out when idle and fades back in on movement', () => {
    const tr = buildCursorTrack([mv(0, 0, 0), mv(5000, 10, 10)]);
    expect(cursorAt(tr, 1000, style()).opacity).toBe(1);
    expect(cursorAt(tr, 2150, style()).opacity).toBeCloseTo(0.5);
    expect(cursorAt(tr, 3000, style()).opacity).toBe(0);
    expect(cursorAt(tr, 5100, style()).opacity).toBeCloseTo(0.5);
    expect(cursorAt(tr, 3000, style({ hideWhenIdleMs: null })).opacity).toBe(1);
  });
  it('is invisible when style.visible is false', () => {
    const tr = buildCursorTrack([mv(0, 0, 0)]);
    expect(cursorAt(tr, 0, style({ visible: false })).opacity).toBe(0);
  });
});
