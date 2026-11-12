import { prepareVideo } from './video';

const THUMB_WIDTH = 640;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);
}

async function grab(video: Blob, atSec: number): Promise<Blob | undefined> {
  const url = URL.createObjectURL(video);
  try {
    const el = document.createElement('video');
    el.muted = true;
    el.preload = 'auto';
    const failed = new Promise<never>((_, reject) => el.addEventListener('error', () => reject(new Error('video')), { once: true }));
    el.src = url;
    await Promise.race([prepareVideo(el), failed]);
    const t = Number.isFinite(el.duration) ? Math.min(atSec, el.duration / 2) : atSec;
    el.currentTime = t;
    await Promise.race([new Promise((r) => el.addEventListener('seeked', r, { once: true })), failed]);
    const canvas = document.createElement('canvas');
    canvas.width = THUMB_WIDTH;
    canvas.height = el.videoWidth ? Math.round((THUMB_WIDTH * el.videoHeight) / el.videoWidth) : 360;
    canvas.getContext('2d')?.drawImage(el, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | undefined>((r) => canvas.toBlob((b) => r(b ?? undefined), 'image/jpeg', 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Best-effort poster frame for the projects grid; never throws. */
export async function captureThumbnail(video: Blob, atSec = 1): Promise<Blob | undefined> {
  try {
    return await withTimeout(grab(video, atSec), 4000);
  } catch {
    return undefined;
  }
}
