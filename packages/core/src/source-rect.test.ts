import { describe, expect, it } from 'vitest';
import { captureSize, decoderJunkRows, sourceContentRect } from './source-rect';

describe('decoder junk rows', () => {
  it('counts the rows Chrome hardware decoders overwrite when the height is not a multiple of 16', () => {
    expect(decoderJunkRows(896)).toBe(0);
    expect(decoderJunkRows(912)).toBe(0);
    expect(decoderJunkRows(898)).toBe(14);
    expect(decoderJunkRows(900)).toBe(12);
  });
});

describe('where the page sits in the captured frame', () => {
  const viewport = { w: 1280, h: 720 };
  it('uses the whole frame, below any junk rows, for older recordings', () => {
    expect(sourceContentRect({ w: 1600, h: 898 }, viewport, false)).toEqual({ x: 0, y: 14, w: 1600, h: 884 });
    expect(sourceContentRect({ w: 1600, h: 896 }, viewport, false)).toEqual({ x: 0, y: 0, w: 1600, h: 896 });
  });
  it('finds the page inside letterbox bars for recordings captured at a fixed size', () => {
    // A 1280x719 page captured into 1600x896: Chrome fits it with thin bars on the sides.
    const r = sourceContentRect({ w: 1600, h: 896 }, { w: 1280, h: 719 }, true);
    expect(r.y).toBe(0);
    expect(r.h).toBe(896);
    expect(r.w).toBeCloseTo(1595.1, 0);
    expect(r.x).toBeCloseTo((1600 - r.w) / 2, 5);
  });
});

describe('capture size', () => {
  it('rounds the capture down to multiples of 16 so decoders never add junk rows', () => {
    expect(captureSize({ w: 1280, h: 719, dpr: 1.25 })).toEqual({ w: 1600, h: 896 });
    expect(captureSize({ w: 1440, h: 900, dpr: 2 })).toEqual({ w: 2880, h: 1792 });
    expect(captureSize({ w: 1536, h: 730, dpr: 1.25 })).toEqual({ w: 1920, h: 912 });
  });
});
