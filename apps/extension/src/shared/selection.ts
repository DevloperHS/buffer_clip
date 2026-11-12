import type { Point, Rect } from '@buffer-clip/core';

export const MIN_AREA = 64;

const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

export function normalizeRect(a: Point, b: Point, viewport: { w: number; h: number }, min = MIN_AREA): Rect | null {
  const x0 = Math.round(clamp(Math.min(a.x, b.x), viewport.w));
  const y0 = Math.round(clamp(Math.min(a.y, b.y), viewport.h));
  const x1 = Math.round(clamp(Math.max(a.x, b.x), viewport.w));
  const y1 = Math.round(clamp(Math.max(a.y, b.y), viewport.h));
  const w = x1 - x0;
  const h = y1 - y0;
  return w >= min && h >= min ? { x: x0, y: y0, w, h } : null;
}
