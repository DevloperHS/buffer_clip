import { describe, expect, it } from 'vitest';
import { fadeEdges, timeStretch } from './audio';
import { detectIdle } from './idle';
import { motionFromLuma } from './motion';
import { cameraForOut, outputZooms } from './render';
import { cutTimes } from './time';
import type { Clip, InputEvent, Zoom } from './types';

const clip = (srcStart: number, srcEnd: number, speed = 1): Clip => ({ id: `${srcStart}`, srcStart, srcEnd, speed });
const zoom = (o: Partial<Zoom> = {}): Zoom => ({ id: 'z', start: 1000, end: 5000, scale: 2, target: { x: 750, y: 250 }, easeMs: 500, auto: true, ...o });

describe('camera across cuts', () => {
  it('maps zooms onto the output timeline, clamped at cuts', () => {
    // 2s..6s of source is cut away.
    const clips = [clip(0, 2000), clip(6000, 9000)];
    expect(outputZooms([zoom()], clips)).toEqual([expect.objectContaining({ start: 1000, end: 2000 })]);
    expect(outputZooms([zoom({ start: 3000, end: 5000 })], clips)).toEqual([]);
  });
  it('eases a zoom out before the cut instead of snapping at it', () => {
    const clips = [clip(0, 2000), clip(6000, 9000)];
    const frame = { x: 0, y: 0, w: 1000, h: 500 };
    const at = (outT: number) => cameraForOut([zoom()], clips, frame, () => ({ x: 0, y: 0 }), outT).scale;
    expect(at(1999)).toBeLessThan(1.05); // back to (almost) full frame right before the cut
    expect(at(2001)).toBe(1); // and nothing to snap from right after it
    expect(at(1500)).toBeCloseTo(2); // fully zoomed in the middle
  });
});

describe('cut times', () => {
  it('lists output times where the source jumps, not plain speed changes', () => {
    const clips = [clip(0, 2000), clip(2000, 4000, 4), clip(9000, 10000)];
    expect(cutTimes(clips)).toEqual([2500]);
  });
});

describe('motion-aware idle detection', () => {
  const events: InputEvent[] = [
    { type: 'click', t: 1000, x: 0, y: 0, button: 0 },
    { type: 'click', t: 9000, x: 0, y: 0, button: 0 },
  ];
  it('cuts a still stretch with no input', () => {
    const clips = detectIdle(events, 10000);
    expect(clips.some((c) => c.srcStart <= 4000 && c.srcEnd >= 6000)).toBe(false);
  });
  it('keeps the parts where the screen is moving, even without input', () => {
    // Motion between 3s and 6s.
    const values = Array.from({ length: 50 }, (_, i) => (i * 200 >= 3000 && i * 200 < 6000 ? 0.05 : 0));
    const clips = detectIdle(events, 10000, {}, { stepMs: 200, values });
    const covers = (t: number) => clips.find((c) => t >= c.srcStart && t < c.srcEnd);
    expect(covers(4500)?.speed).toBe(1);
    expect(covers(4500)?.idle).toBeUndefined();
  });
});

describe('motion from frames', () => {
  it('measures the mean change between consecutive frames', () => {
    const a = new Uint8Array([0, 0, 0, 0]);
    const b = new Uint8Array([255, 255, 0, 0]);
    expect(motionFromLuma([a, a, b])).toEqual([0, 0, 0.5]);
  });
});

describe('audio for sped-up clips and cuts', () => {
  it('time-stretches to the target length without changing pitch much', () => {
    const sr = 8000;
    const tone = Float32Array.from({ length: sr }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / sr));
    const out = timeStretch(tone, 4, sr);
    expect(out.length).toBe(sr / 4);
    // Zero crossings per sample stay roughly the same: same pitch, shorter sound.
    const zc = (x: Float32Array) => x.reduce((n, v, i) => n + (i > 0 && Math.sign(v) !== Math.sign(x[i - 1]) ? 1 : 0), 0) / x.length;
    expect(zc(out)).toBeGreaterThan(zc(tone) * 0.7);
    expect(zc(out)).toBeLessThan(zc(tone) * 1.3);
  });
  it('fades the edges so cuts do not click', () => {
    const x = new Float32Array(100).fill(1);
    fadeEdges(x, 10);
    expect(x[0]).toBe(0);
    expect(x[99]).toBe(0);
    expect(x[50]).toBe(1);
    expect(x[5]).toBeGreaterThan(0);
    expect(x[5]).toBeLessThan(1);
  });
});
