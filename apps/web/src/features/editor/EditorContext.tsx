'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { beginGesture, endGesture, type EditorState, type EditorStores, type PlaybackState } from './store';

const Ctx = createContext<EditorStores | null>(null);

export function EditorProvider({ stores, children }: { stores: EditorStores; children: ReactNode }) {
  return <Ctx.Provider value={stores}>{children}</Ctx.Provider>;
}

export function useStores(): EditorStores {
  const stores = useContext(Ctx);
  if (!stores) throw new Error('EditorProvider is missing');
  return stores;
}

export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useStore(useStores().editor, selector);
}

export function usePlayback<T>(selector: (s: PlaybackState) => T): T {
  return useStore(useStores().playback, selector);
}

export function useHistory(): { canUndo: boolean; canRedo: boolean } {
  const { editor } = useStores();
  const canUndo = useStore(editor.temporal, (t) => t.pastStates.length > 0);
  const canRedo = useStore(editor.temporal, (t) => t.futureStates.length > 0);
  return { canUndo, canRedo };
}

export function useGesture() {
  const { editor } = useStores();
  return useMemo(
    () => ({ onGestureStart: () => beginGesture(editor), onGestureEnd: () => endGesture(editor) }),
    [editor],
  );
}
