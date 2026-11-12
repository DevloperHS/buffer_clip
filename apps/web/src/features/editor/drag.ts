import type { PointerEvent as ReactPointerEvent } from 'react';

export interface DragHandlers {
  onMove: (dx: number, e: PointerEvent) => void;
  onEnd: (dx: number, moved: boolean) => void;
}

/** Pointer-captured horizontal drag starting from a React pointerdown. */
export function startDrag(e: ReactPointerEvent<Element>, h: DragHandlers): void {
  if (e.button !== 0) return;
  e.stopPropagation();
  e.preventDefault();
  const el = e.currentTarget as HTMLElement;
  const x0 = e.clientX;
  let dx = 0;
  el.setPointerCapture?.(e.pointerId);
  const move = (ev: PointerEvent) => {
    dx = ev.clientX - x0;
    h.onMove(dx, ev);
  };
  const up = () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    h.onEnd(dx, Math.abs(dx) > 2);
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}
