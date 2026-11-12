import type { Clip, InputEvent, Zoom } from '@buffer-clip/core';
import { describe, expect, it } from 'vitest';
import {
  clickMarks, clipSpans, draftClipSpan, gapMarks, moveSpan, pct, pxToMs, ticks, trimDraft, zoomPeakOut, zoomSpan,
} from './timeline-geometry';

const clips: Clip[] = [
  { id: 'a', srcStart: 0, srcEnd: 1000, speed: 1 },
  { id: 'b', srcStart: 3000, srcEnd: 5000, speed: 2 },
];

describe('timeline geometry', () => {
  it('converts between time, percent and pixels', () => {
    expect(pct(500, 2000)).toBe(25);
    expect(pct(5, 0)).toBe(0);
    expect(pxToMs(50, 200, 2000)).toBe(500);
    expect(pxToMs(50, 0, 2000)).toBe(0);
  });
  it('lays clips end to end in output time', () => {
    expect(clipSpans(clips).map(({ start, end }) => [start, end])).toEqual([[0, 1000], [1000, 2000]]);
  });
  it('places gap markers where cuts sit', () => {
    expect(gapMarks(clips, 6000)).toEqual([
      { gap: { srcStart: 1000, srcEnd: 3000 }, at: 1000 },
      { gap: { srcStart: 5000, srcEnd: 6000 }, at: 2000 },
    ]);
  });
  it('maps zooms and clicks into output time', () => {
    const z = { start: 500, end: 4000 } as Zoom;
    expect(zoomSpan(z, clips)).toEqual({ start: 500, end: 1500 });
    const ev: InputEvent[] = [
      { type: 'click', t: 500, x: 0, y: 0, button: 0 },
      { type: 'click', t: 2000, x: 0, y: 0, button: 0 },
      { type: 'click', t: 4000, x: 0, y: 0, button: 0 },
    ];
    expect(clickMarks(ev, clips).map((m) => m.at)).toEqual([500, 1500]);
  });
  it('computes trim drafts in source time using clip speed', () => {
    expect(trimDraft(clips[1], 'start', 100)).toBe(3200);
    expect(trimDraft(clips[1], 'end', -100)).toBe(4800);
  });
  it('moves and resizes spans within bounds', () => {
    const span = { start: 1000, end: 2000 };
    expect(moveSpan(span, 500, 'move', 2500, 300)).toEqual({ start: 1500, end: 2500 });
    expect(moveSpan(span, -5000, 'move', 2500, 300)).toEqual({ start: 0, end: 1000 });
    expect(moveSpan(span, 900, 'start', 2500, 300)).toEqual({ start: 1700, end: 2000 });
    expect(moveSpan(span, 9000, 'end', 2500, 300)).toEqual({ start: 1000, end: 2500 });
    // Neighbouring zooms at 800 and 2200 hem it in.
    expect(moveSpan(span, 900, 'move', 2200, 300, 800)).toEqual({ start: 1200, end: 2200 });
    expect(moveSpan(span, -900, 'start', 2200, 300, 800)).toEqual({ start: 800, end: 2000 });
  });
  it('chooses readable tick spacing', () => {
    expect(ticks(3000)).toEqual([0, 1000, 2000, 3000]);
    expect(ticks(30000).slice(0, 3)).toEqual([0, 2000, 4000]);
    expect(ticks(90000).slice(0, 3)).toEqual([0, 5000, 10000]);
  });
  it('moves only the dragged edge while trimming (no ripple until release)', () => {
    expect(draftClipSpan(clips, 6000, { id: 'b', edge: 'start', srcT: 3400 })).toEqual({ start: 1200, end: 2000 });
    expect(draftClipSpan(clips, 6000, { id: 'a', edge: 'end', srcT: 600 })).toEqual({ start: 0, end: 600 });
    expect(draftClipSpan(clips, 6000, { id: 'b', edge: 'start', srcT: 500 })).toEqual({ start: 0, end: 2000 });
    expect(draftClipSpan(clips, 6000, { id: 'missing', edge: 'end', srcT: 1 })).toBeNull();
  });
  it('finds the output time where a zoom is fully zoomed in', () => {
    const z = (start: number, end: number) => ({ start, end, easeMs: 700 }) as Zoom;
    expect(zoomPeakOut(z(3000, 5000), clips)).toBe(1350);
    expect(zoomPeakOut(z(0, 1000), clips)).toBe(500);
  });
});
