import { describe, expect, it } from 'vitest';
import type { InputEvent, Zoom } from './types';
import { createZoom, MIN_ZOOM_MS, normalizeZoom, replaceAutoZooms, zoomSlot } from './zooms';

const z = (o: Partial<Zoom>): Zoom => ({
  id: 'z', start: 0, end: 1000, scale: 1.8, target: { x: 0, y: 0 }, easeMs: 700, auto: false, ...o,
});

describe('zoom editing helpers', () => {
  it('createZoom builds a manual zoom around the time, clamped to the recording', () => {
    expect(createZoom(5000, 10000, { x: 1, y: 2 })).toMatchObject({
      start: 4500, end: 6500, scale: 1.8, easeMs: 700, auto: false, target: { x: 1, y: 2 },
    });
    expect(createZoom(100, 10000, 'follow')).toMatchObject({ start: 0, end: 1600 });
    expect(createZoom(10000, 10000, 'follow')).toMatchObject({ start: 9500, end: 10000 });
  });
  it('zoomSlot fits a new zoom into the free space between existing zooms', () => {
    const others = [z({ id: 'a', start: 1000, end: 4800 }), z({ id: 'b', start: 6000, end: 9000 })];
    expect(zoomSlot(5000, others, 10000)).toEqual({ start: 4800, end: 6000 });
    expect(zoomSlot(500, others, 10000)).toEqual({ start: 0, end: 1000 });
    expect(zoomSlot(9500, others, 10000)).toEqual({ start: 9000, end: 10000 });
    expect(zoomSlot(5000, [], 10000)).toEqual({ start: 4500, end: 6500 });
  });
  it('zoomSlot refuses a time inside a zoom or a gap that is too small', () => {
    expect(zoomSlot(2000, [z({ start: 1000, end: 3000 })], 10000)).toBeNull();
    expect(zoomSlot(1100, [z({ id: 'a', start: 0, end: 1000 }), z({ id: 'b', start: 1200, end: 3000 })], 10000)).toBeNull();
  });
  it('normalizeZoom clamps time, length, scale and ease', () => {
    expect(normalizeZoom(z({ start: -100, end: 50, scale: 9, easeMs: 10 }), 1000)).toMatchObject({
      start: 0, end: MIN_ZOOM_MS, scale: 4, easeMs: 100,
    });
    expect(normalizeZoom(z({ start: 900, end: 2000 }), 1000)).toMatchObject({ start: 700, end: 1000 });
  });
  it('replaceAutoZooms keeps manual zooms and re-suggests auto ones', () => {
    const events: InputEvent[] = [{ type: 'click', t: 3000, x: 10, y: 10, button: 0 }];
    const manual = z({ id: 'm', start: 100, end: 900 });
    const stale = z({ id: 'old', start: 5000, end: 6000, auto: true });
    const out = replaceAutoZooms([stale, manual], events, 10000);
    expect(out.map((x) => x.id === 'm' || x.auto)).toEqual([true, true]);
    expect(out[0].id).toBe('m');
    expect(out[1]).toMatchObject({ start: 2400, end: 4000, auto: true });
  });
});
