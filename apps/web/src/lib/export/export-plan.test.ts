import { createInitialProject, type Clip, type Recording } from '@buffer-clip/core';
import { describe, expect, it } from 'vitest';
import {
  bitrateFor, estimateBytes, exportErrorMessage, exportFileName, exportFrameTimes, formatBytes, planAudio, SPED_UP_GAIN, dissolveAt, DISSOLVE_MS,
} from './export-plan';

const clips: Clip[] = [
  { id: 'a', srcStart: 0, srcEnd: 1000, speed: 1 },
  { id: 'b', srcStart: 3000, srcEnd: 4000, speed: 2 },
];

describe('export planning', () => {
  it('maps every output frame to its source time, skipping cuts and honouring speed', () => {
    const t = exportFrameTimes(clips, 10); // 1.5s of output at 10 fps
    expect(t).toHaveLength(15);
    expect(t[0]).toBe(0);
    expect(t[9]).toBe(900);
    expect(t[10]).toBe(3000);
    expect(t[14]).toBe(3800);
    expect(exportFrameTimes([], 30)).toEqual([0]);
  });
  it('plans audio: every clip keeps its sound, sped-up ones stretched and a little quieter', () => {
    expect(planAudio(clips)).toEqual([
      { srcStartMs: 0, srcEndMs: 1000, outDurationMs: 1000, speed: 1, gain: 1 },
      { srcStartMs: 3000, srcEndMs: 4000, outDurationMs: 500, speed: 2, gain: SPED_UP_GAIN },
    ]);
  });
  it('scales bitrate with pixels and frame rate within limits', () => {
    expect(bitrateFor({ w: 1920, h: 1080 }, 30)).toBe(12_000_000);
    expect(bitrateFor({ w: 1920, h: 1080 }, 60)).toBe(24_000_000);
    expect(bitrateFor({ w: 3840, h: 2160 }, 30)).toBe(48_000_000);
    expect(bitrateFor({ w: 3840, h: 2160 }, 60)).toBe(80_000_000);
    expect(bitrateFor({ w: 320, h: 180 }, 30)).toBe(2_000_000);
  });
  it('estimates and formats file size', () => {
    const rec = { id: 'r', durationMs: 10_000, events: [] } as unknown as Recording;
    const p = { ...createInitialProject(rec), clips: [{ id: 'c', srcStart: 0, srcEnd: 8000, speed: 1 }], output: { aspect: '16:9' as const, height: 1080 as const, fps: 30 as const } };
    expect(estimateBytes(p, false)).toBe(12_000_000);
    expect(estimateBytes(p, true)).toBe(12_192_000);
    expect(formatBytes(512_000)).toBe('500 KB');
    expect(formatBytes(4_404_019)).toBe('4.2 MB');
    expect(formatBytes(12_000_000)).toBe('11 MB');
  });
  it('builds safe, readable file names', () => {
    expect(exportFileName('Recording Nov 11 at 3:04 PM')).toBe('Recording Nov 11 at 3.04 PM.mp4');
    expect(exportFileName('Demo: New project flow')).toBe('Demo - New project flow.mp4');
    expect(exportFileName('a/b')).toBe('a - b.mp4');
    expect(exportFileName('   ')).toBe('Buffer Clip export.mp4');
  });
  it('explains errors in plain words', () => {
    expect(exportErrorMessage('codec')).toBe("This browser can't encode video at this size. Try 1080p.");
    expect(exportErrorMessage('decode')).toBe("This recording couldn't be decoded.");
    expect(exportErrorMessage('failed')).toBe('Export failed. Try again.');
  });
  it('dissolves for a short moment after each cut', () => {
    expect(dissolveAt([1000, 5000], 900)).toBeNull();
    expect(dissolveAt([1000, 5000], 1000)).toEqual({ cut: 1000, k: 0 });
    expect(dissolveAt([1000, 5000], 1000 + DISSOLVE_MS / 2)).toEqual({ cut: 1000, k: 0.5 });
    expect(dissolveAt([1000, 5000], 1000 + DISSOLVE_MS)).toBeNull();
  });
});
