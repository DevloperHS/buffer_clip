import type { Background, Point, Size } from './types';

/** Gradient angle when a background doesn't set one (CSS convention: 0° points up, 90° right). */
export const DEFAULT_ANGLE = 135;

export const bgStops = (bg: Pick<Background, 'value'>): string[] =>
  bg.value.split(',').map((s) => s.trim()).filter(Boolean);

/** Endpoints of a linear gradient across a box, matching CSS `linear-gradient(<angle>deg, …)`. */
export function gradientLine(size: Size, angleDeg: number): { from: Point; to: Point } {
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const half = (Math.abs(size.w * dx) + Math.abs(size.h * dy)) / 2;
  const c = { x: size.w / 2, y: size.h / 2 };
  return { from: { x: c.x - dx * half, y: c.y - dy * half }, to: { x: c.x + dx * half, y: c.y + dy * half } };
}

/** Where the colour blobs of a mesh background sit, as fractions of the box, before rotation. */
const ANCHORS: ReadonlyArray<Point> = [
  { x: 0.12, y: 0.18 },
  { x: 0.88, y: 0.22 },
  { x: 0.72, y: 0.88 },
  { x: 0.18, y: 0.82 },
  { x: 0.5, y: 0.5 },
];

export interface Blob {
  x: number;
  y: number;
  r: number;
  color: string;
}

/**
 * A mesh ("abstract") background: the first stop is the base colour; each further stop is a soft
 * radial blob. The angle turns the blob layout around the centre so one palette gives many looks.
 */
export function meshBlobs(size: Size, stops: string[], angleDeg: number): Blob[] {
  const turn = ((angleDeg - DEFAULT_ANGLE) * Math.PI) / 180;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const r = 0.62 * Math.max(size.w, size.h);
  return stops.slice(1, 1 + ANCHORS.length).map((color, i) => {
    const ax = ANCHORS[i].x - 0.5;
    const ay = ANCHORS[i].y - 0.5;
    return {
      x: (0.5 + ax * cos - ay * sin) * size.w,
      y: (0.5 + ax * sin + ay * cos) * size.h,
      r,
      color,
    };
  });
}

/** `#rgb` / `#rrggbb` with an alpha, for blob fall-off. Other colour syntaxes pass through opaque. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Blob fall-off: solid at the centre, half at 45% of the radius, gone at the edge (CSS uses the same). */
export const BLOB_STOPS: ReadonlyArray<readonly [number, number]> = [[0, 1], [0.45, 0.5], [1, 0]];

/** The same background as CSS, for swatches and UI previews. */
export function backgroundCss(bg: Pick<Background, 'kind' | 'value' | 'angle'>): string {
  const stops = bgStops(bg);
  const angle = bg.angle ?? DEFAULT_ANGLE;
  if (bg.kind === 'solid' || stops.length < 2) return stops[0] ?? '#ffffff';
  if (bg.kind === 'gradient') return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
  const blobs = meshBlobs({ w: 100, h: 100 }, stops, angle).map(
    (b) => `radial-gradient(62% 62% at ${b.x.toFixed(1)}% ${b.y.toFixed(1)}%, ${b.color} 0%, ${withAlpha(b.color, 0.5)} 45%, ${withAlpha(b.color, 0)} 100%)`,
  );
  return [...blobs, stops[0]].join(', ');
}
