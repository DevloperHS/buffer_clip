import { createInitialProject, type Recording } from '@buffer-clip/core';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './autosave';
import { createStores } from './store';

const rec: Recording = {
  id: 'r', createdAt: 0, name: 'Demo', durationMs: 5000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false, events: [],
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useAutosave', () => {
  it('saves the latest project once after changes settle', () => {
    const { editor } = createStores(rec, createInitialProject(rec));
    const save = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutosave(editor, save, 500));
    editor.getState().setBackground({ padding: 10 });
    vi.advanceTimersByTime(200);
    editor.getState().setBackground({ padding: 20 });
    vi.advanceTimersByTime(499);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0].background.padding).toBe(20);
  });
  it('ignores non-project changes and flushes on unmount', () => {
    const { editor } = createStores(rec, createInitialProject(rec));
    const save = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useAutosave(editor, save, 500));
    editor.getState().select(null);
    editor.getState().setCursor({ size: 2 });
    unmount();
    expect(save).toHaveBeenCalledOnce();
  });
});
