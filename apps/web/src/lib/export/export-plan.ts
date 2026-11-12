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

export interface AudioSegment { srcStartMs: Ms; srcEndMs: Ms; outDurationMs: Ms; mute: boolean }

export function planAudio(clips: Clip[]): AudioSegment[] {
  return clips.map((c) => ({
    srcStartMs: c.srcStart,
    srcEndMs: c.srcEnd,
    outDurationMs: (c.srcEnd - c.srcStart) / c.speed,
    mute: c.speed !== 1,
  }));
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
