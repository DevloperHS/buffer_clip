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
    expect(draw?.args).toEqual([source, 0, 0, 2560, 1440, 0, 0, 1280, 720]);
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
