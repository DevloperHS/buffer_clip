import { describe, expect, it } from 'vitest';
import { normalizeRect } from './selection';

const vp = { w: 1280, h: 720 };

describe('normalizeRect', () => {
  it('normalizes drag direction and rounds', () => {
    expect(normalizeRect({ x: 400.6, y: 300.2 }, { x: 100.2, y: 100.7 }, vp)).toEqual({ x: 100, y: 101, w: 301, h: 199 });
  });
  it('clamps to the viewport', () => {
    expect(normalizeRect({ x: -50, y: -50 }, { x: 2000, y: 900 }, vp)).toEqual({ x: 0, y: 0, w: 1280, h: 720 });
  });
  it('rejects areas smaller than the minimum', () => {
    expect(normalizeRect({ x: 0, y: 0 }, { x: 50, y: 400 }, vp)).toBeNull();
    expect(normalizeRect({ x: 0, y: 0 }, { x: 10, y: 10 }, vp, 1)).toEqual({ x: 0, y: 0, w: 10, h: 10 });
  });
});
