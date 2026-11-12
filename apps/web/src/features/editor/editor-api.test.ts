import { createInitialProject, type Recording } from '@buffer-clip/core';
import { describe, expect, it } from 'vitest';
import { createEditorApi } from './editor-api';
import { createStores } from './store';

const rec: Recording = {
  id: 'r', createdAt: 0, name: 'Demo', durationMs: 10000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false,
  events: [{ type: 'move', t: 0, x: 0, y: 0 }, { type: 'click', t: 9000, x: 10, y: 10, button: 0 }],
};

describe('editor api', () => {
  it('steps one output frame and pauses', () => {
    const stores = createStores(rec, createInitialProject(rec));
    const api = createEditorApi(stores);
    stores.playback.getState().play();
    api.step(3);
    expect(stores.playback.getState()).toMatchObject({ playing: false, outT: 50 }); // 3 frames at 60 fps
  });
  it('adds a zoom at the source time under the playhead', () => {
    const stores = createStores(rec, createInitialProject(rec));
    const api = createEditorApi(stores);
    stores.playback.getState().seek(100); // inside the first clip, so source time is 100ms
    api.addZoom();
    const { project, selection } = stores.editor.getState();
    const z = project.zooms.find((x) => x.id === selection?.id);
    expect(z?.start).toBe(0);
  });
  it('escape cancels picking before clearing selection', () => {
    const stores = createStores(rec, createInitialProject(rec));
    const api = createEditorApi(stores);
    const id = stores.editor.getState().project.zooms[0].id;
    stores.editor.getState().select({ kind: 'zoom', id });
    stores.editor.getState().setPicking(true);
    api.escape();
    expect(stores.editor.getState()).toMatchObject({ picking: false, selection: { kind: 'zoom', id } });
    api.escape();
    expect(stores.editor.getState().selection).toBeNull();
  });
  it('undoes and redoes through temporal history', () => {
    const stores = createStores(rec, createInitialProject(rec));
    const api = createEditorApi(stores);
    api.setAspect('1:1');
    api.undo();
    expect(stores.editor.getState().project.output.aspect).toBe('16:9');
    api.redo();
    expect(stores.editor.getState().project.output.aspect).toBe('1:1');
  });
  it('opens the export sheet', () => {
    const stores = createStores(rec, createInitialProject(rec));
    createEditorApi(stores).openExport();
    expect(stores.editor.getState().exportOpen).toBe(true);
    expect(stores.editor.temporal.getState().pastStates).toHaveLength(0);
  });
});
