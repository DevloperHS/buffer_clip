import { buildCursorTrack, createInitialProject, frameRect, type Recording, type Zoom } from '@buffer-clip/core';
import { describe, expect, it } from 'vitest';
import { boxToZoom, fitInside, lockedBox, toCanvasPoint, withIntro, zoomGhostRect } from './preview-math';

const rec: Recording = {
  id: 'r', createdAt: 0, name: 'r', durationMs: 4000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false, events: [],
};

describe('preview math', () => {
  it('withIntro scales the frame styling without mutating', () => {
    const p = createInitialProject(rec);
    const k0 = withIntro(p, 0);
    expect(k0.background).toMatchObject({ padding: 0, radius: 0, shadow: 0 });
    expect(withIntro(p, 1)).toBe(p);
    expect(p.background.padding).toBe(64);
  });
  it('fitInside contains an aspect ratio within a box', () => {
    const wide = fitInside({ w: 1000, h: 400 }, 16 / 9);
    expect(wide.w).toBeCloseTo(400 * (16 / 9));
    expect(wide.h).toBeCloseTo(400);
    const tall = fitInside({ w: 320, h: 1000 }, 16 / 9);
    expect(tall.w).toBeCloseTo(320);
    expect(tall.h).toBeCloseTo(180);
    expect(fitInside({ w: 0, h: 100 }, 1)).toEqual({ w: 0, h: 0 });
  });
  it('toCanvasPoint scales client coordinates into canvas pixels', () => {
    const r = { left: 10, top: 20, width: 960, height: 540 } as DOMRect;
    expect(toCanvasPoint(490, 290, r, { w: 1920, h: 1080 })).toEqual({ x: 960, y: 540 });
  });
  it('zoomGhostRect outlines the zoom window on the un-zoomed frame', () => {
    const p = createInitialProject(rec);
    const z: Zoom = { id: 'z', start: 2000, end: 3000, scale: 2, target: { x: 640, y: 360 }, easeMs: 500, auto: false };
    const rect = frameRect(p, rec);
    const g = zoomGhostRect(p, rec, buildCursorTrack([]), z, 0);
    expect(g.w).toBeCloseTo(rect.w / 2);
    expect(g.h).toBeCloseTo(rect.h / 2);
    expect(g.x).toBeCloseTo(rect.x + rect.w / 4);
    expect(g.y).toBeCloseTo(rect.y + rect.h / 4);
  });
});

describe('zoom area drawing', () => {
  it('locks the drawn box to the frame aspect, growing from the anchor in the drag direction', () => {
    expect(lockedBox({ x: 100, y: 100 }, { x: 260, y: 120 }, 16 / 9)).toEqual({ x: 100, y: 100, w: 160, h: 90 });
    expect(lockedBox({ x: 300, y: 300 }, { x: 290, y: 200 }, 16 / 9)).toEqual({ x: 300 - 177.77777777777777, y: 200, w: 177.77777777777777, h: 100 });
  });
  it('turns a box into a zoom centred on it that fills the frame with it', () => {
    const rect = { x: 0, y: 0, w: 1280, h: 720 };
    const frame = { x: 0, y: 0, w: 1280, h: 720 };
    const cam = { cx: 640, cy: 360, scale: 1 };
    expect(boxToZoom({ x: 100, y: 100, w: 640, h: 360 }, rect, frame, cam)).toEqual({ target: { x: 420, y: 280 }, scale: 2 });
  });
  it('accounts for the current camera and clamps the scale', () => {
    const rect = { x: 0, y: 0, w: 1280, h: 720 };
    const frame = { x: 0, y: 0, w: 1280, h: 720 };
    // Already zoomed 2× on the top-left quarter: a full-screen box is that quarter, so 2×.
    const cam = { cx: 320, cy: 180, scale: 2 };
    expect(boxToZoom({ x: 0, y: 0, w: 1280, h: 720 }, rect, frame, cam)).toEqual({ target: { x: 320, y: 180 }, scale: 2 });
    expect(boxToZoom({ x: 0, y: 0, w: 10, h: 5.625 }, rect, frame, { cx: 640, cy: 360, scale: 1 }).scale).toBe(4);
    expect(boxToZoom({ x: 0, y: 0, w: 1280, h: 720 }, rect, frame, { cx: 640, cy: 360, scale: 1 }).scale).toBe(1.2);
  });
});
