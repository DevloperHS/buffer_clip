export type TourProgress = { step: number } | { done: true };

const key = (id: string) => `buffer-clip:tour:${id}`;

function defaultStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadTourProgress(id: string, storage: Storage | null = defaultStorage()): TourProgress {
  try {
    const raw = storage?.getItem(key(id));
    if (!raw) return { step: 0 };
    const v = JSON.parse(raw) as { step?: unknown; done?: unknown };
    if (v.done === true) return { done: true };
    if (typeof v.step === 'number' && Number.isInteger(v.step) && v.step >= 0) return { step: v.step };
  } catch {
    // unreadable or junk: start fresh
  }
  return { step: 0 };
}

export function saveTourProgress(id: string, p: TourProgress, storage: Storage | null = defaultStorage()): void {
  try {
    storage?.setItem(key(id), JSON.stringify(p));
  } catch {
    // progress is a convenience; ignore storage failures
  }
}

export function clearTourProgress(id: string, storage: Storage | null = defaultStorage()): void {
  try {
    storage?.removeItem(key(id));
  } catch {
    // ignore
  }
}
