import type { Ms, MotionTrack } from './types';

/** Mean change between consecutive low-res luma frames, 0..1. The first frame has no change. */
export function motionFromLuma(frames: Uint8Array[]): number[] {
  return frames.map((f, i) => {
    if (i === 0) return 0;
    const prev = frames[i - 1];
    const n = Math.min(f.length, prev.length);
    if (n === 0) return 0;
    let sum = 0;
    for (let j = 0; j < n; j++) sum += Math.abs(f[j] - prev[j]);
    return sum / n / 255;
  });
}

/** Below this the screen is effectively still (a blinking caret or a small spinner). */
export const MOTION_THRESHOLD = 0.004;

/** Spans of source time where the picture is visibly changing, widened by `padMs` and merged. */
export function activeSpans(motion: MotionTrack, padMs: Ms, threshold = MOTION_THRESHOLD): Array<[Ms, Ms]> {
  const spans: Array<[Ms, Ms]> = [];
  motion.values.forEach((v, i) => {
    if (v <= threshold) return;
    const start = Math.max(0, (i - 1) * motion.stepMs - padMs);
    const end = i * motion.stepMs + padMs;
    const last = spans[spans.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else spans.push([start, end]);
  });
  return spans;
}
