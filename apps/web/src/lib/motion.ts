import { motionFromLuma, type Ms, type MotionTrack } from '@buffer-clip/core';

const W = 64;
const H = 36;
const MAX_SAMPLES = 1500;

/**
 * How much the picture changes over time, measured on tiny frames (64x36) about five times a second.
 * Idle detection uses it so moving footage (animations, videos, 3D scenes) is never cut as "idle".
 * Returns null if the video can't be decoded; idle detection then falls back to input events only.
 */
export async function computeMotion(video: Blob, durationMs: Ms): Promise<MotionTrack | null> {
  const { ALL_FORMATS, BlobSource, CanvasSink, Input } = await import('mediabunny');
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(video) });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) return null;
    const stepMs = Math.max(200, Math.ceil(durationMs / MAX_SAMPLES));
    const count = Math.max(2, Math.floor(durationMs / stepMs));
    const start = await track.getFirstTimestamp();
    const times = Array.from({ length: count }, (_, i) => start + (i * stepMs) / 1000);
    const sink = new CanvasSink(track, { width: W, height: H, fit: 'fill', poolSize: 1 });
    const scratch = document.createElement('canvas');
    scratch.width = W;
    scratch.height = H;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const frames: Uint8Array[] = [];
    let last = new Uint8Array(W * H);
    for await (const wrapped of sink.canvasesAtTimestamps(times)) {
      if (wrapped) {
        ctx.drawImage(wrapped.canvas, 0, 0);
        const px = ctx.getImageData(0, 0, W, H).data;
        const luma = new Uint8Array(W * H);
        for (let i = 0; i < luma.length; i++) luma[i] = (px[i * 4] * 77 + px[i * 4 + 1] * 150 + px[i * 4 + 2] * 29) >> 8;
        last = luma;
      }
      frames.push(last);
    }
    return { stepMs, values: motionFromLuma(frames).map((v) => Math.round(v * 10000) / 10000) };
  } finally {
    input.dispose?.();
  }
}
