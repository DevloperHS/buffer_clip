import { listPending } from './shared/db';
import { formatElapsed } from './shared/format';
import type { BgRequest, ContentRequest, Mode, OffscreenRequest, Prepared, Result, Session, StatusResponse } from './shared/messages';
import { isRecordable, RESTRICTED_MESSAGE } from './shared/recordable';

const SESSION_KEY = 'session';
const REC_COLOR = '#E5484D';

async function getSession(): Promise<Session | null> {
  const got = await chrome.storage.session.get(SESSION_KEY);
  return (got[SESSION_KEY] as Session | undefined) ?? null;
}
const setSession = (s: Session) => chrome.storage.session.set({ [SESSION_KEY]: s });
const clearSession = () => chrome.storage.session.remove(SESSION_KEY);

const toContent = <T>(tabId: number, msg: ContentRequest) => chrome.tabs.sendMessage(tabId, msg) as Promise<T>;
const toOffscreen = (msg: OffscreenRequest) => chrome.runtime.sendMessage(msg) as Promise<Result>;
const editorUrl = (id: string) => `${__APP_ORIGIN__}/editor/${id}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ensureOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT] });
  if (contexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Record the selected tab with MediaRecorder',
  });
}

async function closeOffscreen(): Promise<void> {
  await chrome.offscreen.closeDocument().catch(() => {});
}

async function setBadge(text: string): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color: REC_COLOR });
  await chrome.action.setBadgeText({ text });
}

async function injectRecorder(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['recorder-content.js'] });
}

async function startRecording(tabId: number, mode: Mode, audio: boolean, mic: boolean): Promise<Result> {
  if (await getSession()) return { ok: false, error: 'A recording is already in progress.' };
  const tab = await chrome.tabs.get(tabId);
  if (!isRecordable(tab.url)) return { ok: false, error: RESTRICTED_MESSAGE };

  await setSession({ tabId, phase: 'preparing', startedAt: null, mode, audio, mic });
  try {
    await injectRecorder(tabId);
    const prepared = await toContent<Prepared | null>(tabId, { type: 'content:prepare', mode });
    if (!prepared) {
      await clearSession();
      return { ok: false, error: 'Recording cancelled.' };
    }
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
    await ensureOffscreen();
    const started = await toOffscreen({ type: 'offscreen:start', streamId, audio, mic, viewport: prepared.viewport, crop: prepared.crop });
    if (!started?.ok) throw new Error(started?.error ?? 'Could not start the recorder.');
    await toContent(tabId, { type: 'content:begin' });
    await setSession({ tabId, phase: 'recording', startedAt: Date.now(), mode, audio, mic });
    await setBadge('0:00');
    return { ok: true };
  } catch (e) {
    await clearSession();
    await closeOffscreen();
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

let stopping = false;

async function stopRecording(): Promise<Result> {
  const session = await getSession();
  if (!session || session.phase !== 'recording' || stopping) return { ok: false, error: 'Not recording.' };
  stopping = true;
  try {
    // Flush the last batch of events before the recorder closes.
    await toContent(session.tabId, { type: 'content:end' }).catch(() => {});
    await wait(50);
    const result = await toOffscreen({ type: 'offscreen:stop' });
    await clearSession();
    await chrome.action.setBadgeText({ text: '' });
    await closeOffscreen();
    if (result?.ok && result.id) await chrome.tabs.create({ url: editorUrl(result.id) });
    return result ?? { ok: false, error: 'Recorder did not respond.' };
  } finally {
    stopping = false;
  }
}

async function status(): Promise<StatusResponse> {
  return { session: await getSession(), pending: await listPending().catch(() => []) };
}

function route(msg: BgRequest): Promise<unknown> | null {
  switch (msg.type) {
    case 'popup:status':
      return status();
    case 'popup:start':
      return startRecording(msg.tabId, msg.mode, msg.audio, msg.mic === true);
    case 'popup:stop':
      return stopRecording();
    case 'popup:open':
      return chrome.tabs.create({ url: editorUrl(msg.id) }).then(() => ({ ok: true }));
    case 'offscreen:tick':
      return setBadge(formatElapsed(msg.elapsedMs)).then(() => ({ ok: true }));
    default:
      return null;
  }
}

chrome.runtime.onMessage.addListener((msg: BgRequest, _sender, sendResponse) => {
  const pending = route(msg);
  if (!pending) return false;
  pending.then(sendResponse, (e: unknown) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  return true;
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'stop-recording') void stopRecording();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const s = await getSession();
  if (s?.tabId === tabId && s.phase === 'recording') await stopRecording();
});

// A full navigation inside the recorded tab drops the content script: re-inject it.
// (activeTab may not cover the new page's origin; events then pause until the next stop.)
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'complete') return;
  const s = await getSession();
  if (s?.tabId !== tabId || s.phase !== 'recording') return;
  try {
    await injectRecorder(tabId);
    await toContent(tabId, { type: 'content:begin' });
  } catch {
    // ignore: capture keeps running, events resume on pages we can still script
  }
});
