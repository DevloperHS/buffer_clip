import { APP_SOURCE, EXT_SOURCE } from '../shared/messages';

// Runs on APP_ORIGIN pages. Announces itself and, on request, mounts a hidden
// extension iframe that hands the recording to the page.
window.postMessage({ source: EXT_SOURCE, type: 'ready' }, location.origin);

window.addEventListener('message', (e: MessageEvent) => {
  const d = e.data as { source?: string; type?: string; id?: unknown } | null;
  if (e.source !== window || !d || d.source !== APP_SOURCE || d.type !== 'request' || typeof d.id !== 'string') return;
  const id = d.id;
  if (document.querySelector(`iframe[data-buffer-clip="${CSS.escape(id)}"]`)) return;
  const frame = document.createElement('iframe');
  frame.dataset.bufferClip = id;
  frame.src = chrome.runtime.getURL(`bridge.html#${encodeURIComponent(id)}`);
  frame.style.cssText = 'display:none';
  frame.setAttribute('aria-hidden', 'true');
  (document.body ?? document.documentElement).appendChild(frame);
});
