import { BLOB_STOPS, bgStops, DEFAULT_ANGLE, gradientLine, meshBlobs, withAlpha } from './background';
import { cameraAt, type Camera } from './camera';
import { cursorAt, type CursorState, type CursorTrack } from './cursor';
import { contentFrame, frameRect, outputSize } from './layout';
import { sourceContentRect } from './source-rect';
import { outToSrc, srcToOutClamped } from './time';
import type { Background, Clip, Ms, Point, Project, Recording, Rect, Size, Zoom } from './types';

/** Zooms placed on the output timeline: a zoom partly cut away ends (and eases out) at the cut. */
export function outputZooms(zooms: Zoom[], clips: Clip[]): Zoom[] {
  return zooms
    .map((z) => ({ ...z, start: srcToOutClamped(clips, z.start), end: srcToOutClamped(clips, z.end) }))
    .filter((z) => z.end - z.start > 1);
}

/**
 * The camera at an output time. Zoom easing runs on the output timeline, so cuts and speed-ups
 * never make the camera snap: it always eases back out before a cut instead of jumping.
 */
export function cameraForOut(zooms: Zoom[], clips: Clip[], frame: Rect, follow: (srcT: Ms) => Point, outT: Ms): Camera {
  return cameraAt(outT, outputZooms(zooms, clips), frame, (t) => follow(outToSrc(clips, Math.max(0, t))));
}

export function cameraFor(project: Project, recording: Recording, track: CursorTrack, outT: Ms): Camera {
  return cameraForOut(project.zooms, project.clips, contentFrame(recording), (srcT) => {
    const c = cursorAt(track, srcT, project.cursor);
    return { x: c.x, y: c.y };
  }, outT);
}

/** Shared surface of CanvasRenderingContext2D and OffscreenCanvasRenderingContext2D (avoids union-overload errors). */
export type Ctx2D = CanvasState & CanvasTransform & CanvasCompositing & CanvasFillStrokeStyles &
  CanvasShadowStyles & CanvasRect & CanvasDrawPath & CanvasDrawImage & CanvasPathDrawingStyles & CanvasPath;

export interface RenderInput {
  project: Project;
  recording: Recording;
  track: CursorTrack;
  outT: Ms;
  source: CanvasImageSource | null;
  sourceSize: Size;
}

const INK = '#111111';
const ARROW: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0, 16], [4.5, 12], [7.5, 19], [10, 18], [7, 11.5], [12.5, 11.5],
];

function paintBackground(ctx: Ctx2D, bg: Background, out: Size): void {
  const stops = bgStops(bg);
  const angle = bg.angle ?? DEFAULT_ANGLE;
  if (bg.kind === 'solid' || stops.length < 2) {
    ctx.fillStyle = stops[0] ?? '#ffffff';
    ctx.fillRect(0, 0, out.w, out.h);
    return;
  }
  if (bg.kind === 'gradient') {
    const { from, to } = gradientLine(out, angle);
    const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, out.w, out.h);
    return;
  }
  ctx.fillStyle = stops[0];
  ctx.fillRect(0, 0, out.w, out.h);
  for (const b of meshBlobs(out, stops, angle)) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    for (const [at, a] of BLOB_STOPS) g.addColorStop(at, withAlpha(b.color, a));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, out.w, out.h);
  }
}

function roundRectPath(ctx: Ctx2D, r: Rect, radius: number): void {
  const rad = Math.min(radius, r.w / 2, r.h / 2);
  ctx.beginPath();
  ctx.moveTo(r.x + rad, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rad);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rad);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rad);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rad);
  ctx.closePath();
}

function drawCursor(ctx: Ctx2D, c: CursorState, size: number): void {
  for (const r of c.ripples) {
    ctx.beginPath();
    ctx.arc(r.x, r.y, 6 + 18 * r.progress, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(17,17,17,${(1 - r.progress) * 0.5})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (c.opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = c.opacity;
  ctx.translate(c.x, c.y);
  const s = size * 1.25 * c.pressScale;
  ctx.scale(s, s);
  ctx.beginPath();
  ARROW.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}

export function renderFrame(ctx: Ctx2D, input: RenderInput): void {
  const { project, recording, track, outT, source, sourceSize } = input;
  const out = outputSize(project.output);
  const unit = out.h / 1080;
  const srcT = outToSrc(project.clips, outT);
  const frame = contentFrame(recording);
  const bg = project.background;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  paintBackground(ctx, bg, out);

  const rect = frameRect(project, recording);
  const radius = bg.radius * unit;

  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${0.35 * bg.shadow})`;
  ctx.shadowBlur = 60 * unit;
  ctx.shadowOffsetY = 20 * unit;
  // The shadow-casting base sits just inside the frame, so it never shows as a light hairline
  // along the anti-aliased rounded edge of the video.
  const inset = source ? 1.5 : 0;
  roundRectPath(ctx, { x: rect.x + inset, y: rect.y + inset, w: rect.w - inset * 2, h: rect.h - inset * 2 }, Math.max(0, radius - inset));
  ctx.fillStyle = source ? '#111111' : '#FFFFFF';
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, rect, radius);
  ctx.clip();
  const cursor = cursorAt(track, srcT, project.cursor);
  const cam = cameraFor(project, recording, track, outT);
  const k = (rect.w / frame.w) * cam.scale;
  ctx.translate(rect.x, rect.y);
  ctx.scale(k, k);
  ctx.translate(-(cam.cx - frame.w / (2 * cam.scale)), -(cam.cy - frame.h / (2 * cam.scale)));
  if (source) {
    // Map the page onto the part of the frame that really shows it: below decoder junk rows and
    // inside any letterbox bars. Each axis scales on its own, so the picture always covers the
    // frame exactly (a width-only scale read past the image and left a white line).
    const letterboxed = recording.captureFit === 'letterbox';
    const content = sourceContentRect(sourceSize, recording.viewport, letterboxed);
    // Stay a little inside trimmed edges: video compression smears a bar's colour over a pixel or
    // two, and smoothing would pull junk rows in. Losing 1-2 source pixels is invisible.
    const padX = letterboxed ? 1.5 : 0;
    const padY = letterboxed ? 1.5 : content.y > 0 ? 0.5 : 0;
    const rx = (content.w - padX * 2) / recording.viewport.w;
    const ry = (content.h - padY * 2) / recording.viewport.h;
    const sx = Math.max(content.x, content.x + padX + frame.x * rx);
    const sy = Math.max(content.y, content.y + padY + frame.y * ry);
    const sw = Math.min(content.x + content.w - sx, frame.w * rx);
    const sh = Math.min(content.y + content.h - sy, frame.h * ry);
    // Bleed one output pixel past the frame (the clip trims it) so no seam shows at the edges.
    const bleed = 1 / k;
    ctx.drawImage(source, sx, sy, sw, sh, frame.x - bleed, frame.y - bleed, frame.w + bleed * 2, frame.h + bleed * 2);
  }
  if (project.cursor.visible && track.samples.length > 0) drawCursor(ctx, cursor, project.cursor.size);
  ctx.restore();

  ctx.restore();
}
