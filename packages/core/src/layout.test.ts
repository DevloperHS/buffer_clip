import { describe, expect, it } from 'vitest';
import { computeLayout, contentFrame, outputSize } from './layout';
import type { Recording } from './types';

describe('layout', () => {
  it('outputSize computes even widths per aspect', () => {
    expect(outputSize({ aspect: '16:9', height: 1080, fps: 30 })).toEqual({ w: 1920, h: 1080 });
    expect(outputSize({ aspect: '9:16', height: 1080, fps: 30 })).toEqual({ w: 608, h: 1080 });
    expect(outputSize({ aspect: '1:1', height: 2160, fps: 60 })).toEqual({ w: 2160, h: 2160 });
  });
  it('contentFrame uses crop when present', () => {
    const r = { viewport: { w: 1280, h: 720, dpr: 2 }, crop: null } as Recording;
    expect(contentFrame(r)).toEqual({ x: 0, y: 0, w: 1280, h: 720 });
    expect(contentFrame({ ...r, crop: { x: 10, y: 20, w: 300, h: 200 } })).toEqual({ x: 10, y: 20, w: 300, h: 200 });
  });
  it('computeLayout contain-fits and centres inside padding', () => {
    const r = computeLayout({ w: 1920, h: 1080 }, 16 / 9, 64);
    expect(r.h).toBeCloseTo(952);
    expect(r.w).toBeCloseTo(952 * (16 / 9));
    expect(r.x).toBeCloseTo((1920 - r.w) / 2);
    expect(r.y).toBeCloseTo(64);
    const tall = computeLayout({ w: 1000, h: 1000 }, 0.5, 0);
    expect(tall).toEqual({ x: 250, y: 0, w: 500, h: 1000 });
  });
});
