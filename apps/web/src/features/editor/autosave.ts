import type { Project } from '@buffer-clip/core';
import { useEffect } from 'react';
import { saveProject } from '@/lib/storage';
import type { EditorStore } from './store';

export function useAutosave(editor: EditorStore, save: (p: Project) => Promise<void> = saveProject, delayMs = 500): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: Project | null = null;
    const flush = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (pending) {
        void save(pending);
        pending = null;
      }
    };
    const off = editor.subscribe((s, prev) => {
      if (s.project === prev.project) return;
      pending = s.project;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    });
    return () => {
      off();
      flush();
    };
  }, [editor, save, delayMs]);
}
