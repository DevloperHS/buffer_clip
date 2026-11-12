import { formatElapsed } from '../shared/format';
import type { BgRequest, Mode, PendingSummary, Result, StatusResponse } from '../shared/messages';
import { isRecordable } from '../shared/recordable';
import { popupView } from './model';

const app = document.getElementById('app') as HTMLElement;
let tabId = -1;
let recordable = false;
let mode: Mode = 'tab';
let audio = false;
let timer: ReturnType<typeof setInterval> | null = null;

const send = <T>(msg: BgRequest) => chrome.runtime.sendMessage(msg) as Promise<T>;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const HEADER = `<header><span class="logo"><i></i></span><span class="title">Buffer Clip</span></header>`;

function pendingList(items: PendingSummary[]): string {
  if (items.length === 0) return '';
  return `<section class="pending"><h2>Unsent recordings</h2><ul>${items
    .map((p) => `<li><span><b>${esc(p.name)}</b><small>${formatElapsed(p.durationMs)}</small></span><button data-open="${esc(p.id)}">Open</button></li>`)
    .join('')}</ul></section>`;
}

function render(status: StatusResponse, error?: string): void {
  if (timer) clearInterval(timer);
  timer = null;
  const view = popupView(recordable, status.session);
  const err = error ? `<p class="error" role="alert">${esc(error)}</p>` : '';

  if (view === 'recording') {
    const startedAt = status.session?.startedAt ?? Date.now();
    app.innerHTML = `${HEADER}<div class="live"><span class="rec"></span><span class="time" id="time">${formatElapsed(Date.now() - startedAt)}</span></div>
      <button class="stop" data-act="stop">Stop recording</button><p class="sub" style="margin-top:8px">Or press Alt+Shift+S</p>${err}`;
    const time = document.getElementById('time') as HTMLElement;
    timer = setInterval(() => (time.textContent = formatElapsed(Date.now() - startedAt)), 500);
    return;
  }
  if (view === 'preparing') {
    app.innerHTML = `${HEADER}<div class="card"><p class="h">Get ready</p><p class="sub">Finish selecting an area or wait for the countdown.</p></div>`;
    return;
  }
  if (view === 'restricted') {
    app.innerHTML = `${HEADER}<div class="card"><p class="h">This page can't be recorded</p><p class="sub">Open a regular website, then try again.</p></div>${pendingList(status.pending)}`;
    return;
  }
  app.innerHTML = `${HEADER}
    <div class="seg" role="radiogroup" aria-label="Capture" data-active="${mode}">
      <span class="pill"></span>
      <button role="radio" aria-checked="${mode === 'tab'}" data-mode="tab">Full tab</button>
      <button role="radio" aria-checked="${mode === 'area'}" data-mode="area">Select area</button>
    </div>
    <div class="row"><span>Include tab audio</span><button class="switch" role="switch" aria-label="Include tab audio" aria-checked="${audio}" data-act="audio"><i></i></button></div>
    <button class="record" data-act="record" aria-label="Start recording"><span class="dot"></span></button>
    <p class="sub">${mode === 'area' ? 'Drag over the page to choose what to record.' : 'Recording starts after a 3 second countdown.'}</p>
    ${err}${pendingList(status.pending)}`;
}

async function refresh(error?: string): Promise<void> {
  render(await send<StatusResponse>({ type: 'popup:status' }), error);
}

app.addEventListener('click', async (e) => {
  const el = (e.target as HTMLElement).closest('button');
  if (!el) return;
  const openId = el.getAttribute('data-open');
  if (openId) {
    await send<Result>({ type: 'popup:open', id: openId });
    window.close();
    return;
  }
  const nextMode = el.getAttribute('data-mode') as Mode | null;
  if (nextMode) {
    mode = nextMode;
    await chrome.storage.local.set({ mode });
    return refresh();
  }
  switch (el.getAttribute('data-act')) {
    case 'audio':
      audio = !audio;
      await chrome.storage.local.set({ audio });
      return refresh();
    case 'record': {
      // The background drives the rest; close so the page is unobstructed.
      void send<Result>({ type: 'popup:start', tabId, mode, audio });
      setTimeout(() => window.close(), 60);
      return;
    }
    case 'stop': {
      const res = await send<Result>({ type: 'popup:stop' });
      if (res?.ok) window.close();
      else await refresh(res?.error ?? 'Could not stop the recording.');
      return;
    }
  }
});

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id ?? -1;
  recordable = isRecordable(tab?.url);
  const prefs = await chrome.storage.local.get(['mode', 'audio']);
  mode = prefs.mode === 'area' ? 'area' : 'tab';
  audio = prefs.audio === true;
  await refresh();
})();
