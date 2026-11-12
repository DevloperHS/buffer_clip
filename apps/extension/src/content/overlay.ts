import type { Rect } from '@buffer-clip/core';
import { MIN_AREA, normalizeRect } from '../shared/selection';
import { OVERLAY_CSS } from './overlay-css';

export interface Overlay {
  layer: HTMLDivElement;
  root: ShadowRoot;
  destroy: () => void;
}

export function mountOverlay(): Overlay {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>${OVERLAY_CSS}</style><div class="layer"></div>`;
  document.documentElement.appendChild(host);
  return { root, layer: root.querySelector('.layer') as HTMLDivElement, destroy: () => host.remove() };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const nextPaint = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export function selectArea(ui: Overlay, viewport: { w: number; h: number }): Promise<Rect | null> {
  return new Promise((resolve) => {
    const { layer } = ui;
    layer.className = 'layer dim';
    layer.innerHTML = `
      <div class="hint glass">Drag to select an area · Esc to cancel</div>
      <div class="box" hidden><span class="dims"></span></div>
      <div class="bar glass" hidden>
        <button class="ghost" data-act="cancel">Cancel</button>
        <button class="primary" data-act="ok">Record area</button>
      </div>`;
    const box = layer.querySelector('.box') as HTMLDivElement;
    const dims = layer.querySelector('.dims') as HTMLSpanElement;
    const bar = layer.querySelector('.bar') as HTMLDivElement;
    const hint = layer.querySelector('.hint') as HTMLDivElement;
    let start: { x: number; y: number } | null = null;
    let rect: Rect | null = null;

    const draw = (r: Rect) => {
      layer.classList.remove('dim');
      box.hidden = false;
      box.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
      dims.textContent = `${r.w} × ${r.h}`;
    };
    const reset = () => {
      rect = null;
      box.hidden = true;
      bar.hidden = true;
      hint.hidden = false;
      layer.classList.add('dim');
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.bar')) return;
      start = { x: e.clientX, y: e.clientY };
      bar.hidden = true;
      hint.hidden = true;
      layer.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!start) return;
      const r = normalizeRect(start, { x: e.clientX, y: e.clientY }, viewport, 1);
      if (r) draw(r);
    };
    const onUp = (e: PointerEvent) => {
      if (!start) return;
      const r = normalizeRect(start, { x: e.clientX, y: e.clientY }, viewport, MIN_AREA);
      start = null;
      if (!r) return reset();
      rect = r;
      draw(r);
      bar.hidden = false;
      bar.style.left = `${r.x + r.w / 2}px`;
      bar.style.top = `${Math.min(r.y + r.h + 12, viewport.h - 52)}px`;
      (bar.querySelector('.primary') as HTMLButtonElement).focus();
    };
    const finish = (r: Rect | null) => {
      layer.removeEventListener('pointerdown', onDown);
      layer.removeEventListener('pointermove', onMove);
      layer.removeEventListener('pointerup', onUp);
      layer.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey, true);
      resolve(r);
    };
    const onClick = (e: MouseEvent) => {
      const act = (e.target as HTMLElement).closest('[data-act]')?.getAttribute('data-act');
      if (act === 'cancel') finish(null);
      if (act === 'ok' && rect) finish(rect);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish(null);
      } else if (e.key === 'Enter' && rect && !bar.hidden) {
        e.preventDefault();
        e.stopPropagation();
        finish(rect);
      }
    };
    layer.addEventListener('pointerdown', onDown);
    layer.addEventListener('pointermove', onMove);
    layer.addEventListener('pointerup', onUp);
    layer.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey, true);
  });
}

export async function countdown(ui: Overlay, crop: Rect | null, viewport: { w: number; h: number }): Promise<void> {
  const cx = crop ? crop.x + crop.w / 2 : viewport.w / 2;
  const cy = crop ? crop.y + crop.h / 2 : viewport.h / 2;
  ui.layer.className = 'layer';
  ui.layer.style.cursor = 'default';
  ui.layer.innerHTML = `
    ${crop ? `<div class="box" style="left:${crop.x}px;top:${crop.y}px;width:${crop.w}px;height:${crop.h}px"></div>` : '<div class="dimlight"></div>'}
    <div class="count glass" style="left:${cx}px;top:${cy}px">
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r="44"/><circle class="ring" cx="50" cy="50" r="44"/></svg>
      <span class="num"></span>
    </div>`;
  const ring = ui.layer.querySelector('.ring') as SVGCircleElement;
  for (const n of [3, 2, 1]) {
    const old = ui.layer.querySelector('.num') as HTMLSpanElement;
    const num = old.cloneNode() as HTMLSpanElement;
    num.textContent = String(n);
    old.replaceWith(num);
    ring.classList.remove('run');
    void ring.getBoundingClientRect();
    ring.classList.add('run');
    await sleep(1000);
  }
}
