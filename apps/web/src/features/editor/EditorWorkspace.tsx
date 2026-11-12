'use client';
import type { Project, Recording } from '@buffer-clip/core';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import { useAutosave } from './autosave';
import { buildCommands } from './commands';
import { CommandPalette } from './CommandPalette';
import { createEditorApi } from './editor-api';
import { EditorProvider } from './EditorContext';
import { ExportSheet } from './ExportSheet';
import { FilmstripProvider } from './FilmstripContext';
import { Inspector } from './Inspector';
import { handleEditorKey } from './keymap';
import { Player } from './Player';
import { createStores } from './store';
import { TourOverlay } from '../tour/TourOverlay';
import { TimelineDock } from './Timeline';
import { TitleBar } from './TitleBar';

const INTRO_TOTAL_MS = 2600;

export interface EditorWorkspaceProps {
  recording: Recording;
  project: Project;
  created: boolean;
  videoUrl: string;
}

export function EditorWorkspace({ recording, project, created, videoUrl }: EditorWorkspaceProps) {
  const router = useRouter();
  const stores = useMemo(() => createStores(recording, project, { intro: created }), [recording, project, created]);
  const api = useMemo(() => createEditorApi(stores), [stores]);
  const paletteOpen = useStore(stores.editor, (s) => s.paletteOpen);
  const setPaletteOpen = stores.editor.getState().setPaletteOpen;
  const commands = useMemo(
    () => buildCommands(api, { projects: () => router.push('/'), tutorial: recording.tutorial === true }),
    [api, router, recording.tutorial],
  );

  useAutosave(stores.editor);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const s = stores.editor.getState();
      if (s.paletteOpen || s.exportProgress !== null) return;
      if (handleEditorKey(ev, api, () => stores.editor.getState().setPaletteOpen(true))) ev.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [api, stores]);

  useEffect(() => {
    if (!created) return;
    const t = setTimeout(() => stores.editor.setState({ intro: false }), INTRO_TOTAL_MS);
    return () => clearTimeout(t);
  }, [created, stores]);

  useEffect(() => () => stores.playback.getState().pause(), [stores]);

  return (
    <EditorProvider stores={stores}>
      <FilmstripProvider videoUrl={videoUrl}>
      <div className="relative flex h-dvh flex-col overflow-hidden bg-surface">
        <TitleBar onOpenPalette={() => setPaletteOpen(true)} />
        <ExportSheet />
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <Player videoUrl={videoUrl} />
            <TimelineDock />
          </div>
          <Inspector />
        </div>
        {recording.tutorial && <TourOverlay recordingId={recording.id} startDelayMs={created ? INTRO_TOTAL_MS : 300} />}
        <CommandPalette open={paletteOpen} commands={commands} onClose={() => setPaletteOpen(false)} />
      </div>
      </FilmstripProvider>
    </EditorProvider>
  );
}
