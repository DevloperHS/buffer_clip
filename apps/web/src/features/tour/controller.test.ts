import { describe, expect, it } from 'vitest';
import { initialTourState, tourReducer, type TourState } from './controller';

const run = (s: TourState, ...types: Array<'completed' | 'advance' | 'skip' | 'end' | 'close' | 'restart'>) =>
  types.reduce((acc, type) => tourReducer(acc, { type }, 3), s);

describe('tour controller', () => {
  it('starts from saved progress', () => {
    expect(initialTourState({ step: 2 }, 3)).toEqual({ index: 2, status: 'running' });
    expect(initialTourState({ step: 99 }, 3)).toEqual({ index: 2, status: 'running' });
    expect(initialTourState({ done: true }, 3)).toEqual({ index: 0, status: 'closed' });
  });
  it('celebrates, then advances; finishes after the last step', () => {
    const s = { index: 0, status: 'running' as const };
    expect(run(s, 'completed')).toEqual({ index: 0, status: 'celebrating' });
    expect(run(s, 'completed', 'advance')).toEqual({ index: 1, status: 'running' });
    expect(run({ index: 2, status: 'running' }, 'completed', 'advance')).toEqual({ index: 2, status: 'finished' });
  });
  it('skips, ends, closes and restarts', () => {
    expect(run({ index: 0, status: 'running' }, 'skip')).toEqual({ index: 1, status: 'running' });
    expect(run({ index: 1, status: 'running' }, 'end')).toEqual({ index: 1, status: 'closed' });
    expect(run({ index: 2, status: 'finished' }, 'close')).toEqual({ index: 2, status: 'closed' });
    expect(run({ index: 2, status: 'closed' }, 'restart')).toEqual({ index: 0, status: 'running' });
  });
  it('ignores completion while not running', () => {
    expect(run({ index: 1, status: 'closed' }, 'completed')).toEqual({ index: 1, status: 'closed' });
    expect(run({ index: 1, status: 'running' }, 'advance')).toEqual({ index: 1, status: 'running' });
  });
});
