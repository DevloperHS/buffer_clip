import { describe, expect, it } from 'vitest';
import type { Session } from '../shared/messages';
import { popupView } from './model';

const session = (phase: Session['phase']): Session => ({ tabId: 1, phase, startedAt: 0, mode: 'tab', audio: false });

describe('popupView', () => {
  it('prioritises an active session over the current page', () => {
    expect(popupView(false, session('recording'))).toBe('recording');
    expect(popupView(true, session('preparing'))).toBe('preparing');
  });
  it('shows restricted or idle when not recording', () => {
    expect(popupView(false, null)).toBe('restricted');
    expect(popupView(true, null)).toBe('idle');
  });
});
