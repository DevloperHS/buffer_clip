import { describe, expect, it } from 'vitest';
import { backgroundCss, gradientLine, meshBlobs, withAlpha } from './background';

describe('backgrounds', () => {
  it('lays a linear gradient along the CSS angle, spanning the box', () => {
    const right = gradientLine({ w: 200, h: 100 }, 90);
    expect(right.from.x).toBeCloseTo(0);
    expect(right.from.y).toBeCloseTo(50);
    expect(right.to.x).toBeCloseTo(200);
    expect(right.to.y).toBeCloseTo(50);
    const down = gradientLine({ w: 200, h: 100 }, 180);
    expect(down.from.x).toBeCloseTo(100);
    expect(down.from.y).toBeCloseTo(0);
    expect(down.to.y).toBeCloseTo(100);
  });
  it('places one blob per colour after the base, and turns them with the angle', () => {
    const size = { w: 1000, h: 1000 };
    const blobs = meshBlobs(size, ['#000', '#f00', '#0f0', '#00f'], 135);
    expect(blobs.map((b) => b.color)).toEqual(['#f00', '#0f0', '#00f']);
    expect(blobs[0]).toMatchObject({ x: 120, y: 180 });
    const turned = meshBlobs(size, ['#000', '#f00'], 135 + 180)[0];
    expect(turned.x).toBeCloseTo(880);
    expect(turned.y).toBeCloseTo(820);
  });
  it('adds alpha to hex colours', () => {
    expect(withAlpha('#ff8000', 0)).toBe('rgba(255,128,0,0)');
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(withAlpha('red', 0)).toBe('red');
  });
  it('renders the same background as CSS for swatches', () => {
    expect(backgroundCss({ kind: 'solid', value: '#111111' })).toBe('#111111');
    expect(backgroundCss({ kind: 'gradient', value: '#a,#b', angle: 90 })).toBe('linear-gradient(90deg, #a, #b)');
    const mesh = backgroundCss({ kind: 'mesh', value: '#000000,#ff0000' });
    expect(mesh).toBe('radial-gradient(62% 62% at 12.0% 18.0%, #ff0000 0%, rgba(255,0,0,0.5) 45%, rgba(255,0,0,0) 100%), #000000');
  });
});
