import { describe, expect, it } from 'vitest';
import type { Zoom } from './types';
import { cameraAt } from './camera';

const frame = { x: 0, y: 0, w: 1000, h: 500 };
const zoom = (o: Partial<Zoom> = {}): Zoom => ({
  id: 'z', start: 1000, end: 3000, scale: 2, target: { x: 800, y: 250 }, easeMs: 500, auto: true, ...o,
});
const noFollow = () => ({ x: 0, y: 0 });

describe('cameraAt', () => {
  it('is identity outside zooms', () => {
    expect(cameraAt(0, [zoom()], frame, noFollow)).toEqual({ scale: 1, cx: 500, cy: 250 });
  });
  it('is fully zoomed mid-zoom, clamped inside the frame', () => {
    expect(cameraAt(2000, [zoom()], frame, noFollow)).toEqual({ scale: 2, cx: 750, cy: 250 });
  });
  it('eases in', () => {
    const c = cameraAt(1250, [zoom()], frame, noFollow);
    expect(c.scale).toBeCloseTo(1.5);
    expect(c.cx).toBeCloseTo(650);
  });
  it('eases out symmetrically', () => {
    expect(cameraAt(2750, [zoom()], frame, noFollow).scale).toBeCloseTo(1.5);
  });
  it('follows the cursor for follow zooms', () => {
    const c = cameraAt(2000, [zoom({ target: 'follow' })], frame, () => ({ x: 400, y: 200 }));
    expect(c).toEqual({ scale: 2, cx: 400, cy: 200 });
  });
  it('respects a frame offset (crop)', () => {
    const cropped = { x: 100, y: 100, w: 400, h: 200 };
    expect(cameraAt(0, [], cropped, noFollow)).toEqual({ scale: 1, cx: 300, cy: 200 });
  });
});
