import type { Clip, InputEvent, Ms } from './types';
import { newId } from './util';

export interface IdleOptions { minIdleMs: Ms; padMs: Ms; cutMs: Ms; speed: number }
export const DEFAULT_IDLE: IdleOptions = { minIdleMs: 1500, padMs: 400, cutMs: 3000, speed: 8 };

interface Region { start: Ms; end: Ms; kind: 'cut' | 'speed' }

export function detectIdle(
  events: InputEvent[],
  durationMs: Ms,
  opts: Partial<IdleOptions> = {},
): Clip[] {
  const o = { ...DEFAULT_IDLE, ...opts };
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
