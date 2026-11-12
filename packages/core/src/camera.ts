import type { Ms, Point, Rect, Zoom } from './types';
import { clamp01, easeInOutCubic, lerp } from './util';

export interface Camera { scale: number; cx: number; cy: number }

const FOLLOW_LAG_MS = 300;
const FOLLOW_TAPS = 8;

function followTarget(t: Ms, follow: (t: Ms) => Point): Point {
  let x = 0;
  let y = 0;
  for (let k = 0; k < FOLLOW_TAPS; k++) {
    const p = follow(t - (FOLLOW_LAG_MS * k) / (FOLLOW_TAPS - 1));
    x += p.x;
    y += p.y;
  }
  return { x: x / FOLLOW_TAPS, y: y / FOLLOW_TAPS };
}

const clampRange = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

export function cameraAt(srcT: Ms, zooms: Zoom[], frame: Rect, follow: (t: Ms) => Point): Camera {
  const center = { x: frame.x + frame.w / 2, y: frame.y + frame.h / 2 };
  const z = zooms.find((zz) => srcT >= zz.start && srcT <= zz.end);
  if (!z) return { scale: 1, cx: center.x, cy: center.y };

  const ease = Math.max(1, z.easeMs);
  const k = easeInOutCubic(clamp01(Math.min((srcT - z.start) / ease, (z.end - srcT) / ease)));
  const scale = 1 + (z.scale - 1) * k;
  const target = z.target === 'follow' ? followTarget(srcT, follow) : z.target;
  const halfW = frame.w / (2 * scale);
  const halfH = frame.h / (2 * scale);
  return {
    scale,
    cx: clampRange(lerp(center.x, target.x, k), frame.x + halfW, frame.x + frame.w - halfW),
    cy: clampRange(lerp(center.y, target.y, k), frame.y + halfH, frame.y + frame.h - halfH),
  };
}

export function frameToScreen(p: Point, rect: Rect, frame: Rect, cam: Camera): Point {
  const k = (rect.w / frame.w) * cam.scale;
  const left = cam.cx - frame.w / (2 * cam.scale);
  const top = cam.cy - frame.h / (2 * cam.scale);
  return { x: rect.x + (p.x - left) * k, y: rect.y + (p.y - top) * k };
}

export function screenToFrame(p: Point, rect: Rect, frame: Rect, cam: Camera): Point {
  const k = (rect.w / frame.w) * cam.scale;
  const left = cam.cx - frame.w / (2 * cam.scale);
  const top = cam.cy - frame.h / (2 * cam.scale);
  return { x: left + (p.x - rect.x) / k, y: top + (p.y - rect.y) / k };
}
