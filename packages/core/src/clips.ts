import { outToSrc } from './time';
import type { Clip, Ms } from './types';
import { newId } from './util';

export const MIN_CLIP_MS = 100;

export function splitClip(clips: Clip[], outT: Ms): Clip[] {
  let acc = 0;
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const len = (c.srcEnd - c.srcStart) / c.speed;
    if (outT > acc + 1 && outT < acc + len - 1) {
      const srcT = outToSrc(clips, outT);
      const left: Clip = { ...c, srcEnd: srcT };
      const right: Clip = { ...c, id: newId(), srcStart: srcT };
      return [...clips.slice(0, i), left, right, ...clips.slice(i + 1)];
    }
    acc += len;
  }
  return clips;
}

export function deleteClip(clips: Clip[], id: string): Clip[] {
  return clips.filter((c) => c.id !== id);
}

export function trimClip(
  clips: Clip[],
  id: string,
  edge: 'start' | 'end',
  srcT: Ms,
  durationMs: Ms,
): Clip[] {
  const i = clips.findIndex((c) => c.id === id);
  if (i < 0) return clips;
  const c = clips[i];
  const prevEnd = i > 0 ? clips[i - 1].srcEnd : 0;
  const nextStart = i < clips.length - 1 ? clips[i + 1].srcStart : durationMs;
  const next: Clip =
    edge === 'start'
      ? { ...c, srcStart: Math.min(Math.max(srcT, prevEnd), c.srcEnd - MIN_CLIP_MS) }
      : { ...c, srcEnd: Math.max(Math.min(srcT, nextStart), c.srcStart + MIN_CLIP_MS) };
  return clips.map((x, j) => (j === i ? next : x));
}

export function setClipSpeed(clips: Clip[], id: string, speed: number): Clip[] {
  const s = Math.min(16, Math.max(0.25, speed));
  return clips.map((c) => (c.id === id ? { ...c, speed: s } : c));
}
