import { describe, expect, it } from 'vitest';
import { clearTourProgress, loadTourProgress, saveTourProgress } from './progress';

const memory = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  } as Storage;
};
const broken = {
  getItem: () => { throw new Error('denied'); },
  setItem: () => { throw new Error('denied'); },
  removeItem: () => { throw new Error('denied'); },
} as unknown as Storage;

describe('tour progress', () => {
  it('saves, loads and clears per recording', () => {
    const s = memory();
    expect(loadTourProgress('a', s)).toEqual({ step: 0 });
    saveTourProgress('a', { step: 4 }, s);
    expect(loadTourProgress('a', s)).toEqual({ step: 4 });
    expect(loadTourProgress('b', s)).toEqual({ step: 0 });
    saveTourProgress('a', { done: true }, s);
    expect(loadTourProgress('a', s)).toEqual({ done: true });
    clearTourProgress('a', s);
    expect(loadTourProgress('a', s)).toEqual({ step: 0 });
  });
  it('treats junk or unavailable storage as a fresh start', () => {
    const s = memory();
    s.setItem('buffer-clip:tour:a', '{nope');
    expect(loadTourProgress('a', s)).toEqual({ step: 0 });
    expect(loadTourProgress('a', broken)).toEqual({ step: 0 });
    expect(() => saveTourProgress('a', { step: 1 }, broken)).not.toThrow();
  });
});
