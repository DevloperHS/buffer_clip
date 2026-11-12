import type { Ms, Project } from '@buffer-clip/core';
import type { EditorStores, Selection } from '../editor/store';

export interface TourSnapshot {
  project: Project;
  selection: Selection | null;
  picking: boolean;
  playing: boolean;
  outT: Ms;
  seekId: number;
  paletteOpen: boolean;
  exportOpen: boolean;
  pastCount: number;
}

export interface TourStep {
  id: string;
  title: string;
  body: string; // {Key} tokens render as key caps; {Mod} is ⌘ or Ctrl
  target: string | null; // data-tour id to spotlight
  done: (prev: TourSnapshot, cur: TourSnapshot) => boolean;
}

const idleCount = (p: Project) => p.clips.filter((c) => c.idle).length;
const selectedZoom = (s: TourSnapshot) => {
  const sel = s.selection;
  return sel?.kind === 'zoom' ? s.project.zooms.find((z) => z.id === sel.id) : undefined;
};

export const TOUR_STEPS: TourStep[] = [
  { id: 'play', title: 'Press Space to play', body: 'Press {Space} to watch your auto-edited recording.', target: 'transport-play',
    done: (a, b) => !a.playing && b.playing },
  { id: 'scrub', title: 'Scrub the timeline', body: 'Drag along the time ruler to move the playhead.', target: 'ruler',
    done: (a, b) => b.seekId > a.seekId },
  { id: 'trim', title: 'Trim a clip', body: 'Hover a clip and drag its left or right edge. The edge follows your pointer.', target: 'clips-lane',
    done: (a, b) =>
      a.project.clips.length === b.project.clips.length &&
      a.project.clips.some((c, i) => {
        const d = b.project.clips[i];
        return !!d && d.id === c.id && (d.srcStart !== c.srcStart || d.srcEnd !== c.srcEnd);
      }) },
  { id: 'split', title: 'Split at the playhead', body: 'Put the playhead inside a clip and press {S}.', target: 'clips-lane',
    done: (a, b) => b.project.clips.length === a.project.clips.length + 1 && idleCount(b.project) === idleCount(a.project) },
  { id: 'undo', title: 'Undo', body: 'Changed your mind? Press {Mod} {Z}.', target: 'undo',
    done: (a, b) => b.pastCount < a.pastCount },
  { id: 'idle', title: 'Speed up idle time', body: 'Idle moments were cut automatically. Click a dashed dot to speed one up instead.', target: 'clips-lane',
    done: (a, b) => idleCount(b.project) === idleCount(a.project) + 1 },
  { id: 'select-zoom', title: 'Select a zoom', body: 'Zooms follow your clicks. Click a zoom block to select it.', target: 'zooms-lane',
    done: (a, b) => b.selection?.kind === 'zoom' && b.selection.id !== a.selection?.id },
  { id: 'scale', title: 'Change the zoom scale', body: 'Drag Scale in the inspector. The preview jumps into the zoom so you can see it.', target: 'zoom-scale',
    done: (a, b) => {
      const za = selectedZoom(a);
      const zb = selectedZoom(b);
      return !!za && !!zb && za.id === zb.id && za.scale !== zb.scale;
    } },
  { id: 'add-zoom', title: 'Add a zoom', body: 'Press {Z} to add a zoom at the playhead.', target: 'zooms-lane',
    done: (a, b) => b.project.zooms.length === a.project.zooms.length + 1 },
  { id: 'pick', title: 'Draw a zoom area', body: 'Click Draw zoom area, then drag a box on the preview around what the zoom should show.', target: 'zoom-pick',
    done: (a, b) => {
      const za = selectedZoom(a);
      const zb = selectedZoom(b);
      return a.picking && !!za && !!zb && za.id === zb.id && zb.target !== 'follow' && za.target !== zb.target;
    } },
  { id: 'background', title: 'Change the background', body: 'Pick a background preset or drag Padding.', target: 'background',
    done: (a, b) => a.project.background !== b.project.background },
  { id: 'cursor', title: 'Adjust the cursor', body: 'Try a bigger cursor or turn off the click ripple.', target: 'cursor',
    done: (a, b) => a.project.cursor !== b.project.cursor },
  { id: 'aspect', title: 'Try another aspect ratio', body: 'Switch to 9:16 for vertical video. Watch the preview morph.', target: 'aspect',
    done: (a, b) => a.project.output.aspect !== b.project.output.aspect },
  { id: 'palette', title: 'Open the command palette', body: 'Every action is one search away. Press {Mod} {K}.', target: 'actions',
    done: (a, b) => !a.paletteOpen && b.paletteOpen },
  { id: 'export', title: 'Export your video', body: "When you're happy, press {Mod} {E} or click Export.", target: 'export',
    done: (a, b) => !a.exportOpen && b.exportOpen },
];

/** Undo only ever completes the Undo step, so undoing earlier work can't skip ahead. */
export function stepCompleted(step: TourStep, prev: TourSnapshot, cur: TourSnapshot): boolean {
  if (step.id !== 'undo' && cur.pastCount < prev.pastCount) return false;
  return step.done(prev, cur);
}

export function snapshotFrom({ editor, playback }: EditorStores): TourSnapshot {
  const e = editor.getState();
  const p = playback.getState();
  return {
    project: e.project,
    selection: e.selection,
    picking: e.picking,
    playing: p.playing,
    outT: p.outT,
    seekId: p.seekId,
    paletteOpen: e.paletteOpen,
    exportOpen: e.exportOpen,
    pastCount: editor.temporal.getState().pastStates.length,
  };
}

export function bodyParts(body: string, mod: string): Array<{ text: string } | { key: string }> {
  const parts: Array<{ text: string } | { key: string }> = [];
  for (const [i, chunk] of body.split(/\{([^}]+)\}/).entries()) {
    if (i % 2 === 1) parts.push({ key: chunk === 'Mod' ? mod : chunk });
    else if (chunk) parts.push({ text: chunk });
  }
  return parts;
}
