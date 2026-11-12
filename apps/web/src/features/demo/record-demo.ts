import { newId, type Recording } from '@buffer-clip/core';
import { buildDemoScript, DEMO_NAME, DEMO_VIEWPORT } from './demo-script';
import { drawDemoScene } from './draw-demo-scene';

const THUMB_AT_MS = 6000;

export async function recordDemo(
  onProgress?: (p: number) => void,
): Promise<{ recording: Recording; video: Blob; thumb: Blob }> {
  const script = buildDemoScript();
  const canvas = document.createElement('canvas');
  canvas.width = DEMO_VIEWPORT.w;
  canvas.height = DEMO_VIEWPORT.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  drawDemoScene(ctx, script.sceneAt(0));
  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(1000);
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = performance.now() - t0;
      drawDemoScene(ctx, script.sceneAt(Math.min(t, script.durationMs)));
      onProgress?.(Math.min(1, t / script.durationMs));
      if (t >= script.durationMs) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  drawDemoScene(ctx, script.sceneAt(THUMB_AT_MS));
  const thumb = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Thumbnail failed'))), 'image/jpeg', 0.85),
  );

  const recording: Recording = {
    id: newId(),
    createdAt: Date.now(),
    name: DEMO_NAME,
    durationMs: script.durationMs,
    viewport: DEMO_VIEWPORT,
    crop: null,
    hasAudio: false,
    tutorial: true,
    events: script.events,
  };
  return { recording, video: new Blob(chunks, { type: 'video/webm' }), thumb };
}
