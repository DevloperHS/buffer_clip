import { describe, expect, it } from 'vitest';
import { placeCard } from './placement';

const vp = { w: 1440, h: 900 };
const card = { w: 280, h: 160 };

describe('placeCard', () => {
  it('centres when there is no target', () => {
    expect(placeCard(null, card, vp)).toEqual({ left: 580, top: 370 });
  });
  it('prefers above the target, centred and clamped to the viewport', () => {
    expect(placeCard({ x: 100, y: 700, w: 400, h: 40 }, card, vp)).toEqual({ left: 160, top: 526 });
    expect(placeCard({ x: 0, y: 700, w: 40, h: 40 }, card, vp)).toEqual({ left: 8, top: 526 });
  });
  it('puts the card to the left of targets on the right side (inspector, title-bar buttons)', () => {
    // Scale slider in the inspector: there is room below, but that would cover the other zoom controls.
    expect(placeCard({ x: 1185, y: 77, w: 247, h: 82 }, card, vp)).toEqual({ left: 891, top: 38 });
  });
  it('falls back to below, then beside, the target', () => {
    expect(placeCard({ x: 600, y: 40, w: 200, h: 30 }, card, vp)).toEqual({ left: 560, top: 84 });
    expect(placeCard({ x: 1100, y: 100, w: 300, h: 700 }, card, vp)).toEqual({ left: 806, top: 370 });
  });
});
