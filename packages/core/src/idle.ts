import { activeSpans } from './motion';
import type { Clip, InputEvent, MotionTrack, Ms } from './types';
import { newId } from './util';

export interface IdleOptions { minIdleMs: Ms; padMs: Ms; cutMs: Ms; speed: number }
// 4x keeps sped-up stretches watchable (and audible); 8x looked frantic.
export const DEFAULT_IDLE: IdleOptions = { minIdleMs: 1500, padMs: 400, cutMs: 3000, speed: 4 };

/** Pieces of a region shorter than this stay at normal speed. */
const MIN_PIECE_MS = 700;

/** Remove the spans where the screen is moving from an idle region; what's left is truly idle. */
function subtractActive(r: Region, active: Array<[Ms, Ms]>): Region[] {
  let pieces: Array<[Ms, Ms]> = [[r.start, r.end]];
  for (const [a, b] of active) {
    pieces = pieces.flatMap(([s, e]): Array<[Ms, Ms]> => {
      if (b <= s || a >= e) return [[s, e]];
      return [[s, Math.min(e, a)], [Math.max(s, b), e]].filter(([x, y]) => y > x) as Array<[Ms, Ms]>;
    });
  }
  if (pieces.length === 1 && pieces[0][0] === r.start && pieces[0][1] === r.end) return [r];
  return pieces.flatMap(([start, end]): Region[] => {
    const len = end - start;
    if (len < MIN_PIECE_MS) return [];
    return [{ start, end, kind: len >= 3000 ? 'cut' : 'speed' }];
  });
}

interface Region { start: Ms; end: Ms; kind: 'cut' | 'speed' }

export function detectIdle(
  events: InputEvent[],
  durationMs: Ms,
  opts: Partial<IdleOptions> = {},
  motion?: MotionTrack,
): Clip[] {
  const o = { ...DEFAULT_IDLE, ...opts };
  const active = motion ? activeSpans(motion, o.padMs) : [];
  const times = events.map((e) => e.t).sort((a, b) => a - b);
  if (times.length === 0) return [{ id: newId(), srcStart: 0, srcEnd: durationMs, speed: 1 }];

  const regions: Region[] = [];
  const first = times[0];
  const last = times[times.length - 1];
  if (first - o.padMs > 0) regions.push({ start: 0, end: first - o.padMs, kind: 'cut' });
  for (let i = 1; i < times.length; i++) {
    const a = times[i - 1];
    const b = times[i];
    if (b - a < o.minIdleMs) continue;
    const start = a + o.padMs;
    const end = b - o.padMs;
    if (end <= start) continue;
    regions.push({ start, end, kind: end - start >= o.cutMs ? 'cut' : 'speed' });
  }
  if (last + o.padMs < durationMs) regions.push({ start: last + o.padMs, end: durationMs, kind: 'cut' });
  // Moving footage is never idle, even when nobody touched the mouse.
  if (active.length) regions.splice(0, regions.length, ...regions.flatMap((r) => subtractActive(r, active)));

  const clips: Clip[] = [];
  const push = (srcStart: Ms, srcEnd: Ms, speed: number, idle = false) => {
    if (srcEnd - srcStart <= 0) return;
    clips.push(idle ? { id: newId(), srcStart, srcEnd, speed, idle } : { id: newId(), srcStart, srcEnd, speed });
  };
  let cursor = 0;
  for (const r of regions) {
    push(cursor, r.start, 1);
    if (r.kind === 'speed') push(r.start, r.end, o.speed, true);
    cursor = r.end;
  }
  push(cursor, durationMs, 1);
  return clips;
}
