import type { InputEvent, Rect } from '@buffer-clip/core';
import { keyFromEvent } from '../shared/events';
import type { ContentRequest, Mode, Prepared, Viewport } from '../shared/messages';
import { countdown, mountOverlay, nextPaint, selectArea } from './overlay';

declare global {
  interface Window { __bufferClipRecorder?: boolean }
}

const FLUSH_MS = 250;

function init(): void {
  let capturing = false;
  let queue: InputEvent[] = [];
  let pendingMove: PointerEvent | null = null;
  let raf = 0;
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let lastScroll = { x: 0, y: 0 };
  const now = () => performance.timeOrigin + performance.now();
  const push = (e: InputEvent) => {
    if (capturing) queue.push(e);
  };
  const flush = () => {
    if (queue.length === 0) return;
    const events = queue;
    queue = [];
    chrome.runtime.sendMessage({ type: 'content:events', events }).catch(() => {});
  };

  const onMove = (e: PointerEvent) => {
    pendingMove = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (pendingMove) push({ type: 'move', t: now(), x: pendingMove.clientX, y: pendingMove.clientY });
      pendingMove = null;
    });
  };
  const onDown = (e: PointerEvent) =>
    push({ type: 'click', t: now(), x: e.clientX, y: e.clientY, button: e.button === 1 || e.button === 2 ? e.button : 0 });
  const onKey = (e: KeyboardEvent) => {
    if (!e.repeat) push({ type: 'key', t: now(), ...keyFromEvent(e) });
  };
  const onScroll = () => {
    const dx = window.scrollX - lastScroll.x;
    const dy = window.scrollY - lastScroll.y;
    lastScroll = { x: window.scrollX, y: window.scrollY };
    if (dx || dy) push({ type: 'scroll', t: now(), dx, dy });
  };
  const onResize = () => push({ type: 'resize', t: now(), w: window.innerWidth, h: window.innerHeight });

  const listeners: Array<[string, EventListener]> = [
    ['pointermove', onMove as EventListener],
    ['pointerdown', onDown as EventListener],
    ['keydown', onKey as EventListener],
    ['scroll', onScroll],
    ['resize', onResize],
    ['pagehide', flush],
  ];

  const begin = () => {
    if (capturing) return;
    capturing = true;
    lastScroll = { x: window.scrollX, y: window.scrollY };
    for (const [type, fn] of listeners) window.addEventListener(type, fn, { capture: true, passive: true });
    flushTimer = setInterval(flush, FLUSH_MS);
  };
  const end = () => {
    flush();
    capturing = false;
    for (const [type, fn] of listeners) window.removeEventListener(type, fn, { capture: true });
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = null;
  };

  const prepare = async (mode: Mode): Promise<Prepared | null> => {
    const viewport: Viewport = { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio };
    const ui = mountOverlay();
    try {
      let crop: Rect | null = null;
      if (mode === 'area') {
        crop = await selectArea(ui, viewport);
        if (!crop) return null;
      }
      await countdown(ui, crop, viewport);
      return { crop, viewport };
    } finally {
      ui.destroy();
      await nextPaint(); // make sure the overlay is gone from the captured frames
    }
  };

  chrome.runtime.onMessage.addListener((msg: ContentRequest, _sender, send) => {
    switch (msg.type) {
      case 'content:prepare':
        prepare(msg.mode).then(send, () => send(null));
        return true;
      case 'content:begin':
        begin();
        send({ ok: true });
        return false;
      case 'content:end':
        end();
        send({ ok: true });
        return false;
      default:
        return false;
    }
  });
}

if (!window.__bufferClipRecorder) {
  window.__bufferClipRecorder = true;
  init();
}
