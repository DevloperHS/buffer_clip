function until(video: HTMLVideoElement, events: string[], done: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (done()) return resolve();
    const check = () => {
      if (!done()) return;
      events.forEach((e) => video.removeEventListener(e, check));
      resolve();
    };
    events.forEach((e) => video.addEventListener(e, check));
  });
}

/**
 * MediaRecorder WebM files report duration = Infinity and seek poorly until the
 * browser has scanned to the end. Seeking far past the end forces that scan.
 */
export async function prepareVideo(video: HTMLVideoElement): Promise<void> {
  await until(video, ['loadedmetadata'], () => video.readyState >= 1);
  if (!Number.isFinite(video.duration)) {
    video.currentTime = 1e101;
    await until(video, ['durationchange', 'timeupdate'], () => Number.isFinite(video.duration));
    video.currentTime = 0;
    await until(video, ['seeked'], () => !video.seeking && video.readyState >= 2);
  }
  await until(video, ['loadeddata', 'seeked'], () => video.readyState >= 2);
}
