import type { InputEvent, Ms, Point, Zoom } from './types';
import { newId } from './util';

export const ZOOM_DEFAULTS = {
  scale: 1.8,
  easeMs: 700,
  leadMs: 600,
  tailMs: 1000,
  groupMs: 2500,
  groupPx: 300,
  keyGapMs: 1500,
  keyMin: 3,
  mergeGapMs: 500,
} as const;

type Click = Extract<InputEvent, { type: 'click' }>;
const D = ZOOM_DEFAULTS;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function makeZoom(start: Ms, end: Ms, target: Point | 'follow', durationMs: Ms): Zoom {
  return {
    id: newId(),
    start: Math.max(0, start),
    end: Math.min(durationMs, end),
    scale: D.scale,
    target,
    easeMs: D.easeMs,
    auto: true,
  };
}

function clickZooms(clicks: Click[], durationMs: Ms): Zoom[] {
  const groups: Click[][] = [];
  for (const c of clicks) {
    const g = groups[groups.length - 1];
    const prev = g?.[g.length - 1];
    if (prev && c.t - prev.t <= D.groupMs && dist(prev, c) <= D.groupPx) g.push(c);
    else groups.push([c]);
  }
  return groups.map((g) => {
    const cx = g.reduce((s, c) => s + c.x, 0) / g.length;
    const cy = g.reduce((s, c) => s + c.y, 0) / g.length;
    const spread = Math.max(...g.map((c) => dist(c, { x: cx, y: cy }))) * 2;
    const target = spread > D.groupPx ? 'follow' : { x: cx, y: cy };
    return makeZoom(g[0].t - D.leadMs, g[g.length - 1].t + D.tailMs, target, durationMs);
  });
}

function keyZooms(events: InputEvent[], clicks: Click[], durationMs: Ms): Zoom[] {
  const keys = events.filter((e) => e.type === 'key').sort((a, b) => a.t - b.t);
  const pointer = events
    .filter((e): e is Extract<InputEvent, { type: 'move' | 'click' }> => e.type === 'move' || e.type === 'click')
    .sort((a, b) => a.t - b.t);
  const bursts: Ms[][] = [];
  for (const k of keys) {
    const b = bursts[bursts.length - 1];
    if (b && k.t - b[b.length - 1] <= D.keyGapMs) b.push(k.t);
    else bursts.push([k.t]);
  }
  const out: Zoom[] = [];
  for (const b of bursts) {
    if (b.length < D.keyMin) continue;
    const s = b[0];
    const e = b[b.length - 1];
    if (clicks.some((c) => c.t >= s && c.t <= e)) continue;
    const before = pointer.filter((p) => p.t <= s);
    const at = before[before.length - 1];
    if (!at) continue;
    out.push(makeZoom(s - D.leadMs, e + D.tailMs, { x: at.x, y: at.y }, durationMs));
  }
  return out;
}

export function mergeZooms(zooms: Zoom[]): Zoom[] {
  const sorted = [...zooms].sort((a, b) => a.start - b.start);
  const out: Zoom[] = [];
  for (const z of sorted) {
    const cur = out[out.length - 1];
    if (cur && z.start - cur.end < D.mergeGapMs) {
      const far =
        cur.target === 'follow' ||
        z.target === 'follow' ||
        dist(cur.target, z.target) > D.groupPx;
      out[out.length - 1] = {
        ...cur,
        end: Math.max(cur.end, z.end),
        scale: Math.max(cur.scale, z.scale),
        target: far ? 'follow' : cur.target,
      };
    } else out.push(z);
  }
  return out;
}

export function suggestZooms(events: InputEvent[], durationMs: Ms): Zoom[] {
  const clicks = events.filter((e): e is Click => e.type === 'click').sort((a, b) => a.t - b.t);
  return mergeZooms([...clickZooms(clicks, durationMs), ...keyZooms(events, clicks, durationMs)]);
}

export const MIN_ZOOM_MS = 300;

export function createZoom(srcT: Ms, durationMs: Ms, target: Point | 'follow'): Zoom {
  const end = Math.min(durationMs, srcT + 1500);
  const start = Math.max(0, Math.min(srcT - 500, end - MIN_ZOOM_MS));
  return { id: newId(), start, end, scale: D.scale, target, easeMs: D.easeMs, auto: false };
}

/**
 * Where a zoom added at srcT can go without overlapping the others: about 2s around srcT,
 * kept inside the free gap that contains it. Null when srcT is inside a zoom or the gap is too short.
 */
export function zoomSlot(srcT: Ms, zooms: Zoom[], durationMs: Ms): { start: Ms; end: Ms } | null {
  if (zooms.some((z) => srcT >= z.start && srcT < z.end)) return null;
  const lo = Math.max(0, ...zooms.filter((z) => z.end <= srcT).map((z) => z.end));
  const hi = Math.min(durationMs, ...zooms.filter((z) => z.start > srcT).map((z) => z.start));
  if (hi - lo < MIN_ZOOM_MS) return null;
  let start = Math.max(lo, srcT - 500);
  let end = Math.min(hi, srcT + 1500);
  if (end - start < MIN_ZOOM_MS) {
    end = Math.min(hi, start + MIN_ZOOM_MS);
    start = Math.max(lo, end - MIN_ZOOM_MS);
  }
  return { start, end };
}

export function normalizeZoom(z: Zoom, durationMs: Ms): Zoom {
  const start = Math.min(Math.max(0, z.start), Math.max(0, durationMs - MIN_ZOOM_MS));
  const end = Math.min(Math.max(z.end, start + MIN_ZOOM_MS), durationMs);
  return {
    ...z,
    start,
    end,
    scale: Math.min(4, Math.max(1, z.scale)),
    easeMs: Math.min(2000, Math.max(100, z.easeMs)),
  };
}

export function replaceAutoZooms(zooms: Zoom[], events: InputEvent[], durationMs: Ms): Zoom[] {
  const manual = zooms.filter((z) => !z.auto);
  return [...manual, ...suggestZooms(events, durationMs)].sort((a, b) => a.start - b.start);
}
