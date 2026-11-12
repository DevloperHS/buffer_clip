import { createInitialProject, type Project, type Recording } from '@buffer-clip/core';
import { openDB, type DBSchema } from 'idb';

interface BufferClipDB extends DBSchema {
  recordings: { key: string; value: Recording };
  videos: { key: string; value: Blob };
  thumbs: { key: string; value: Blob };
  projects: { key: string; value: Project };
}

const DB_NAME = 'buffer-clip';
const DB_VERSION = 1;

function open() {
  return openDB<BufferClipDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('recordings', { keyPath: 'id' });
      db.createObjectStore('videos');
      db.createObjectStore('thumbs');
      db.createObjectStore('projects', { keyPath: 'recordingId' });
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

export async function saveRecording(rec: Recording, video: Blob, thumb?: Blob): Promise<void> {
  if (typeof navigator !== 'undefined') void navigator.storage?.persist?.();
  await withDb(async (db) => {
    const tx = db.transaction(['recordings', 'videos', 'thumbs'], 'readwrite');
    await Promise.all([
      tx.objectStore('recordings').put(rec),
      tx.objectStore('videos').put(video, rec.id),
      thumb ? tx.objectStore('thumbs').put(thumb, rec.id) : Promise.resolve(),
      tx.done,
    ]);
  });
}

export async function listRecordings(): Promise<Recording[]> {
  const all = await withDb((db) => db.getAll('recordings'));
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export const getRecording = (id: string) => withDb((db) => db.get('recordings', id));
export const getVideo = (id: string) => withDb((db) => db.get('videos', id));
export const getThumb = (id: string) => withDb((db) => db.get('thumbs', id));
export const getProject = (id: string) => withDb((db) => db.get('projects', id));

export async function saveProject(p: Project): Promise<void> {
  await withDb((db) => db.put('projects', p));
}

export async function renameRecording(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  await withDb(async (db) => {
    const rec = await db.get('recordings', id);
    if (rec) await db.put('recordings', { ...rec, name: trimmed });
  });
}

export async function deleteRecording(id: string): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(['recordings', 'videos', 'thumbs', 'projects'], 'readwrite');
    await Promise.all([
      tx.objectStore('recordings').delete(id),
      tx.objectStore('videos').delete(id),
      tx.objectStore('thumbs').delete(id),
      tx.objectStore('projects').delete(id),
      tx.done,
    ]);
  });
}

export async function loadOrCreateProject(
  id: string,
): Promise<{ recording: Recording; project: Project; created: boolean } | null> {
  const recording = await getRecording(id);
  if (!recording) return null;
  let project = await getProject(id);
  let created = false;
  if (!project) {
    project = createInitialProject(recording);
    await saveProject(project);
    created = true;
  }
  return { recording, project, created };
}

export function storageErrorMessage(e: unknown): string {
  if (e instanceof DOMException && e.name === 'QuotaExceededError') {
    return 'Not enough storage. Delete old recordings.';
  }
  return 'Something went wrong. Try again.';
}
