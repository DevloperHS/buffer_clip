import type { InputEvent } from '@buffer-clip/core';
import { describe, expect, it } from 'vitest';
import { keyFromEvent, toRelativeEvents } from './events';

const k = (key: string, o: Partial<Parameters<typeof keyFromEvent>[0]> = {}) => ({
  key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, target: null, ...o,
});

describe('keyFromEvent', () => {
  it('keeps the key and lists modifiers in a fixed order', () => {
    expect(keyFromEvent(k('a'))).toEqual({ key: 'a', mods: [] });
    expect(keyFromEvent(k('k', { metaKey: true, shiftKey: true, ctrlKey: true, altKey: true }))).toEqual({
      key: 'k', mods: ['ctrl', 'alt', 'shift', 'meta'],
    });
  });
  it('masks keys typed into password fields', () => {
    expect(keyFromEvent(k('p', { target: { tagName: 'INPUT', type: 'password' } }))).toEqual({ key: '•', mods: [] });
    expect(keyFromEvent(k('p', { target: { tagName: 'INPUT', type: 'text' } }))).toEqual({ key: 'p', mods: [] });
  });
});

describe('toRelativeEvents', () => {
  it('re-times events to the recording start, drops out-of-range ones and sorts', () => {
    const raw: InputEvent[] = [
      { type: 'click', t: 10_500.04, x: 1, y: 2, button: 0 },
      { type: 'move', t: 9_000, x: 0, y: 0 },
      { type: 'move', t: 10_100, x: 5, y: 5 },
      { type: 'key', t: 30_000, key: 'a', mods: [] },
    ];
    expect(toRelativeEvents(raw, 10_000, 5_000)).toEqual([
      { type: 'move', t: 100, x: 5, y: 5 },
      { type: 'click', t: 500, x: 1, y: 2, button: 0 },
    ]);
  });
});
