import { describe, expect, it } from 'vitest';
import { prepareVideo } from './video';

class FakeVideo extends EventTarget {
  readyState = 0;
  duration = Number.POSITIVE_INFINITY;
  private t = 0;
  seeks: number[] = [];
  get currentTime() { return this.t; }
  set currentTime(v: number) {
    this.t = v;
    this.seeks.push(v);
    queueMicrotask(() => {
      if (v > 1e100) {
        this.duration = 11;
        this.dispatchEvent(new Event('durationchange'));
      } else {
        this.readyState = 2;
        this.dispatchEvent(new Event('seeked'));
      }
    });
  }
}

describe('prepareVideo', () => {
  it('resolves infinite WebM durations and returns to the start', async () => {
    const v = new FakeVideo();
    const done = prepareVideo(v as unknown as HTMLVideoElement);
    v.readyState = 1;
    v.dispatchEvent(new Event('loadedmetadata'));
    await done;
    expect(v.duration).toBe(11);
    expect(v.seeks).toEqual([1e101, 0]);
  });
  it('does nothing extra when the duration is already known', async () => {
    const v = new FakeVideo();
    v.readyState = 2;
    v.duration = 5;
    await prepareVideo(v as unknown as HTMLVideoElement);
    expect(v.seeks).toEqual([]);
  });
});
