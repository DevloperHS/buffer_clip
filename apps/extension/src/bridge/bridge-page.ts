import { deletePending, getPending } from '../shared/db';
import { APP_SOURCE, EXT_SOURCE } from '../shared/messages';

const id = decodeURIComponent(location.hash.slice(1));
const target = __APP_ORIGIN__;

window.addEventListener('message', async (e: MessageEvent) => {
  const d = e.data as { source?: string; type?: string; id?: string } | null;
  if (e.origin !== target || !d || d.source !== APP_SOURCE || d.type !== 'ack' || d.id !== id) return;
  await deletePending(id);
});

(async () => {
  const pending = id ? await getPending(id) : undefined;
  window.parent.postMessage(
    pending
      ? { source: EXT_SOURCE, type: 'recording', id, recording: pending.recording, video: pending.video }
      : { source: EXT_SOURCE, type: 'missing', id },
    target,
  );
})();
