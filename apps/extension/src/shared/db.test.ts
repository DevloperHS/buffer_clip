import 'fake-indexeddb/auto';
import type { Recording } from '@buffer-clip/core';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { deletePending, getPending, listPending, putPending } from './db';

const rec = (id: string, createdAt: number): Recording => ({
  id, createdAt, name: `Rec ${id}`, durationMs: 4000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false, events: [],
});

beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true, writable: true });
});

describe('pending store', () => {
  it('stores, lists newest first, reads and deletes', async () => {
    await putPending({ id: 'a', recording: rec('a', 1), video: new Blob(['va']) });
    await putPending({ id: 'b', recording: rec('b', 2), video: new Blob(['vb']) });
    expect(await listPending()).toEqual([
      { id: 'b', name: 'Rec b', durationMs: 4000, createdAt: 2 },
      { id: 'a', name: 'Rec a', durationMs: 4000, createdAt: 1 },
    ]);
    expect(await (await getPending('a'))!.video.text()).toBe('va');
    await deletePending('a');
    expect(await getPending('a')).toBeUndefined();
    expect(await listPending()).toHaveLength(1);
  });
});
