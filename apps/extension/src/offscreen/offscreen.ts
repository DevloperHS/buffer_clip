import { newId, type InputEvent } from '@buffer-clip/core';
import { putPending } from '../shared/db';
import type { OffscreenRequest, Result } from '../shared/messages';
import { buildRecording } from '../shared/recording';

type StartMsg = Extract<OffscreenRequest, { type: 'offscreen:start' }>;

let recorder: MediaRecorder | null = null;
let stream: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let setup: StartMsg | null = null;
let chunks: Blob[] = [];
let events: InputEvent[] = [];
let startedAt = 0;
let ticker: ReturnType<typeof setInterval> | null = null;

const epochNow = () => performance.timeOrigin + performance.now();
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

function pickMime(audio: boolean): string {
  const candidates = audio
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';
}

async function start(msg: StartMsg): Promise<void> {
  if (recorder) throw new Error('Already recording');
  setup = msg;
  chunks = [];
  events = [];
  const tabSource = { chromeMediaSource: 'tab', chromeMediaSourceId: msg.streamId };
  const constraints = {
    audio: msg.audio ? { mandatory: tabSource } : false,
    video: {
      mandatory: {
        ...tabSource,
        maxWidth: Math.round(msg.viewport.w * msg.viewport.dpr),
        maxHeight: Math.round(msg.viewport.h * msg.viewport.dpr),
        maxFrameRate: 30,
      },
    },
  };
  stream = await navigator.mediaDevices.getUserMedia(constraints as unknown as MediaStreamConstraints);
  if (msg.audio) {
    // Capturing tab audio mutes it for the user; play it back so they still hear the page.
    audioCtx = new AudioContext();
    audioCtx.createMediaStreamSource(stream).connect(audioCtx.destination);
  }
  const rec = new MediaRecorder(stream, { mimeType: pickMime(msg.audio), videoBitsPerSecond: 12_000_000 });
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const started = new Promise<void>((resolve) => {
    rec.onstart = () => {
      startedAt = epochNow();
      resolve();
    };
  });
  recorder = rec;
  rec.start(1000);
  await started;
  ticker = setInterval(() => {
    chrome.runtime.sendMessage({ type: 'offscreen:tick', elapsedMs: epochNow() - startedAt }).catch(() => {});
  }, 1000);
}

async function stop(): Promise<string> {
  const rec = recorder;
  if (!rec || !setup) throw new Error('Not recording');
  if (ticker) clearInterval(ticker);
  ticker = null;
  const stopped = new Promise<void>((resolve) => {
    rec.onstop = () => resolve();
  });
  rec.stop();
  await stopped;
  const stoppedAt = epochNow();
  stream?.getTracks().forEach((t) => t.stop());
  await audioCtx?.close();

  const recording = buildRecording({
    id: newId(),
    createdAt: Date.now(),
    startedAt,
    stoppedAt,
    viewport: setup.viewport,
    crop: setup.crop,
    hasAudio: setup.audio,
    events,
  });
  await putPending({ id: recording.id, recording, video: new Blob(chunks, { type: 'video/webm' }) });
  recorder = null;
  stream = null;
  audioCtx = null;
  setup = null;
  chunks = [];
  events = [];
  return recording.id;
}

chrome.runtime.onMessage.addListener((msg: OffscreenRequest, _sender, send: (r: Result) => void) => {
  switch (msg.type) {
    case 'offscreen:start':
      start(msg).then(() => send({ ok: true }), (e) => send({ ok: false, error: errorText(e) }));
      return true;
    case 'offscreen:stop':
      stop().then((id) => send({ ok: true, id }), (e) => send({ ok: false, error: errorText(e) }));
      return true;
    case 'content:events':
      if (recorder) events.push(...msg.events);
      return false;
    default:
      return false;
  }
});
