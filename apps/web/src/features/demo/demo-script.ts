import { easeInOutCubic, type InputEvent, type Ms, type Point } from '@buffer-clip/core';

export const DEMO_VIEWPORT = { w: 1280, h: 720, dpr: 1 };
export const DEMO_NAME = 'How to use Buffer Clip';
export const DEMO_TEXT = 'Launch plan';
export const DEMO_TARGETS = {
  newButton: { x: 1100, y: 52 },
  input: { x: 640, y: 338 },
  createButton: { x: 752, y: 436 },
} as const;

export interface DemoScene {
  modalOpen: boolean;
  typed: string;
  created: boolean;
  pressed: 'new' | 'create' | null;
}

export interface DemoScript {
  durationMs: Ms;
  events: InputEvent[];
  sceneAt(t: Ms): DemoScene;
}

const DURATION = 11000;
const CLICK_NEW = 1500;
const CLICK_INPUT = 3000;
const KEY_START = 3300;
const KEY_STEP = 100;
const CLICK_CREATE = 9700;
const PRESS_MS = 150;
const SAMPLE_MS = 33;

function moveSegment(t0: Ms, t1: Ms, a: Point, b: Point): InputEvent[] {
  const out: InputEvent[] = [];
  for (let t = t0; t <= t1; t += SAMPLE_MS) {
    const k = easeInOutCubic((t - t0) / (t1 - t0));
    out.push({ type: 'move', t, x: Math.round(a.x + (b.x - a.x) * k), y: Math.round(a.y + (b.y - a.y) * k) });
  }
  const last = out[out.length - 1];
  if (last.t !== t1) out.push({ type: 'move', t: t1, x: b.x, y: b.y });
  return out;
}

const click = (t: Ms, p: Point): InputEvent => ({ type: 'click', t, x: p.x, y: p.y, button: 0 });

export function buildDemoScript(): DemoScript {
  const T = DEMO_TARGETS;
  const keys: InputEvent[] = [...DEMO_TEXT].map((ch, i) => ({
    type: 'key', t: KEY_START + i * KEY_STEP, key: ch, mods: [],
  }));
  const events: InputEvent[] = [
    ...moveSegment(0, 1300, { x: 300, y: 500 }, T.newButton),
    click(CLICK_NEW, T.newButton),
    ...moveSegment(1700, 2800, T.newButton, T.input),
    click(CLICK_INPUT, T.input),
    ...keys,
    ...moveSegment(8600, 9500, T.input, T.createButton),
    click(CLICK_CREATE, T.createButton),
    ...moveSegment(9800, 10600, T.createButton, { x: 900, y: 560 }),
  ].sort((a, b) => a.t - b.t);

  const keyTimes = keys.map((k) => k.t);

  return {
    durationMs: DURATION,
    events,
    sceneAt(t) {
      const typedCount = keyTimes.filter((kt) => kt <= t).length;
      let pressed: DemoScene['pressed'] = null;
      if (t >= CLICK_NEW && t < CLICK_NEW + PRESS_MS) pressed = 'new';
      if (t >= CLICK_CREATE && t < CLICK_CREATE + PRESS_MS) pressed = 'create';
      return {
        modalOpen: t >= CLICK_NEW && t < CLICK_CREATE,
        typed: DEMO_TEXT.slice(0, typedCount),
        created: t >= CLICK_CREATE,
        pressed,
      };
    },
  };
}
