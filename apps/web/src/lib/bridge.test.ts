import type { Recording } from '@buffer-clip/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isRecordingShape, requestFromExtension } from './bridge';

const rec: Recording = {
  id: 'r1', createdAt: 1, name: 'Recording Nov 11 at 3:04 PM', durationMs: 4000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false, events: [],
};
const fromExtension = (data: unknown) =>
  window.dispatchEvent(new MessageEvent('message', { data, origin: 'chrome-extension://abcdef' }));

afterEach(() => vi.restoreAllMocks());

describe('isRecordingShape', () => {
  it('accepts recordings and rejects junk', () => {
    expect(isRecordingShape(rec)).toBe(true);
    expect(isRecordingShape({ id: 'x' })).toBe(false);
    expect(isRecordingShape(null)).toBe(false);
  });
});

describe('requestFromExtension', () => {
  it('asks the extension and resolves with the recording', async () => {
    const post = vi.spyOn(window, 'postMessage');
    const pending = requestFromExtension('r1', { timeoutMs: 2000, retryMs: 1000 });
    expect(post).toHaveBeenCalledWith({ source: 'buffer-clip-app', type: 'request', id: 'r1' }, window.location.origin);
    fromExtension({ source: 'buffer-clip-ext', type: 'recording', id: 'r1', recording: rec, video: new Blob(['v']) });
    const got = await pending;
    expect(got?.recording).toEqual(rec);
    expect(got?.video).toBeInstanceOf(Blob);
    expect(typeof got?.ack).toBe('function');
  });
  it('resolves null when the extension reports the recording missing', async () => {
    const pending = requestFromExtension('r1', { timeoutMs: 2000 });
    fromExtension({ source: 'buffer-clip-ext', type: 'missing', id: 'r1' });
    expect(await pending).toBeNull();
  });
  it('ignores messages for other ids or from page origins, then times out', async () => {
    const pending = requestFromExtension('r1', { timeoutMs: 100, retryMs: 1000 });
    fromExtension({ source: 'buffer-clip-ext', type: 'recording', id: 'other', recording: { ...rec, id: 'other' }, video: new Blob() });
    window.dispatchEvent(new MessageEvent('message', {
      data: { source: 'buffer-clip-ext', type: 'recording', id: 'r1', recording: rec, video: new Blob() },
      origin: window.location.origin,
    }));
    expect(await pending).toBeNull();
  });
  it('re-sends the request when the content script announces itself', async () => {
    const post = vi.spyOn(window, 'postMessage');
    const pending = requestFromExtension('r1', { timeoutMs: 100, retryMs: 1000 });
    window.dispatchEvent(new MessageEvent('message', { data: { source: 'buffer-clip-ext', type: 'ready' }, origin: window.location.origin }));
    expect(post.mock.calls.filter(([d]) => (d as { type?: string }).type === 'request')).toHaveLength(2);
    await pending;
  });
});
