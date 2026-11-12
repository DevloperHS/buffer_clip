import {
  contentFrame, createZoom, zoomSlot, cycleIdleClip as cycleIdleCore, deleteClip, detectIdle, fillGap as fillGapCore,
  normalizeZoom, outputDuration, replaceAutoZooms, setClipSpeed as setSpeedCore, splitClip,
  trimClip as trimCore,
  type Background, type CursorStyle, type Gap, type Ms, type OutputSettings, type Project, type Recording, type Zoom,
} from '@buffer-clip/core';
import { temporal } from 'zundo';
import { createStore } from 'zustand/vanilla';

export type Selection = { kind: 'clip' | 'zoom'; id: string };

export interface EditorState {
  recording: Recording;
  project: Project;
  selection: Selection | null;
  picking: boolean;
  hoverZoomId: string | null;
  intro: boolean;
  exportOpen: boolean;
  exportProgress: number | null;
  setExportOpen: (open: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  tourRestart: number;
  restartTour: () => void;
  select: (selection: Selection | null) => void;
  setPicking: (on: boolean) => void;
  setHoverZoom: (id: string | null) => void;
  setBackground: (patch: Partial<Background>) => void;
  setCursor: (patch: Partial<CursorStyle>) => void;
  setOutput: (patch: Partial<OutputSettings>) => void;
  splitAt: (outT: Ms) => void;
  deleteSelection: () => void;
  trimClip: (id: string, edge: 'start' | 'end', srcT: Ms) => void;
  setClipSpeed: (id: string, speed: number) => void;
  fillGap: (gap: Gap) => void;
  cycleIdleClip: (id: string) => void;
  addZoomAt: (srcT: Ms) => void;
  updateZoom: (id: string, patch: Partial<Omit<Zoom, 'id'>>) => void;
  redetectZooms: () => void;
  redetectIdle: () => void;
}

const byStart = (a: Zoom, b: Zoom) => a.start - b.start;

export function createEditorStore(recording: Recording, project: Project, opts: { intro?: boolean } = {}) {
  const duration = recording.durationMs;
  return createStore<EditorState>()(
    temporal(
      (set, get) => {
        const patch = (fn: (p: Project) => Project) => set((s) => ({ project: fn(s.project) }));
        return {
          recording,
          project,
          selection: null,
          picking: false,
          hoverZoomId: null,
          intro: opts.intro ?? false,
          exportOpen: false,
          exportProgress: null,
          setExportOpen: (exportOpen) => set({ exportOpen }),
          paletteOpen: false,
          setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
          tourRestart: 0,
          restartTour: () => set((s) => ({ tourRestart: s.tourRestart + 1 })),
          select: (selection) => set({ selection, picking: false }),
          setPicking: (picking) => set({ picking }),
          setHoverZoom: (hoverZoomId) => set({ hoverZoomId }),
          setBackground: (b) => patch((p) => ({ ...p, background: { ...p.background, ...b } })),
          setCursor: (c) => patch((p) => ({ ...p, cursor: { ...p.cursor, ...c } })),
          setOutput: (o) => patch((p) => ({ ...p, output: { ...p.output, ...o } })),
          splitAt: (outT) => patch((p) => ({ ...p, clips: splitClip(p.clips, outT) })),
          deleteSelection: () => {
            const { selection, project: p } = get();
            if (!selection) return;
            if (selection.kind === 'clip') {
              if (p.clips.length <= 1) return;
              patch((q) => ({ ...q, clips: deleteClip(q.clips, selection.id) }));
            } else {
              patch((q) => ({ ...q, zooms: q.zooms.filter((z) => z.id !== selection.id) }));
            }
            set({ selection: null });
          },
          trimClip: (id, edge, srcT) => patch((p) => ({ ...p, clips: trimCore(p.clips, id, edge, srcT, duration) })),
          setClipSpeed: (id, speed) => patch((p) => ({ ...p, clips: setSpeedCore(p.clips, id, speed) })),
          fillGap: (gap) => patch((p) => ({ ...p, clips: fillGapCore(p.clips, gap) })),
          cycleIdleClip: (id) => {
            patch((p) => ({ ...p, clips: cycleIdleCore(p.clips, id) }));
            const s = get();
            if (s.selection?.id === id && !s.project.clips.some((c) => c.id === id)) set({ selection: null });
          },
          addZoomAt: (srcT) => {
            const zooms = get().project.zooms;
            const slot = zoomSlot(srcT, zooms, duration);
            if (!slot) {
              // Inside a zoom (or no room): select what is there rather than stack a new block on it.
              const under = zooms.find((z) => srcT >= z.start && srcT < z.end);
              if (under) set({ selection: { kind: 'zoom', id: under.id } });
              return;
            }
            const f = contentFrame(recording);
            const z = { ...createZoom(srcT, duration, { x: f.x + f.w / 2, y: f.y + f.h / 2 }), ...slot };
            patch((p) => ({ ...p, zooms: [...p.zooms, z].sort(byStart) }));
            set({ selection: { kind: 'zoom', id: z.id } });
          },
          updateZoom: (id, z) =>
            patch((p) => ({
              ...p,
              zooms: p.zooms
                .map((x) => (x.id === id ? normalizeZoom({ ...x, ...z, auto: false }, duration) : x))
                .sort(byStart),
            })),
          redetectZooms: () => {
            patch((p) => ({ ...p, zooms: replaceAutoZooms(p.zooms, recording.events, duration) }));
            set({ selection: null });
          },
          redetectIdle: () => {
            patch((p) => ({ ...p, clips: detectIdle(recording.events, duration) }));
            set({ selection: null });
          },
        };
      },
      {
        partialize: (s) => ({ project: s.project }),
        equality: (a, b) => a.project === b.project,
        limit: 100,
      },
    ),
  );
}

export type EditorStore = ReturnType<typeof createEditorStore>;

export interface PlaybackState {
  outT: Ms;
  playing: boolean;
  seekId: number;
  seek: (outT: Ms) => void;
  seekBy: (deltaMs: Ms) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  tick: (outT: Ms) => void;
}

export function createPlaybackStore(getDuration: () => Ms) {
  return createStore<PlaybackState>()((set, get) => ({
    outT: 0,
    playing: false,
    seekId: 0,
    seek: (t) => set((s) => ({ outT: Math.min(Math.max(0, t), getDuration()), seekId: s.seekId + 1 })),
    seekBy: (d) => get().seek(get().outT + d),
    play: () => set({ playing: true }),
    pause: () => set({ playing: false }),
    toggle: () => set((s) => ({ playing: !s.playing })),
    tick: (outT) => set({ outT }),
  }));
}

export type PlaybackStore = ReturnType<typeof createPlaybackStore>;

export interface EditorStores { editor: EditorStore; playback: PlaybackStore }

export function createStores(recording: Recording, project: Project, opts: { intro?: boolean } = {}): EditorStores {
  const editor = createEditorStore(recording, project, opts);
  const playback = createPlaybackStore(() => outputDuration(editor.getState().project.clips));
  return { editor, playback };
}

const gestureBase = new WeakMap<EditorStore, Project>();

/** Start a continuous edit (e.g. slider drag): intermediate states are not recorded. */
export function beginGesture(editor: EditorStore): void {
  if (gestureBase.has(editor)) return;
  gestureBase.set(editor, editor.getState().project);
  editor.temporal.getState().pause();
}

/** Finish a continuous edit: record exactly one history entry for the whole gesture. */
export function endGesture(editor: EditorStore): void {
  const base = gestureBase.get(editor);
  gestureBase.delete(editor);
  editor.temporal.getState().resume();
  if (base && base !== editor.getState().project) {
    editor.temporal.setState((t) => ({
      pastStates: [...t.pastStates, { project: base }].slice(-100),
      futureStates: [],
    }));
  }
}
