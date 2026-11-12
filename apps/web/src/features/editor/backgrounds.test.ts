import { describe, expect, it } from 'vitest';
import { ABSTRACT, convertStyle, GRADIENTS, sameStyle, shade, SOLIDS } from './backgrounds';

describe('background presets', () => {
  it('offers abstract, gradient and solid presets with unique names', () => {
    expect(ABSTRACT.length).toBeGreaterThanOrEqual(12);
    expect(ABSTRACT.every((p) => p.bg.kind === 'mesh')).toBe(true);
    const names = [...ABSTRACT, ...GRADIENTS, ...SOLIDS].map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
  it('shades toward white or black', () => {
    expect(shade('#808080', 1)).toBe('#ffffff');
    expect(shade('#808080', -1)).toBe('#000000');
    expect(shade('#000000', 0.5)).toBe('#808080');
  });
  it('keeps the colours when switching style, adding tints when needed', () => {
    expect(convertStyle({ kind: 'gradient', value: '#ff0000,#0000ff', angle: 90 }, 'solid')).toEqual({ kind: 'solid', value: '#ff0000' });
    const g = convertStyle({ kind: 'solid', value: '#ff0000' }, 'gradient');
    expect(g.value.split(',')).toHaveLength(2);
    expect(g.value.startsWith('#ff0000')).toBe(true);
    const m = convertStyle({ kind: 'gradient', value: '#ff0000,#0000ff' }, 'mesh');
    expect(m.kind).toBe('mesh');
    expect(m.value.split(',').length).toBeGreaterThanOrEqual(3);
    expect(m.value).toContain('#ff0000');
  });
  it('compares styles ignoring case and the default angle', () => {
    expect(sameStyle({ kind: 'gradient', value: '#AA0000,#00bb00' }, { kind: 'gradient', value: '#aa0000,#00BB00', angle: 135 })).toBe(true);
    expect(sameStyle({ kind: 'gradient', value: '#a,#b', angle: 90 }, { kind: 'gradient', value: '#a,#b' })).toBe(false);
  });
});
