import { describe, expect, it } from 'vitest';
import { cameraAt, frameToScreen, screenToFrame } from './camera';
import { buildCursorTrack } from './cursor';
import { computeLayout, frameRect, outputSize } from './layout';
import { createInitialProject } from './project';
import { cameraFor } from './render';
import type { Recording } from './types';

const rec: Recording = {
  id: 'r', createdAt: 0, name: 'r', durationMs: 4000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false,
  events: [{ type: 'click', t: 1000, x: 900, y: 300, button: 0 }],
};

describe('frame geometry', () => {
  it('frameRect matches the renderer layout', () => {
    const p = createInitialProject(rec);
    expect(frameRect(p, rec)).toEqual(computeLayout(outputSize(p.output), 16 / 9, 64));
  });
  it('maps frame points to screen and back, with and without zoom', () => {
    const frame = { x: 0, y: 0, w: 1000, h: 500 };
    const rect = { x: 100, y: 50, w: 500, h: 250 };
    const identity = { scale: 1, cx: 500, cy: 250 };
    expect(frameToScreen({ x: 0, y: 0 }, rect, frame, identity)).toEqual({ x: 100, y: 50 });
    expect(frameToScreen({ x: 1000, y: 500 }, rect, frame, identity)).toEqual({ x: 600, y: 300 });
    const zoomed = { scale: 2, cx: 750, cy: 250 };
    expect(frameToScreen({ x: 500, y: 125 }, rect, frame, zoomed)).toEqual({ x: 100, y: 50 });
    const p = { x: 812, y: 333 };
    const back = screenToFrame(frameToScreen(p, rect, frame, zoomed), rect, frame, zoomed);
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });
  it('cameraFor agrees with cameraAt for fixed targets', () => {
    const p = createInitialProject(rec);
    const track = buildCursorTrack(rec.events);
    const frame = { x: 0, y: 0, w: 1280, h: 720 };
    expect(cameraFor(p, rec, track, 1000)).toEqual(cameraAt(1000, p.zooms, frame, () => ({ x: 0, y: 0 })));
  });
});
