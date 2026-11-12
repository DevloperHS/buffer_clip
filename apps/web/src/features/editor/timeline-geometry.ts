import {
  listGaps, srcToOut, srcToOutClamped, trimClip,
  type Clip, type Gap, type InputEvent, type Ms, type Zoom,
} from '@buffer-clip/core';

export interface Span { start: Ms; end: Ms }
export type SpanMode = 'move' | 'start' | 'end';

export const pct = (t: Ms, total: Ms): number => (total > 0 ? (t / total) * 100 : 0);
export const pxToMs = (dxPx: number, widthPx: number, total: Ms): Ms => (widthPx > 0 ? (dxPx / widthPx) * total : 0);

export function clipSpans(clips: Clip[]): Array<{ clip: Clip } & Span> {
  let acc = 0;
  return clips.map((clip) => {
    const len = (clip.srcEnd - clip.srcStart) / clip.speed;
    const span = { clip, start: acc, end: acc + len };
    acc += len;
    return span;
  });
}

export function gapMarks(clips: Clip[], durationMs: Ms): Array<{ gap: Gap; at: Ms }> {
  return listGaps(clips, durationMs).map((gap) => ({ gap, at: srcToOutClamped(clips, gap.srcStart) }));
}

export function zoomSpan(z: Pick<Zoom, 'start' | 'end'>, clips: Clip[]): Span {
  return { start: srcToOutClamped(clips, z.start), end: srcToOutClamped(clips, z.end) };
}

export function clickMarks(events: InputEvent[], clips: Clip[]): Array<{ key: string; at: Ms }> {
  const out: Array<{ key: string; at: Ms }> = [];
  for (const e of events) {
    if (e.type !== 'click') continue;
    const at = srcToOut(clips, e.t);
    if (at !== null) out.push({ key: `${e.t}-${e.x}-${e.y}`, at });
  }
  return out;
}

export function trimDraft(clip: Clip, edge: 'start' | 'end', dOut: Ms): Ms {
  return (edge === 'start' ? clip.srcStart : clip.srcEnd) + dOut * clip.speed;
}

/** Move or resize a span, kept within [lo, hi] (the neighbouring zooms, or the whole timeline). */
export function moveSpan(span: Span, d: Ms, mode: SpanMode, hi: Ms, minLen: Ms, lo: Ms = 0): Span {
  if (mode === 'move') {
    const len = span.end - span.start;
    const start = Math.min(Math.max(lo, span.start + d), Math.max(lo, hi - len));
    return { start, end: start + len };
  }
  if (mode === 'start') return { start: Math.min(Math.max(lo, span.start + d), span.end - minLen), end: span.end };
  return { start: span.start, end: Math.max(Math.min(hi, span.end + d), span.start + minLen) };
}

export function ticks(total: Ms): Ms[] {
  const step = total <= 20_000 ? 1000 : total <= 40_000 ? 2000 : 5000;
  const out: Ms[] = [];
  for (let t = 0; t <= total; t += step) out.push(t);
  return out;
}

/**
 * Where the dragged clip should be drawn mid-trim: only the grabbed edge moves (it follows the
 * pointer); neighbours stay put. The timeline reflows once the trim is committed.
 */
export function draftClipSpan(
  clips: Clip[],
  durationMs: Ms,
  draft: { id: string; edge: 'start' | 'end'; srcT: Ms },
): Span | null {
  const span = clipSpans(clips).find((s) => s.clip.id === draft.id);
  if (!span) return null;
  const trimmed = trimClip(clips, draft.id, draft.edge, draft.srcT, durationMs).find((c) => c.id === draft.id);
  if (!trimmed) return null;
  const { clip } = span;
  return draft.edge === 'start'
    ? { start: span.start + (trimmed.srcStart - clip.srcStart) / clip.speed, end: span.end }
    : { start: span.start, end: span.end + (trimmed.srcEnd - clip.srcEnd) / clip.speed };
}

/** Output time where a zoom has finished easing in, so its effect is visible in the preview. */
export function zoomPeakOut(z: Pick<Zoom, 'start' | 'end' | 'easeMs'>, clips: Clip[]): Ms {
  return srcToOutClamped(clips, Math.min(z.start + z.easeMs, (z.start + z.end) / 2));
}
