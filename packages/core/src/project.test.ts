import { describe, expect, it } from 'vitest';
import * as core from './index';
import type { InputEvent, Recording } from './types';

const events: InputEvent[] = [
  { type: 'move', t: 0, x: 0, y: 0 },
  { type: 'click', t: 1000, x: 200, y: 200, button: 0 },
  { type: 'move', t: 1100, x: 210, y: 205 },
  { type: 'click', t: 8000, x: 600, y: 400, button: 0 },
];
const rec: Recording = {
  id: 'rec1', createdAt: 0, name: 'Demo', durationMs: 9500,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false, events,
};

describe('createInitialProject', () => {
  it('builds an auto-edited project with defaults', () => {
    const p = core.createInitialProject(rec);
    expect(p.version).toBe(1);
    expect(p.recordingId).toBe('rec1');
    expect(p.zooms).toHaveLength(2);
    expect(p.clips.length).toBeGreaterThan(1); // idle gap 1100→8000 is cut
    expect(core.outputDuration(p.clips)).toBeLessThan(rec.durationMs);
    expect(p.cursor).toEqual(core.DEFAULT_CURSOR);
    expect(p.background).toEqual(core.DEFAULT_BACKGROUND);
    expect(p.output).toEqual({ aspect: '16:9', height: 1080, fps: 60 }); // match the preview's smoothness
  });
  it('exposes the full public API from index', () => {
    for (const name of [
      'outToSrc', 'srcToOut', 'outputDuration', 'splitClip', 'deleteClip', 'trimClip', 'setClipSpeed',
      'detectIdle', 'suggestZooms', 'mergeZooms', 'buildCursorTrack', 'cursorAt', 'cameraAt',
      'outputSize', 'contentFrame', 'computeLayout', 'renderFrame', 'createInitialProject', 'newId',
    ]) expect(typeof (core as unknown as Record<string, unknown>)[name]).toBe('function');
  });
});
