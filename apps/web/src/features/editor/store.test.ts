import { createInitialProject, listGaps, outputDuration, type Recording } from '@buffer-clip/core';
import { describe, expect, it } from 'vitest';
import { beginGesture, createStores, endGesture } from './store';

const rec: Recording = {
  id: 'r', createdAt: 0, name: 'Demo', durationMs: 10000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false,
  events: [
    { type: 'move', t: 0, x: 0, y: 0 },
    { type: 'click', t: 1000, x: 100, y: 100, button: 0 },
    { type: 'move', t: 1100, x: 110, y: 105 },
    { type: 'click', t: 8000, x: 600, y: 400, button: 0 },
  ],
};
const fresh = () => createStores(rec, createInitialProject(rec));

describe('editor store', () => {
  it('splits with undo and redo', () => {
    const { editor } = fresh();
    expect(editor.getState().project.clips).toHaveLength(2);
    editor.getState().splitAt(500);
    expect(editor.getState().project.clips).toHaveLength(3);
    editor.temporal.getState().undo();
    expect(editor.getState().project.clips).toHaveLength(2);
    editor.temporal.getState().redo();
    expect(editor.getState().project.clips).toHaveLength(3);
  });
  it('does not record selection, hover or picking in history', () => {
    const { editor } = fresh();
    const s = editor.getState();
    s.select({ kind: 'clip', id: s.project.clips[0].id });
    s.setHoverZoom('x');
    s.setPicking(true);
    expect(editor.temporal.getState().pastStates).toHaveLength(0);
  });
  it('deletes the selected zoom or clip, but never the last clip', () => {
    const { editor } = fresh();
    const s = editor.getState();
    s.select({ kind: 'zoom', id: s.project.zooms[0].id });
    editor.getState().deleteSelection();
    expect(editor.getState().project.zooms).toHaveLength(1);
    expect(editor.getState().selection).toBeNull();
    editor.getState().select({ kind: 'clip', id: editor.getState().project.clips[0].id });
    editor.getState().deleteSelection();
    expect(editor.getState().project.clips).toHaveLength(1);
    editor.getState().select({ kind: 'clip', id: editor.getState().project.clips[0].id });
    editor.getState().deleteSelection();
    expect(editor.getState().project.clips).toHaveLength(1);
  });
  it('adds a manual zoom at the frame centre and selects it', () => {
    const { editor } = fresh();
    editor.getState().addZoomAt(5000);
    const { project, selection } = editor.getState();
    const added = project.zooms.find((z) => z.id === selection?.id);
    expect(project.zooms).toHaveLength(3);
    expect(added).toMatchObject({ start: 4500, end: 6500, auto: false, target: { x: 640, y: 360 } });
  });
  it('fits an added zoom beside existing ones instead of overlapping them', () => {
    const { editor } = fresh();
    const [first] = editor.getState().project.zooms;
    editor.getState().addZoomAt(first.end + 100);
    const zooms = editor.getState().project.zooms;
    zooms.slice(1).forEach((z, i) => expect(z.start).toBeGreaterThanOrEqual(zooms[i].end));
  });
  it('selects the zoom under the time instead of stacking a new one on it', () => {
    const { editor } = fresh();
    const [first] = editor.getState().project.zooms;
    editor.getState().addZoomAt((first.start + first.end) / 2);
    expect(editor.getState().project.zooms).toHaveLength(2);
    expect(editor.getState().selection).toEqual({ kind: 'zoom', id: first.id });
  });
  it('normalizes zoom edits and marks them manual', () => {
    const { editor } = fresh();
    const z = editor.getState().project.zooms[0];
    editor.getState().updateZoom(z.id, { start: -50, scale: 10 });
    expect(editor.getState().project.zooms.find((x) => x.id === z.id)).toMatchObject({ start: 0, scale: 4, auto: false });
  });
  it('fills a gap and cycles the idle clip back to a cut', () => {
    const { editor } = fresh();
    const gap = listGaps(editor.getState().project.clips, rec.durationMs)[0];
    editor.getState().fillGap(gap);
    const idle = editor.getState().project.clips.find((c) => c.idle)!;
    expect(idle.speed).toBe(8);
    editor.getState().cycleIdleClip(idle.id);
    expect(editor.getState().project.clips.find((c) => c.id === idle.id)?.speed).toBe(1);
    editor.getState().cycleIdleClip(idle.id);
    expect(editor.getState().project.clips.some((c) => c.id === idle.id)).toBe(false);
  });
  it('re-detecting zooms keeps manual ones', () => {
    const { editor } = fresh();
    editor.getState().addZoomAt(5000);
    editor.getState().redetectZooms();
    const zooms = editor.getState().project.zooms;
    expect(zooms).toHaveLength(3);
    expect(zooms.filter((z) => !z.auto)).toHaveLength(1);
  });
  it('records a slider gesture as a single history entry', () => {
    const { editor } = fresh();
    beginGesture(editor);
    editor.getState().setBackground({ padding: 70 });
    editor.getState().setBackground({ padding: 80 });
    editor.getState().setBackground({ padding: 90 });
    endGesture(editor);
    expect(editor.temporal.getState().pastStates).toHaveLength(1);
    editor.temporal.getState().undo();
    expect(editor.getState().project.background.padding).toBe(64);
  });
});

describe('playback store', () => {
  it('clamps seeks to the output duration and bumps seekId', () => {
    const { editor, playback } = fresh();
    playback.getState().seek(-5);
    expect(playback.getState()).toMatchObject({ outT: 0, seekId: 1 });
    playback.getState().seek(1e9);
    expect(playback.getState().outT).toBe(outputDuration(editor.getState().project.clips));
    playback.getState().toggle();
    expect(playback.getState().playing).toBe(true);
  });
  it('keeps palette and tour-restart state out of history', () => {
    const { editor } = fresh();
    editor.getState().setPaletteOpen(true);
    editor.getState().restartTour();
    expect(editor.getState()).toMatchObject({ paletteOpen: true, tourRestart: 1 });
    expect(editor.temporal.getState().pastStates).toHaveLength(0);
  });
});
