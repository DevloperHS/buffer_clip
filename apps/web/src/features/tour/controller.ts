import type { TourProgress } from './progress';

export type TourStatus = 'running' | 'celebrating' | 'finished' | 'closed';
export interface TourState { index: number; status: TourStatus }
export type TourAction = { type: 'completed' | 'advance' | 'skip' | 'end' | 'close' | 'restart' };

export function initialTourState(p: TourProgress, total: number): TourState {
  if ('done' in p) return { index: 0, status: 'closed' };
  return { index: Math.min(Math.max(0, p.step), total - 1), status: 'running' };
}

const next = (s: TourState, total: number): TourState =>
  s.index + 1 < total ? { index: s.index + 1, status: 'running' } : { index: s.index, status: 'finished' };

export function tourReducer(s: TourState, a: TourAction, total: number): TourState {
  switch (a.type) {
    case 'completed':
      return s.status === 'running' ? { ...s, status: 'celebrating' } : s;
    case 'advance':
      return s.status === 'celebrating' ? next(s, total) : s;
    case 'skip':
      return s.status === 'running' || s.status === 'celebrating' ? next(s, total) : s;
    case 'end':
    case 'close':
      return { ...s, status: 'closed' };
    case 'restart':
      return { index: 0, status: 'running' };
  }
}
