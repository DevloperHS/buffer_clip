import type { Clip, Ms } from './types';

const clipOutLen = (c: Clip): Ms => (c.srcEnd - c.srcStart) / c.speed;

export function outputDuration(clips: Clip[]): Ms {
  return clips.reduce((sum, c) => sum + clipOutLen(c), 0);
}

export function outToSrc(clips: Clip[], outT: Ms): Ms {
  if (clips.length === 0) return 0;
  if (outT <= 0) return clips[0].srcStart;
  let acc = 0;
  for (const c of clips) {
    const len = clipOutLen(c);
    if (outT < acc + len) return c.srcStart + (outT - acc) * c.speed;
    acc += len;
  }
  return clips[clips.length - 1].srcEnd;
}

export function srcToOut(clips: Clip[], srcT: Ms): Ms | null {
  let acc = 0;
  for (const c of clips) {
    if (srcT >= c.srcStart && srcT <= c.srcEnd) return acc + (srcT - c.srcStart) / c.speed;
    acc += clipOutLen(c);
  }
  return null;
}

export interface PlaybackPosition { clipIndex: number; srcT: Ms; outT: Ms; jumped: boolean }

export function resolvePlayback(clips: Clip[], srcT: Ms): PlaybackPosition | null {
  let acc = 0;
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    if (srcT < c.srcStart) return { clipIndex: i, srcT: c.srcStart, outT: acc, jumped: true };
    if (srcT < c.srcEnd) return { clipIndex: i, srcT, outT: acc + (srcT - c.srcStart) / c.speed, jumped: false };
    acc += clipOutLen(c);
  }
  return null;
}

/** Output times where the source jumps (a cut), as opposed to a plain speed change. */
export function cutTimes(clips: Clip[]): Ms[] {
  const out: Ms[] = [];
  let acc = 0;
  for (let i = 0; i < clips.length - 1; i++) {
    acc += clipOutLen(clips[i]);
    if (Math.abs(clips[i + 1].srcStart - clips[i].srcEnd) > 1) out.push(acc);
  }
  return out;
}

export function srcToOutClamped(clips: Clip[], srcT: Ms): Ms {
  let acc = 0;
  for (const c of clips) {
    if (srcT < c.srcStart) return acc;
    if (srcT <= c.srcEnd) return acc + (srcT - c.srcStart) / c.speed;
    acc += clipOutLen(c);
  }
  return acc;
}
