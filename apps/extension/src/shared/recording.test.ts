import { describe, expect, it } from 'vitest';
import { buildRecording, defaultName } from './recording';

describe('defaultName', () => {
  it('formats a stable, readable name', () => {
    expect(defaultName(new Date(2026, 10, 11, 15, 4))).toBe('Recording Nov 11 at 3:04 PM');
    expect(defaultName(new Date(2026, 0, 2, 0, 30))).toBe('Recording Jan 2 at 12:30 AM');
    expect(defaultName(new Date(2026, 5, 9, 12, 0))).toBe('Recording Jun 9 at 12:00 PM');
  });
});

describe('buildRecording', () => {
  it('assembles a core Recording with relative events and duration', () => {
    const rec = buildRecording({
      id: 'abc',
      createdAt: new Date(2026, 10, 11, 15, 4).getTime(),
      startedAt: 1000,
      stoppedAt: 6000.4,
      viewport: { w: 1280, h: 720, dpr: 2 },
      crop: { x: 10, y: 20, w: 300, h: 200 },
      hasAudio: true,
      events: [{ type: 'click', t: 1500, x: 1, y: 1, button: 0 }],
    });
    expect(rec).toEqual({
      id: 'abc',
      createdAt: new Date(2026, 10, 11, 15, 4).getTime(),
      name: 'Recording Nov 11 at 3:04 PM',
      durationMs: 5000,
      viewport: { w: 1280, h: 720, dpr: 2 },
      crop: { x: 10, y: 20, w: 300, h: 200 },
      hasAudio: true,
      events: [{ type: 'click', t: 500, x: 1, y: 1, button: 0 }],
    });
  });
});
