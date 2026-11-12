import type { Recording } from '@buffer-clip/core';

export const APP_SOURCE = 'buffer-clip-app';
export const EXT_SOURCE = 'buffer-clip-ext';

export interface ReceivedRecording {
  recording: Recording;
  video: Blob;
  ack: () => void;
}

export function isRecordingShape(x: unknown): x is Recording {
  const r = x as Partial<Recording> | null;
  return (
    !!r &&
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.durationMs === 'number' &&
    !!r.viewport &&
    Array.isArray(r.events)
  );
}

interface ExtMessage {
  source?: string;
  type?: string;
  id?: string;
  recording?: unknown;
  video?: unknown;
}

/** Ask the Buffer Clip extension for a recording it just captured. Resolves null if unavailable. */
export function requestFromExtension(
  id: string,
  opts: { win?: Window; timeoutMs?: number; retryMs?: number } = {},
): Promise<ReceivedRecording | null> {
  const win = opts.win ?? window;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const retryMs = opts.retryMs ?? 500;

  return new Promise((resolve) => {
    let settled = false;
    const ask = () => win.postMessage({ source: APP_SOURCE, type: 'request', id }, win.location.origin);
    const finish = (value: ReceivedRecording | null) => {
      if (settled) return;
      settled = true;
      win.removeEventListener('message', onMessage);
      clearInterval(retry);
      clearTimeout(timer);
      resolve(value);
    };
    const onMessage = (e: MessageEvent) => {
      const d = e.data as ExtMessage | null;
      if (!d || d.source !== EXT_SOURCE) return;
      if (d.type === 'ready' && e.origin === win.location.origin) {
        ask();
        return;
      }
      if (!e.origin.startsWith('chrome-extension://') || d.id !== id) return;
      if (d.type === 'missing') {
        finish(null);
        return;
      }
      if (d.type === 'recording' && isRecordingShape(d.recording) && d.recording.id === id && d.video instanceof Blob) {
        const source = e.source as Window | null;
        const origin = e.origin;
        finish({
          recording: d.recording,
          video: d.video,
          ack: () => source?.postMessage({ source: APP_SOURCE, type: 'ack', id }, origin),
        });
      }
    };
    win.addEventListener('message', onMessage);
    const retry = setInterval(ask, retryMs);
    const timer = setTimeout(() => finish(null), timeoutMs);
    ask();
  });
}
