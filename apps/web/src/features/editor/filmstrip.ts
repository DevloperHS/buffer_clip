import { decoderJunkRows, type Ms, type Rect } from '@buffer-clip/core';

/** One sprite image holding evenly spaced frames from the recording, left to right. */
export interface Filmstrip {
  url: string;
  /** Frame size in the sprite, px. */
  frameW: number;
  frameH: number;
  count: number;
  /** Source time between consecutive frames. */
  stepMs: Ms;
}

const MIN_FRAMES = 24;
const MAX_FRAMES = 160;
const TARGET_STEP_MS = 200;

/** Source times to sample: the centre of each of `count` equal slices of the recording. */
export function sampleTimes(durationMs: Ms): { times: Ms[]; stepMs: Ms } {
  const count = Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, Math.ceil(durationMs / TARGET_STEP_MS)));
  const stepMs = durationMs / count;
  return { times: Array.from({ length: count }, (_, i) => (i + 0.5) * stepMs), stepMs };
}

export interface Tile {
  left: number;
  width: number;
  frame: number;
}

/**
 * The thumbnails drawn across a clip block, NLE style: fixed-width tiles from the left edge, each
 * showing the frame at the source time under its centre. The last tile is cut by the block's edge.
 */
export function clipTiles(
  strip: Pick<Filmstrip, 'count' | 'stepMs'>,
  src: { start: Ms; end: Ms },
  widthPx: number,
  tileW: number,
): Tile[] {
  if (widthPx <= 0 || tileW <= 0 || strip.count === 0) return [];
  const n = Math.ceil(widthPx / tileW);
  const tiles: Tile[] = [];
  for (let k = 0; k < n; k++) {
    const left = k * tileW;
    const centre = Math.min(left + tileW / 2, widthPx);
    const t = src.start + (centre / widthPx) * (src.end - src.start);
    const frame = Math.min(strip.count - 1, Math.max(0, Math.floor(t / strip.stepMs)));
    tiles.push({ left, width: Math.min(tileW, widthPx - left), frame });
  }
  return tiles;
}

/** Decode the frames with mediabunny and pack them into one sprite. Null if the video can't be decoded. */
export async function buildFilmstrip(
  videoUrl: string,
  opts: { durationMs: Ms; viewportW: number; crop: Rect | null; frameH: number; signal?: AbortSignal },
): Promise<Filmstrip | null> {
  const { ALL_FORMATS, BlobSource, CanvasSink, Input } = await import('mediabunny');
  const blob = await fetch(videoUrl).then((r) => r.blob());
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(blob) });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) return null;
    const scale = track.displayWidth / opts.viewportW;
    const crop = opts.crop
      ? {
          left: Math.round(opts.crop.x * scale),
          top: Math.round(opts.crop.y * scale),
          width: Math.round(opts.crop.w * scale),
          height: Math.round(opts.crop.h * scale),
        }
      : undefined;
    const srcW = crop?.width ?? track.displayWidth;
    const srcH = crop?.height ?? track.displayHeight;
    const frameH = opts.frameH;
    const frameW = Math.max(1, Math.round((frameH * srcW) / srcH));
    const { times, stepMs } = sampleTimes(opts.durationMs);

    // Skip the rows hardware decoders overwrite on frames that aren't 16 pixels tall multiples.
    const junk = decoderJunkRows(track.displayHeight);
    const trimmed = junk > 0
      ? { left: crop?.left ?? 0, top: (crop?.top ?? 0) + junk, width: srcW, height: Math.max(1, srcH - junk) }
      : crop;
    const sink = new CanvasSink(track, { width: frameW, height: frameH, fit: 'cover', crop: trimmed, poolSize: 2 });
    const sprite = document.createElement('canvas');
    sprite.width = frameW * times.length;
    sprite.height = frameH;
    const ctx = sprite.getContext('2d');
    if (!ctx) return null;

    const start = await track.getFirstTimestamp();
    let i = 0;
    for await (const wrapped of sink.canvasesAtTimestamps(times.map((t) => start + t / 1000))) {
      if (opts.signal?.aborted) return null;
      if (wrapped) ctx.drawImage(wrapped.canvas, i * frameW, 0);
      else if (i > 0) ctx.drawImage(sprite, (i - 1) * frameW, 0, frameW, frameH, i * frameW, 0, frameW, frameH);
      i++;
    }
    const out = await new Promise<Blob | null>((res) => sprite.toBlob(res, 'image/jpeg', 0.8));
    if (!out || opts.signal?.aborted) return null;
    return { url: URL.createObjectURL(out), frameW, frameH, count: times.length, stepMs };
  } finally {
    input.dispose?.();
  }
}
