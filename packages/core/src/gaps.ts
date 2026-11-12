import type { Clip, Ms } from './types';
import { newId } from './util';

export interface Gap { srcStart: Ms; srcEnd: Ms }

export function listGaps(clips: Clip[], durationMs: Ms): Gap[] {
  const gaps: Gap[] = [];
  let cursor = 0;
  for (const c of clips) {
    if (c.srcStart - cursor >= 1) gaps.push({ srcStart: cursor, srcEnd: c.srcStart });
    cursor = Math.max(cursor, c.srcEnd);
  }
  if (durationMs - cursor >= 1) gaps.push({ srcStart: cursor, srcEnd: durationMs });
  return gaps;
}

export function fillGap(clips: Clip[], gap: Gap, speed = 8): Clip[] {
  const clip: Clip = { id: newId(), srcStart: gap.srcStart, srcEnd: gap.srcEnd, speed, idle: true };
  return [...clips, clip].sort((a, b) => a.srcStart - b.srcStart);
}

export function cycleIdleClip(clips: Clip[], id: string): Clip[] {
  const clip = clips.find((c) => c.id === id);
  if (!clip?.idle) return clips;
  if (clip.speed !== 1) return clips.map((c) => (c.id === id ? { ...c, speed: 1 } : c));
  if (clips.length <= 1) return clips;
  return clips.filter((c) => c.id !== id);
}
