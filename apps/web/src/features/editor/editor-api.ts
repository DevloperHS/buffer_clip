import { outToSrc, type Aspect, type Ms } from '@buffer-clip/core';
import type { EditorStores } from './store';

export interface EditorApi {
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  split: () => void;
  addZoom: () => void;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
  step: (frames: number) => void;
  seekBy: (ms: Ms) => void;
  setAspect: (aspect: Aspect) => void;
  toggleCursor: () => void;
  toggleRipple: () => void;
  redetectZooms: () => void;
  redetectIdle: () => void;
  escape: () => void;
  openExport: () => void;
  restartTour: () => void;
}

export function createEditorApi({ editor, playback }: EditorStores): EditorApi {
  const e = () => editor.getState();
  const p = () => playback.getState();
  return {
    togglePlay: () => p().toggle(),
    play: () => p().play(),
    pause: () => p().pause(),
    split: () => e().splitAt(p().outT),
    addZoom: () => e().addZoomAt(outToSrc(e().project.clips, p().outT)),
    deleteSelection: () => e().deleteSelection(),
    undo: () => editor.temporal.getState().undo(),
    redo: () => editor.temporal.getState().redo(),
    step: (frames) => {
      p().pause();
      p().seekBy((frames * 1000) / e().project.output.fps);
    },
    seekBy: (ms) => p().seekBy(ms),
    setAspect: (aspect) => e().setOutput({ aspect }),
    toggleCursor: () => e().setCursor({ visible: !e().project.cursor.visible }),
    toggleRipple: () => e().setCursor({ clickRipple: !e().project.cursor.clickRipple }),
    redetectZooms: () => e().redetectZooms(),
    redetectIdle: () => e().redetectIdle(),
    openExport: () => e().setExportOpen(true),
    restartTour: () => e().restartTour(),
    escape: () => {
      if (e().picking) e().setPicking(false);
      else e().select(null);
    },
  };
}
