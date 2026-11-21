import { chromium, expect, test } from '@playwright/test';
import { ALL_FORMATS, BufferSource, Input } from 'mediabunny';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const extensionPath = fileURLToPath(new URL('../../extension/dist', import.meta.url));
const fixture = fileURLToPath(new URL('./fixtures/motion-and-sound.webm', import.meta.url));

test.skip(!existsSync(`${extensionPath}/manifest.json`), 'Build the extension first: pnpm --filter @buffer-clip/extension build');

/**
 * A recording like an animated website watched without touching the mouse: still 0-3s, moving
 * 3-10s, still 10-12.2s, moving 12.2-16s, still to 20s, a tone throughout, and clicks only at the
 * very start and end. Moving footage must survive idle detection, and the export must keep sound.
 */
test('moving footage is kept and the export keeps its sound', async () => {
  test.setTimeout(240_000);
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  try {
    const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const recording = {
      id: `quality-${Date.now()}`, createdAt: Date.now(), name: 'Animated site', durationMs: 20000,
      viewport: { w: 640, h: 360, dpr: 1 }, crop: null, hasAudio: true,
      events: [
        { type: 'click', t: 500, x: 320, y: 180, button: 0 },
        { type: 'click', t: 19500, x: 320, y: 180, button: 0 },
      ],
    };
    const video = (await readFile(fixture)).toString('base64');
    await sw.evaluate(
      ({ rec, b64 }) =>
        new Promise<void>((resolve, reject) => {
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const req = indexedDB.open('buffer-clip-ext', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('pending', { keyPath: 'id' });
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const tx = req.result.transaction('pending', 'readwrite');
            tx.objectStore('pending').put({ id: rec.id, recording: rec, video: new Blob([bytes], { type: 'video/webm' }) });
            tx.oncomplete = () => {
              req.result.close();
              resolve();
            };
          };
        }),
      { rec: recording, b64: video },
    );

    const page = await context.newPage();
    await page.goto(`http://localhost:3000/editor/${recording.id}`);
    await expect(page.getByTestId('preview-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });

    // Before motion-aware idle detection, everything between the two clicks was cut (output ~1.7s).
    await expect(page.getByTestId('timecode')).toHaveText(/\/ 0:1[3-9]\./, { timeout: 15_000 });
    // The preview plays sound, with a mute toggle.
    await expect(page.getByRole('button', { name: 'Mute preview' })).toBeVisible();
    expect(await page.locator('video').evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Export' });
    const downloadPromise = page.waitForEvent('download', { timeout: 200_000 });
    await sheet.getByRole('button', { name: 'Export MP4' }).click();
    const bytes = await readFile(await (await downloadPromise).path());

    const input = new Input({ formats: ALL_FORMATS, source: new BufferSource(bytes) });
    expect(await input.computeDuration()).toBeGreaterThan(13);
    const audio = await input.getPrimaryAudioTrack();
    expect(audio).not.toBeNull();
  } finally {
    await context.close();
  }
});
