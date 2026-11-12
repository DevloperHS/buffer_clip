import type { Recording } from '@buffer-clip/core';
import { openDB, type DBSchema } from 'idb';
import type { PendingSummary } from './messages';

export const EXT_DB = 'buffer-clip-ext';

export interface PendingRecording { id: string; recording: Recording; video: Blob }

interface ExtDB extends DBSchema {
  pending: { key: string; value: PendingRecording };
}

function open() {
  return openDB<ExtDB>(EXT_DB, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pending')) db.createObjectStore('pending', { keyPath: 'id' });
    },
  });
}

async function withDb<T>(fn: (db: Awaited<ReturnType<typeof open>>) => Promise<T>): Promise<T> {
  const db = await open();
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}

export const putPending = (p: PendingRecording) => withDb(async (db) => { await db.put('pending', p); });
export const getPending = (id: string) => withDb((db) => db.get('pending', id));
export const deletePending = (id: string) => withDb((db) => db.delete('pending', id));

export async function listPending(): Promise<PendingSummary[]> {
  const all = await withDb((db) => db.getAll('pending'));
  return all
    .map(({ recording: r }) => ({ id: r.id, name: r.name, durationMs: r.durationMs, createdAt: r.createdAt }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
