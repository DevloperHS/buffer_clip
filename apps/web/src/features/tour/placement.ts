import type { Rect } from '@buffer-clip/core';

const MARGIN = 8;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * Where the step card goes. Targets on the right side of the screen (inspector, title-bar buttons)
 * get the card to their left, so it never covers their neighbouring controls. Otherwise: above the
 * target, else below, else left, else right, else centred.
 */
export function placeCard(
  hole: Rect | null,
  card: { w: number; h: number },
  vp: { w: number; h: number },
  gap = 14,
): { left: number; top: number } {
  const centre = { left: Math.round((vp.w - card.w) / 2), top: Math.round((vp.h - card.h) / 2) };
  if (!hole) return centre;
  const hx = clamp(hole.x + hole.w / 2 - card.w / 2, MARGIN, vp.w - card.w - MARGIN);
  const vy = clamp(hole.y + hole.h / 2 - card.h / 2, MARGIN, vp.h - card.h - MARGIN);
  const onRight = hole.x + hole.w / 2 > vp.w * 0.7;
  if (onRight && hole.x - gap - card.w >= MARGIN) return { left: Math.round(hole.x - gap - card.w), top: Math.round(vy) };
  if (hole.y - gap - card.h >= MARGIN) return { left: Math.round(hx), top: Math.round(hole.y - gap - card.h) };
  if (hole.y + hole.h + gap + card.h <= vp.h - MARGIN) return { left: Math.round(hx), top: Math.round(hole.y + hole.h + gap) };
  if (hole.x - gap - card.w >= MARGIN) return { left: Math.round(hole.x - gap - card.w), top: Math.round(vy) };
  if (hole.x + hole.w + gap + card.w <= vp.w - MARGIN) return { left: Math.round(hole.x + hole.w + gap), top: Math.round(vy) };
  return centre;
}
