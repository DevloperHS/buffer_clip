import type { Rect, Size } from './types';

/**
 * Chrome's hardware VP9 decoder overwrites the top rows of frames whose height isn't a multiple
 * of 16 (it decodes into a 16-aligned buffer and the padding lands on top, showing as a green or
 * magenta line). Those rows hold no usable picture, so they're always skipped.
 */
export function decoderJunkRows(height: number): number {
  const rem = Math.round(height) % 16;
  return rem === 0 ? 0 : 16 - rem;
}

/**
 * The part of a decoded frame that shows the recorded page, in source pixels.
 * - Junk rows at the top (see decoderJunkRows) are skipped.
 * - Recordings captured at a fixed size (`letterboxed`) may have thin bars where Chrome fitted the
 *   page into that size; the page is found by fitting the viewport's shape inside the frame.
 */
export function sourceContentRect(source: Size, viewport: Size, letterboxed: boolean): Rect {
  const top = decoderJunkRows(source.h);
  const availW = source.w;
  const availH = source.h - top;
  if (!letterboxed) return { x: 0, y: top, w: availW, h: availH };
  const aspect = viewport.w / viewport.h;
  let w = availW;
  let h = availH;
  if (availW / availH > aspect) w = availH * aspect;
  else h = availW / aspect;
  return { x: (availW - w) / 2, y: top + (availH - h) / 2, w, h };
}

/** Capture size for a page: its device pixels, rounded down to multiples of 16 on both axes. */
export function captureSize(viewport: { w: number; h: number; dpr: number }): Size {
  const down16 = (v: number) => Math.max(16, Math.floor(v / 16) * 16);
  return { w: down16(viewport.w * viewport.dpr), h: down16(viewport.h * viewport.dpr) };
}
