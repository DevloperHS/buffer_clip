// @vitest-environment node
import type { Recording } from '@buffer-clip/core';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  deleteRecording, getProject, getThumb, getVideo, listRecordings, loadOrCreateProject,
  renameRecording, saveProject, saveRecording, storageErrorMessage,
} from './storage';

const rec = (id: string, createdAt: number): Recording => ({
  id, createdAt, name: `Rec ${id}`, durationMs: 5000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false,
  events: [{ type: 'click', t: 1000, x: 10, y: 10, button: 0 }],
});

beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true, writable: true });
});

describe('storage', () => {
  it('saves and lists recordings newest first, with video and thumb blobs', async () => {
    await saveRecording(rec('a', 1), new Blob(['vid-a']), new Blob(['thumb-a']));
    await saveRecording(rec('b', 2), new Blob(['vid-b']));
    expect((await listRecordings()).map((r) => r.id)).toEqual(['b', 'a']);
    expect(await (await getVideo('a'))!.text()).toBe('vid-a');
    expect(await (await getThumb('a'))!.text()).toBe('thumb-a');
    expect(await getThumb('b')).toBeUndefined();
  });
  it('renames, ignoring blank names', async () => {
    await saveRecording(rec('a', 1), new Blob(['v']));
    await renameRecording('a', '  Onboarding  ');
    expect((await listRecordings())[0].name).toBe('Onboarding');
    await renameRecording('a', '   ');
    expect((await listRecordings())[0].name).toBe('Onboarding');
  });
  it('creates the auto-edited project once, then returns the saved one', async () => {
    await saveRecording(rec('a', 1), new Blob(['v']));
    const first = await loadOrCreateProject('a');
    expect(first?.created).toBe(true);
    expect(first?.project.recordingId).toBe('a');
    expect(first?.project.zooms).toHaveLength(1);
    await saveProject({ ...first!.project, zooms: [] });
    const second = await loadOrCreateProject('a');
    expect(second?.created).toBe(false);
    expect(second?.project.zooms).toEqual([]);
    expect(await loadOrCreateProject('missing')).toBeNull();
  });
  it('deletes everything for a recording', async () => {
    await saveRecording(rec('a', 1), new Blob(['v']), new Blob(['t']));
    await loadOrCreateProject('a');
    await deleteRecording('a');
    expect(await listRecordings()).toEqual([]);
    expect(await getVideo('a')).toBeUndefined();
    expect(await getThumb('a')).toBeUndefined();
    expect(await getProject('a')).toBeUndefined();
  });
  it('maps quota errors to a friendly message', () => {
    expect(storageErrorMessage(new DOMException('full', 'QuotaExceededError'))).toBe(
      'Not enough storage. Delete old recordings.',
    );
    expect(storageErrorMessage(new Error('x'))).toBe('Something went wrong. Try again.');
  });
});
