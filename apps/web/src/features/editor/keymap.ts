import type { EditorApi } from './editor-api';

export interface KeyLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (target as HTMLElement).isContentEditable;
}

/** Returns true when the key was handled (caller should preventDefault). */
export function handleEditorKey(e: KeyLike, api: EditorApi, openPalette: () => void): boolean {
  const mod = e.metaKey || e.ctrlKey;
  const k = e.key.toLowerCase();
  if (mod && k === 'k') {
    openPalette();
    return true;
  }
  if (mod && k === 'e') {
    api.openExport();
    return true;
  }
  if (isTypingTarget(e.target)) return false;
  if (mod && k === 'z') {
    if (e.shiftKey) api.redo();
    else api.undo();
    return true;
  }
  if (mod && k === 'y') {
    api.redo();
    return true;
  }
  if (mod) return false;
  switch (e.key) {
    case ' ':
      api.togglePlay();
      return true;
    case 'ArrowLeft':
      if (e.shiftKey) api.seekBy(-1000);
      else api.step(-1);
      return true;
    case 'ArrowRight':
      if (e.shiftKey) api.seekBy(1000);
      else api.step(1);
      return true;
    case 'Backspace':
    case 'Delete':
      api.deleteSelection();
      return true;
    case 'Escape':
      api.escape();
      return true;
  }
  switch (k) {
    case 's':
      api.split();
      return true;
    case 'z':
      api.addZoom();
      return true;
    case 'j':
      api.seekBy(-5000);
      return true;
    case 'k':
      api.pause();
      return true;
    case 'l':
      api.play();
      return true;
  }
  return false;
}
