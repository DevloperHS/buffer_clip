import { outputDuration, outputSize, outToSrc, type Clip, type Ms, type Project, type Size } from '@buffer-clip/core';

export const AUDIO_BITRATE = 192_000;
const BASE_BITRATE = 12_000_000; // 1080p30
const MIN_BITRATE = 2_000_000;
const MAX_BITRATE = 80_000_000;

export function exportFrameTimes(clips: Clip[], fps: number): Ms[] {
  const total = outputDuration(clips);
  const count = Math.max(1, Math.ceil((total * fps) / 1000 - 1e-9));
  return Array.from({ length: count }, (_, i) => outToSrc(clips, (i * 1000) / fps));
}

export interface AudioSegment { srcStartMs: Ms; srcEndMs: Ms; outDurationMs: Ms; speed: number; gain: number }

/** Sped-up stretches keep their sound (time-stretched, pitch kept) but sit a little lower in the mix. */
export const SPED_UP_GAIN = 0.6;
/** Short fades at every segment edge so cuts don't click. */
export const AUDIO_FADE_MS = 12;

export function planAudio(clips: Clip[]): AudioSegment[] {
  return clips.map((c) => ({
    srcStartMs: c.srcStart,
    srcEndMs: c.srcEnd,
    outDurationMs: (c.srcEnd - c.srcStart) / c.speed,
    speed: c.speed,
    gain: c.speed === 1 ? 1 : SPED_UP_GAIN,
  }));
}

/** How long the picture dissolves across a cut. */
export const DISSOLVE_MS = 240;

/**
 * Dissolve state at an output time: the cut it follows and how far through (0..1) the dissolve is,
 * or null when no dissolve is running.
 */
export function dissolveAt(cuts: Ms[], outT: Ms, ms = DISSOLVE_MS): { cut: Ms; k: number } | null {
  for (let i = cuts.length - 1; i >= 0; i--) {
    const d = outT - cuts[i];
    if (d >= 0) return d < ms ? { cut: cuts[i], k: d / ms } : null;
  }
  return null;
}

export function bitrateFor(size: Size, fps: number): number {
  const scaled = BASE_BITRATE * ((size.w * size.h) / (1920 * 1080)) * (fps / 30);
  return Math.round(Math.min(MAX_BITRATE, Math.max(MIN_BITRATE, scaled)));
}

export function estimateBytes(project: Project, hasAudio: boolean): number {
  const seconds = outputDuration(project.clips) / 1000;
  const bps = bitrateFor(outputSize(project.output), project.output.fps) + (hasAudio ? AUDIO_BITRATE : 0);
  return Math.round((bps * seconds) / 8);
}

export function formatBytes(n: number): string {
  const mb = n / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

export function exportFileName(name: string): string {
  const safe = name
    .replace(/(\d):(\d)/g, '$1.$2')
    .replace(/\s*[\\/:*?"<>|]+\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${safe || 'Buffer Clip export'}.mp4`;
}

export type ExportErrorCode = 'decode' | 'codec' | 'cancelled' | 'failed';

export function exportErrorMessage(code: ExportErrorCode): string {
  switch (code) {
    case 'codec':
      return "This browser can't encode video at this size. Try 1080p.";
    case 'decode':
      return "This recording couldn't be decoded.";
    case 'cancelled':
      return 'Export cancelled.';
    default:
      return 'Export failed. Try again.';
  }
}
