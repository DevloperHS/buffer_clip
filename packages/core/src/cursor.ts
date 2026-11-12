import type { CursorStyle, InputEvent, Ms, Point } from './types';
import { clamp01, lerp } from './util';

export interface CursorSample { t: Ms; x: number; y: number }
export interface CursorTrack { samples: CursorSample[]; clicks: CursorSample[] }
export interface CursorState {
  x: number;
  y: number;
  opacity: number;
  pressScale: number;
  ripples: { x: number; y: number; progress: number }[];
}

const SNAP_MS = 150;
const PRESS_MS = 240;
const RIPPLE_MS = 300;
const FADE_OUT_MS = 300;
const FADE_IN_MS = 200;
const SMOOTH_WINDOW_MS = 150;
const SMOOTH_TAPS = 8;

export function buildCursorTrack(events: InputEvent[]): CursorTrack {
  const samples: CursorSample[] = [];
  const clicks: CursorSample[] = [];
  for (const e of events) {
    if (e.type === 'move' || e.type === 'click') samples.push({ t: e.t, x: e.x, y: e.y });
    if (e.type === 'click') clicks.push({ t: e.t, x: e.x, y: e.y });
  }
  samples.sort((a, b) => a.t - b.t);
  clicks.sort((a, b) => a.t - b.t);
  return { samples, clicks };
}

/** Largest index i with samples[i].t <= t, or -1. */
function indexAt(s: CursorSample[], t: Ms): number {
  let lo = 0;
  let hi = s.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

const catmull = (a: number, b: number, c: number, d: number, u: number) =>
  0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);

export function rawPositionAt(track: CursorTrack, t: Ms): Point | null {
  const s = track.samples;
  if (s.length === 0) return null;
  const i = indexAt(s, t);
  if (i < 0) return { x: s[0].x, y: s[0].y };
  if (i >= s.length - 1) return { x: s[s.length - 1].x, y: s[s.length - 1].y };
  const p0 = s[Math.max(i - 1, 0)];
  const p1 = s[i];
  const p2 = s[i + 1];
  const p3 = s[Math.min(i + 2, s.length - 1)];
  const u = (t - p1.t) / (p2.t - p1.t || 1);
  return { x: catmull(p0.x, p1.x, p2.x, p3.x, u), y: catmull(p0.y, p1.y, p2.y, p3.y, u) };
}

function smoothedAt(track: CursorTrack, t: Ms, smoothing: number): Point {
  const win = SMOOTH_WINDOW_MS * smoothing;
  if (win < 1) return rawPositionAt(track, t) ?? { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (let k = 0; k < SMOOTH_TAPS; k++) {
    const p = rawPositionAt(track, t - (win * k) / (SMOOTH_TAPS - 1)) ?? { x: 0, y: 0 };
    x += p.x;
    y += p.y;
  }
  return { x: x / SMOOTH_TAPS, y: y / SMOOTH_TAPS };
}

function opacityAt(track: CursorTrack, t: Ms, style: CursorStyle): number {
  if (!style.visible) return 0;
  const hide = style.hideWhenIdleMs;
  const s = track.samples;
  if (hide === null || s.length === 0) return 1;
  const i = indexAt(s, t);
  if (i < 0) return 1;
  const idleFor = t - s[i].t;
  const fadeOut = idleFor > hide ? clamp01(1 - (idleFor - hide) / FADE_OUT_MS) : 1;
  const gapBefore = i > 0 ? s[i].t - s[i - 1].t : 0;
  const fadeIn = gapBefore > hide ? clamp01((t - s[i].t) / FADE_IN_MS) : 1;
  return Math.min(fadeOut, fadeIn);
}

export function cursorAt(track: CursorTrack, t: Ms, style: CursorStyle): CursorState {
  let p = smoothedAt(track, t, style.smoothing);
  let nearest: CursorSample | null = null;
  for (const c of track.clicks) {
    if (Math.abs(t - c.t) < SNAP_MS && (!nearest || Math.abs(t - c.t) < Math.abs(t - nearest.t))) nearest = c;
  }
  if (nearest) {
    const w = 1 - Math.abs(t - nearest.t) / SNAP_MS;
    p = { x: lerp(p.x, nearest.x, w), y: lerp(p.y, nearest.y, w) };
  }

  let pressScale = 1;
  const ripples: CursorState['ripples'] = [];
  for (const c of track.clicks) {
    const dt = t - c.t;
    if (dt >= 0 && dt <= PRESS_MS) pressScale = Math.min(pressScale, 1 - 0.15 * Math.sin((Math.PI * dt) / PRESS_MS));
    if (style.clickRipple && dt >= 0 && dt < RIPPLE_MS) ripples.push({ x: c.x, y: c.y, progress: dt / RIPPLE_MS });
  }
  return { x: p.x, y: p.y, opacity: opacityAt(track, t, style), pressScale, ripples };
}
