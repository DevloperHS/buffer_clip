import { chromium, expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const extensionPath = fileURLToPath(new URL('../../extension/dist', import.meta.url));

test.skip(!existsSync(`${extensionPath}/manifest.json`), 'Build the extension first: pnpm --filter @buffer-clip/extension build');

test('the editor receives a recording from the extension and the extension forgets it', async () => {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  try {
    const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const recording = {
      id: 'bridge-e2e', createdAt: Date.now(), name: 'Bridge test', durationMs: 3000,
      viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false,
      events: [{ type: 'click', t: 1000, x: 200, y: 200, button: 0 }],
    };
    const countPending = () =>
      sw.evaluate(
        () =>
          new Promise<number>((resolve, reject) => {
            const req = indexedDB.open('buffer-clip-ext', 1);
            req.onupgradeneeded = () => req.result.createObjectStore('pending', { keyPath: 'id' });
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
              const c = req.result.transaction('pending').objectStore('pending').count();
              c.onsuccess = () => {
                resolve(c.result);
                req.result.close();
              };
            };
          }),
      );
    await countPending(); // creates the store if needed
    await sw.evaluate(
      (rec) =>
        new Promise<void>((resolve, reject) => {
          const req = indexedDB.open('buffer-clip-ext', 1);
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const tx = req.result.transaction('pending', 'readwrite');
            tx.objectStore('pending').put({ id: rec.id, recording: rec, video: new Blob(['not a real video'], { type: 'video/webm' }) });
            tx.oncomplete = () => {
              req.result.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
      recording,
    );
    expect(await countPending()).toBe(1);

    const page = await context.newPage();
    await page.goto(`http://localhost:3000/editor/${recording.id}`);
    await expect(page.getByText('Bridge test')).toBeVisible({ timeout: 20_000 });
    await expect.poll(countPending, { timeout: 10_000 }).toBe(0);
  } finally {
    await context.close();
  }
});
