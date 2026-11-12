import type { InputEvent, Recording, Rect } from '@buffer-clip/core';
import { toRelativeEvents } from './events';
import type { Viewport } from './messages';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function defaultName(d: Date): string {
  const h = d.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `Recording ${MONTHS[d.getMonth()]} ${d.getDate()} at ${hour12}:${minutes} ${h < 12 ? 'AM' : 'PM'}`;
}

export interface BuildInput {
  id: string;
  createdAt: number;
  startedAt: number;
  stoppedAt: number;
  viewport: Viewport;
  crop: Rect | null;
  hasAudio: boolean;
  events: InputEvent[];
}

export function buildRecording(i: BuildInput): Recording {
  const durationMs = Math.round(i.stoppedAt - i.startedAt);
  return {
    id: i.id,
    createdAt: i.createdAt,
    name: defaultName(new Date(i.createdAt)),
    durationMs,
    viewport: i.viewport,
    crop: i.crop,
    hasAudio: i.hasAudio,
    events: toRelativeEvents(i.events, i.startedAt, durationMs),
  };
}
