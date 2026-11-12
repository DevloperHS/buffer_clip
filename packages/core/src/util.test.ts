import { describe, expect, it } from 'vitest';
import { clamp01, easeInOutCubic, lerp, newId } from './util';

describe('util', () => {
  it('clamp01 clamps to [0,1]', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(2)).toBe(1);
  });
  it('lerp interpolates', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });
  it('easeInOutCubic hits 0, 0.5, 1 and is symmetric', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1);
  });
  it('newId returns unique strings', () => {
    expect(newId()).not.toBe(newId());
  });
});
