import {
  cameraFor, contentFrame, cursorAt, frameRect, frameToScreen, screenToFrame,
  type Camera, type CursorTrack, type Ms, type Point, type Project, type Recording, type Rect, type Size, type Zoom,
} from '@buffer-clip/core';

/** Magic-open: k=0 shows the raw recording edge to edge, k=1 the styled frame. */
export function withIntro(project: Project, k: number): Project {
  if (k >= 1) return project;
  const b = project.background;
  return { ...project, background: { ...b, padding: b.padding * k, radius: b.radius * k, shadow: b.shadow * k } };
}

export function fitInside(box: Size, aspect: number): Size {
  if (box.w <= 0 || box.h <= 0) return { w: 0, h: 0 };
  const w = Math.min(box.w, box.h * aspect);
  return { w, h: w / aspect };
}

export function toCanvasPoint(clientX: number, clientY: number, r: DOMRect, canvas: Size): Point {
  return {
    x: ((clientX - r.left) * canvas.w) / r.width,
    y: ((clientY - r.top) * canvas.h) / r.height,
  };
}

/** The zoom's visible window, drawn on the preview at its current camera, in output pixels. */
export function zoomGhostRect(project: Project, recording: Recording, track: CursorTrack, zoom: Zoom, srcT: Ms): Rect {
  const frame = contentFrame(recording);
  const rect = frameRect(project, recording);
  const cam = cameraFor(project, recording, track, srcT);
  let target: Point;
  if (zoom.target === 'follow') {
    const c = cursorAt(track, zoom.start, project.cursor);
    target = { x: c.x, y: c.y };
  } else {
    target = zoom.target;
  }
  const w = frame.w / zoom.scale;
  const h = frame.h / zoom.scale;
  const x = Math.min(Math.max(target.x - w / 2, frame.x), frame.x + frame.w - w);
  const y = Math.min(Math.max(target.y - h / 2, frame.y), frame.y + frame.h - h);
  const tl = frameToScreen({ x, y }, rect, frame, cam);
  const br = frameToScreen({ x: x + w, y: y + h }, rect, frame, cam);
  return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
}

export const ZOOM_SCALE_MIN = 1.2;
export const ZOOM_SCALE_MAX = 4;

/**
 * The box being drawn for a zoom area: anchored where the drag began, growing toward the pointer,
 * locked to the frame's aspect (a zoom always shows a frame-shaped window).
 */
export function lockedBox(a: Point, b: Point, aspect: number): Rect {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const w = Math.max(Math.abs(dx), Math.abs(dy) * aspect);
  const h = w / aspect;
  return { x: dx < 0 ? a.x - w : a.x, y: dy < 0 ? a.y - h : a.y, w, h };
}

/** A box drawn on the preview (output px) as a zoom: aimed at its centre, scaled so it fills the frame. */
export function boxToZoom(box: Rect, rect: Rect, frame: Rect, cam: Camera): { target: Point; scale: number } {
  const tl = screenToFrame({ x: box.x, y: box.y }, rect, frame, cam);
  const br = screenToFrame({ x: box.x + box.w, y: box.y + box.h }, rect, frame, cam);
  const raw = frame.w / Math.max(1e-6, br.x - tl.x);
  const scale = Math.round(Math.min(ZOOM_SCALE_MAX, Math.max(ZOOM_SCALE_MIN, raw)) * 10) / 10;
  const cx = Math.min(Math.max((tl.x + br.x) / 2, frame.x), frame.x + frame.w);
  const cy = Math.min(Math.max((tl.y + br.y) / 2, frame.y), frame.y + frame.h);
  return { target: { x: Math.round(cx), y: Math.round(cy) }, scale };
}
