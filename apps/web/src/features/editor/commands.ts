import { setTheme } from '@/lib/theme';
import type { EditorApi } from './editor-api';

export interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

export function modKeyLabel(): '⌘' | 'Ctrl+' {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
}

export function buildCommands(
  api: EditorApi,
  nav: { projects: () => void; tutorial?: boolean },
  mod: string = modKeyLabel(),
): Command[] {
  const commands: Command[] = [
    { id: 'export', label: 'Export MP4', hint: `${mod}E`, run: api.openExport },
    { id: 'play', label: 'Play or pause', hint: 'Space', run: api.togglePlay },
    { id: 'split', label: 'Split clip at playhead', hint: 'S', run: api.split },
    { id: 'zoom', label: 'Add zoom at playhead', hint: 'Z', run: api.addZoom },
    { id: 'delete', label: 'Delete selection', hint: '⌫', run: api.deleteSelection },
    { id: 'undo', label: 'Undo', hint: `${mod}Z`, run: api.undo },
    { id: 'redo', label: 'Redo', hint: `⇧${mod}Z`, run: api.redo },
    { id: 'aspect-16-9', label: 'Aspect ratio 16:9', run: () => api.setAspect('16:9') },
    { id: 'aspect-9-16', label: 'Aspect ratio 9:16', run: () => api.setAspect('9:16') },
    { id: 'aspect-1-1', label: 'Aspect ratio 1:1', run: () => api.setAspect('1:1') },
    { id: 'cursor', label: 'Show or hide cursor', run: api.toggleCursor },
    { id: 'ripple', label: 'Toggle click ripple', run: api.toggleRipple },
    { id: 'redetect-zooms', label: 'Re-detect zooms', run: api.redetectZooms },
    { id: 'redetect-idle', label: 'Re-detect idle time', run: api.redetectIdle },
    { id: 'theme-light', label: 'Appearance: Light', run: () => setTheme('light') },
    { id: 'theme-dark', label: 'Appearance: Dark', run: () => setTheme('dark') },
    { id: 'theme-system', label: 'Appearance: Match system', run: () => setTheme('system') },
    { id: 'projects', label: 'Go to projects', run: nav.projects },
  ];
  if (nav.tutorial) commands.push({ id: 'restart-tutorial', label: 'Restart tutorial', run: api.restartTour });
  return commands;
}

export function filterCommands(commands: Command[], query: string): Command[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return commands.filter((c) => words.every((w) => c.label.toLowerCase().includes(w)));
}
