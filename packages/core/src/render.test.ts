import { describe, expect, it } from 'vitest';
import { buildCursorTrack } from './cursor';
import { renderFrame, type Ctx2D } from './render';
import type { Project, Recording } from './types';

function mockCtx() {
  const calls: { name: string; args: unknown[] }[] = [];
  const store: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(store, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'createLinearGradient')
        return (...args: unknown[]) => { calls.push({ name: 'createLinearGradient', args }); return { addColorStop() {} }; };
      return (...args: unknown[]) => { calls.push({ name: String(prop), args }); };
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  return { ctx: ctx as unknown as Ctx2D, calls };
}

const recording: Recording = {
  id: 'r', createdAt: 0, name: 'r', durationMs: 4000,
  viewport: { w: 1280, h: 720, dpr: 2 }, crop: null, hasAudio: false,
  events: [{ type: 'move', t: 0, x: 100, y: 100 }],
};
const project: Project = {
  version: 1, recordingId: 'r',
  clips: [{ id: 'c', srcStart: 0, srcEnd: 4000, speed: 1 }],
  zooms: [],
  cursor: { visible: true, size: 1.5, smoothing: 0.5, clickRipple: true, hideWhenIdleMs: 2000 },
  background: { kind: 'gradient', value: '#F7F7F5,#DADAD6', padding: 64, radius: 14, shadow: 0.6 },
  output: { aspect: '16:9', height: 1080, fps: 30 },
};
const source = {} as CanvasImageSource;

describe('renderFrame', () => {
  it('paints background first, then the source frame mapped from source pixels to viewport space', () => {
    const { ctx, calls } = mockCtx();
    renderFrame(ctx, { project, recording, track: buildCursorTrack(recording.events), outT: 500, source, sourceSize: { w: 2560, h: 1440 } });
    const firstPaint = calls.find((c) => ['fillRect', 'fill', 'drawImage'].includes(c.name));
    expect(firstPaint?.name).toBe('fillRect');
    expect(calls.find((c) => c.name === 'fillRect')?.args).toEqual([0, 0, 1920, 1080]);
    const draw = calls.find((c) => c.name === 'drawImage');
    const [img, sx, sy, sw, sh, dx, dy, dw, dh] = draw!.args as [unknown, ...number[]];
    expect([img, sx, sy, sw, sh]).toEqual([source, 0, 0, 2560, 1440]);
    // The frame is covered edge to edge, with a hair of bleed that the clip trims off.
    expect(dx).toBeLessThan(0);
    expect(dx).toBeGreaterThan(-2);
    expect(dy).toBeLessThan(0);
    expect(dx + dw).toBeGreaterThan(1280);
    expect(dy + dh).toBeGreaterThan(720);
  });
  it('fills the whole frame even when the captured video is a pixel or two off the viewport size', () => {
    // 1280x720 at 125% should be 1600x900, but Chrome delivered 1600x898: the old width-only
    // scale asked for rows past the bottom of the image and left a white line under the video.
    const { ctx, calls } = mockCtx();
    const rec = { ...recording, viewport: { w: 1280, h: 720, dpr: 1.25 } };
    renderFrame(ctx, { project, recording: rec, track: buildCursorTrack(rec.events), outT: 500, source, sourceSize: { w: 1600, h: 898 } });
    const [, sx, sy, sw, sh, dx, dy, dw, dh] = calls.find((c) => c.name === 'drawImage')!.args as number[];
    expect(sx).toBe(0);
    expect(sy).toBeGreaterThanOrEqual(14); // skips the 14 rows the hardware decoder overwrites
    expect(sx + sw).toBeLessThanOrEqual(1600); // never reads outside the image
    expect(sy + sh).toBeLessThanOrEqual(898);
    expect(dx).toBeLessThanOrEqual(0); // and always covers the frame, edge to edge
    expect(dy).toBeLessThanOrEqual(0);
    expect(dx + dw).toBeGreaterThanOrEqual(1280);
    expect(dy + dh).toBeGreaterThanOrEqual(720);
  });
  it('draws the cursor after the source frame', () => {
    const { ctx, calls } = mockCtx();
    renderFrame(ctx, { project, recording, track: buildCursorTrack(recording.events), outT: 500, source, sourceSize: { w: 2560, h: 1440 } });
    const drawIdx = calls.findIndex((c) => c.name === 'drawImage');
    const cursorIdx = calls.findIndex((c, i) => i > drawIdx && c.name === 'moveTo');
    expect(cursorIdx).toBeGreaterThan(drawIdx);
  });
  it('does not throw without a source frame and keeps save/restore balanced', () => {
    const { ctx, calls } = mockCtx();
    expect(() =>
      renderFrame(ctx, { project, recording, track: buildCursorTrack([]), outT: 0, source: null, sourceSize: { w: 1, h: 1 } }),
    ).not.toThrow();
    const saves = calls.filter((c) => c.name === 'save').length;
    const restores = calls.filter((c) => c.name === 'restore').length;
    expect(saves).toBe(restores);
    expect(calls.some((c) => c.name === 'drawImage')).toBe(false);
  });
});
