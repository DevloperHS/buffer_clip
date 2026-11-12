import { describe, expect, it, vi } from 'vitest';
import type { EditorApi } from './editor-api';
import { handleEditorKey, type KeyLike } from './keymap';

const api = (): EditorApi => ({
  togglePlay: vi.fn(), play: vi.fn(), pause: vi.fn(), split: vi.fn(), addZoom: vi.fn(),
  deleteSelection: vi.fn(), undo: vi.fn(), redo: vi.fn(), step: vi.fn(), seekBy: vi.fn(),
  setAspect: vi.fn(), toggleCursor: vi.fn(), toggleRipple: vi.fn(), redetectZooms: vi.fn(),
  redetectIdle: vi.fn(), escape: vi.fn(), openExport: vi.fn(), restartTour: vi.fn(),
});
const key = (k: string, o: Partial<KeyLike> = {}): KeyLike => ({
  key: k, metaKey: false, ctrlKey: false, shiftKey: false, target: document.body, ...o,
});

describe('handleEditorKey', () => {
  it('maps the editing shortcuts', () => {
    const a = api();
    const open = vi.fn();
    expect(handleEditorKey(key(' '), a, open)).toBe(true);
    handleEditorKey(key('s'), a, open);
    handleEditorKey(key('Z', { shiftKey: true }), a, open);
    handleEditorKey(key('Backspace'), a, open);
    handleEditorKey(key('ArrowRight'), a, open);
    handleEditorKey(key('ArrowLeft', { shiftKey: true }), a, open);
    handleEditorKey(key('j'), a, open);
    handleEditorKey(key('k'), a, open);
    handleEditorKey(key('l'), a, open);
    handleEditorKey(key('Escape'), a, open);
    expect(a.togglePlay).toHaveBeenCalledOnce();
    expect(a.split).toHaveBeenCalledOnce();
    expect(a.addZoom).toHaveBeenCalledOnce();
    expect(a.deleteSelection).toHaveBeenCalledOnce();
    expect(a.step).toHaveBeenCalledWith(1);
    expect(a.seekBy).toHaveBeenCalledWith(-1000);
    expect(a.seekBy).toHaveBeenCalledWith(-5000);
    expect(a.pause).toHaveBeenCalledOnce();
    expect(a.play).toHaveBeenCalledOnce();
    expect(a.escape).toHaveBeenCalledOnce();
  });
  it('maps undo, redo and the palette with either modifier', () => {
    const a = api();
    const open = vi.fn();
    handleEditorKey(key('z', { metaKey: true }), a, open);
    handleEditorKey(key('z', { ctrlKey: true, shiftKey: true }), a, open);
    handleEditorKey(key('y', { ctrlKey: true }), a, open);
    handleEditorKey(key('k', { metaKey: true }), a, open);
    expect(a.undo).toHaveBeenCalledOnce();
    expect(a.redo).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledOnce();
    expect(a.addZoom).not.toHaveBeenCalled();
    expect(a.pause).not.toHaveBeenCalled();
  });
  it('ignores shortcuts while typing, except the palette', () => {
    const a = api();
    const open = vi.fn();
    const input = document.createElement('input');
    expect(handleEditorKey(key('s', { target: input }), a, open)).toBe(false);
    expect(a.split).not.toHaveBeenCalled();
    expect(handleEditorKey(key('k', { ctrlKey: true, target: input }), a, open)).toBe(true);
    expect(open).toHaveBeenCalledOnce();
  });
  it('opens export with the modifier and E', () => {
    const a = api();
    handleEditorKey(key('e', { ctrlKey: true }), a, vi.fn());
    expect(a.openExport).toHaveBeenCalledOnce();
  });
});
