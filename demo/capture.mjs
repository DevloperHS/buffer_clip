// Step 1 of the demo pipeline: drive the real Buffer Clip app and capture it.
//
// - Seeds a small project library (generated with the app's own demo recorder).
// - Hands the hero recording to the editor through the real Chrome extension, so the editor
//   opens it exactly like a fresh recording (magic-open intro included).
// - Screencasts every frame at 2x density and logs the scripted mouse path, clicks and scene marks.
//
// Needs the web app on http://localhost:3000 (`pnpm dev`) and a built extension
// (`pnpm --filter @buffer-clip/extension build`).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const APP = process.env.APP_ORIGIN ?? 'http://localhost:3000';
const OUT = fileURLToPath(new URL(`./build/${process.env.CAPTURE_NAME ?? 'capture'}/`, import.meta.url));
const EXT = fileURLToPath(new URL('../apps/extension/dist', import.meta.url));
const VIEW = { width: 1600, height: 900 };
const DPR = Number(process.env.DPR ?? 2);
const QUALITY = Number(process.env.QUALITY ?? 92);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}frames`, { recursive: true });

const now = () => Date.now() / 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = { view: VIEW, dpr: DPR, frames: [], mouse: [], clicks: [], marks: {} };
const mark = (name) => {
  log.marks[name] = now();
  console.log('mark', name);
};

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  viewport: VIEW,
  deviceScaleFactor: DPR,
  colorScheme: 'light',
  acceptDownloads: true,
  // The flag (not just deviceScaleFactor) makes the screencast deliver true 2x frames.
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--force-device-scale-factor=${DPR}`, `--window-size=${VIEW.width},${VIEW.height}`],
});
// Hide the Next.js dev badge; the app should look like it does in production.
const hideDevBadge = () => page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
const page = context.pages()[0] ?? (await context.newPage());

// ---------- Setup (not filmed) ----------

/** Generate a demo recording with the app's own recorder and return its id. */
async function generate(name) {
  await page.goto(`${APP}/`);
  await page.getByRole('button', { name: 'How to use' }).last().click();
  await page.getByRole('link', { name: 'Open How to use Buffer Clip' }).waitFor({ timeout: 60_000 });
  return page.evaluate(async (newName) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('buffer-clip');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const tx = db.transaction('recordings', 'readwrite');
    const store = tx.objectStore('recordings');
    const all = await new Promise((res) => (store.getAll().onsuccess = (e) => res(e.target.result)));
    const rec = all.find((r) => r.name === 'How to use Buffer Clip');
    rec.name = newName;
    delete rec.tutorial;
    store.put(rec);
    await new Promise((res) => (tx.oncomplete = res));
    db.close();
    return rec.id;
  }, name);
}

await generate('Pricing page tour');
await generate('Checkout redesign');
const heroId = await generate('Northwind onboarding');

// Move the hero recording out of the library and into the extension's hand-off queue.
const hero = await page.evaluate(async (id) => {
  const db = await new Promise((res) => (indexedDB.open('buffer-clip').onsuccess = (e) => res(e.target.result)));
  const get = (s) => new Promise((res) => (db.transaction(s).objectStore(s).get(id).onsuccess = (e) => res(e.target.result)));
  const recording = await get('recordings');
  const video = await get('videos');
  const tx = db.transaction(['recordings', 'videos', 'thumbs', 'projects'], 'readwrite');
  for (const s of ['recordings', 'videos', 'thumbs', 'projects']) tx.objectStore(s).delete(id);
  await new Promise((res) => (tx.oncomplete = res));
  db.close();
  const bytes = new Uint8Array(await video.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { recording, video: btoa(bin), type: video.type };
}, heroId);
writeFileSync(`${OUT}raw.webm`, Buffer.from(hero.video, 'base64'));
await sw.evaluate(
  ({ recording, video, type }) =>
    new Promise((resolve, reject) => {
      const bin = atob(video);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const req = indexedDB.open('buffer-clip-ext', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('pending', { keyPath: 'id' });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const tx = req.result.transaction('pending', 'readwrite');
        tx.objectStore('pending').put({ id: recording.id, recording, video: new Blob([bytes], { type }) });
        tx.oncomplete = () => {
          req.result.close();
          resolve();
        };
      };
    }),
  hero,
);

// ---------- Mouse ----------

let pos = { x: VIEW.width + 40, y: VIEW.height * 0.62 };
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

/** Glide to (x, y) on a gentle arc, logging every step for the compositor's cursor. */
async function moveTo(x, y, ms = 650) {
  const from = { ...pos };
  const dx = x - from.x;
  const dy = y - from.y;
  const bend = Math.min(60, Math.hypot(dx, dy) * 0.12);
  const t0 = performance.now();
  for (;;) {
    const k = Math.min(1, (performance.now() - t0) / ms);
    const e = ease(k);
    const arc = Math.sin(Math.PI * e) * bend;
    const len = Math.hypot(dx, dy) || 1;
    pos = { x: from.x + dx * e - (dy / len) * arc, y: from.y + dy * e + (dx / len) * arc };
    await page.mouse.move(pos.x, pos.y);
    log.mouse.push({ t: now(), x: pos.x, y: pos.y });
    if (k >= 1) break;
    await sleep(8);
  }
}
async function click() {
  log.clicks.push({ t: now(), x: pos.x, y: pos.y });
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
}
async function drag(x, y, ms = 700) {
  log.clicks.push({ t: now(), x: pos.x, y: pos.y, drag: true });
  await page.mouse.down();
  await moveTo(x, y, ms);
  await sleep(60);
  await page.mouse.up();
}
const center = async (loc, fx = 0.5, fy = 0.5) => {
  const b = await loc.boundingBox();
  return { x: b.x + b.width * fx, y: b.y + b.height * fy };
};
async function clickOn(loc, ms, fx, fy) {
  const p = await center(loc, fx, fy);
  await moveTo(p.x, p.y, ms);
  await sleep(90);
  await click();
}
/** Keep logging a still cursor so the compositor always has a recent position. */
async function hold(ms) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    log.mouse.push({ t: now(), x: pos.x, y: pos.y });
    await sleep(50);
  }
}

// ---------- Screencast ----------

const cdp = await context.newCDPSession(page);
let n = 0;
cdp.on('Page.screencastFrame', async (f) => {
  const i = ++n;
  const file = `${String(i).padStart(6, '0')}.jpg`;
  writeFileSync(`${OUT}frames/${file}`, Buffer.from(f.data, 'base64'));
  log.frames.push({ t: f.metadata.timestamp, file });
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});

// ---------- Filmed script ----------

await page.goto(`${APP}/`);
await hideDevBadge();
await page.getByRole('link', { name: 'Open Northwind onboarding' }).waitFor({ state: 'detached' }).catch(() => {});
await page.getByRole('link', { name: 'Open Checkout redesign' }).waitFor();
await sleep(600);
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: QUALITY, maxWidth: VIEW.width * DPR, maxHeight: VIEW.height * DPR, everyNthFrame: 1 });
await sleep(300);

// Projects: browse the library, hover a card so its preview plays.
mark('projects');
await moveTo(VIEW.width * 0.62, VIEW.height * 0.55, 900);
const card = page.getByRole('link', { name: 'Open Checkout redesign' });
const cp = await center(card, 0.5, 0.4);
await moveTo(cp.x, cp.y, 800);
await hold(1600);
mark('projects-end');

// Editor: the recording arrives from the extension and magic-opens.
await page.goto(`${APP}/editor/${heroId}`);
const canvas = page.getByTestId('preview-canvas');
await canvas.waitFor();
await hideDevBadge();
mark('editor');
await page.waitForFunction(() => document.querySelector('[data-testid=preview-canvas]')?.dataset.ready === 'true');
mark('intro');
await moveTo(VIEW.width * 0.42, VIEW.height * 0.82, 900);
await hold(1200);
await page.locator('[data-testid="clip-frames"]').first().waitFor({ timeout: 30_000 });
await hold(600);

// Playback: auto zooms on clicks, smooth cursor.
mark('play');
await page.keyboard.press('Space');
await hold(5200);
await page.keyboard.press('Space');
mark('play-end');

// Timeline: frames, idle trimmed, trim a clip edge.
const clip2 = page.getByTestId('clip-block').nth(1);
mark('trim');
const e = await center(clip2, 0, 0.5);
await moveTo(e.x + 4, e.y, 800);
await hold(350);
await drag(e.x + 70, e.y, 750);
await hold(500);
mark('trim-end');

// Split at the playhead.
const ruler = page.locator('[data-tour="ruler"]');
mark('split');
await clickOn(ruler, 600, 0.3, 0.5);
await hold(250);
await page.keyboard.press('s');
await hold(800);
mark('split-end');

// Draw a zoom area on the preview.
mark('zoom');
await clickOn(page.getByTestId('zoom-block').last(), 700);
await hold(300);
await clickOn(page.getByRole('button', { name: 'Draw zoom area' }), 700);
await hold(500);
const cb = await canvas.boundingBox();
await moveTo(cb.x + cb.width * 0.2, cb.y + cb.height * 0.22, 700);
await hold(150);
await drag(cb.x + cb.width * 0.62, cb.y + cb.height * 0.52, 1000);
await hold(1300);
mark('zoom-end');

// Backgrounds: park the playhead where no zoom is active so the whole styled frame shows.
await clickOn(ruler, 600, 0.015, 0.5);
await hold(500);
mark('bg');
const style = page.getByRole('radiogroup', { name: 'Background style' });
await clickOn(style.getByRole('radio', { name: 'Abstract' }), 750);
await hold(450);
for (const name of ['Aurora', 'Sunset', 'Lagoon', 'Lilac']) {
  await clickOn(page.getByRole('button', { name, exact: true }), 380);
  await hold(520);
}
await clickOn(page.getByRole('slider', { name: 'Padding' }), 500);
await hold(150);
const pad = await center(page.getByRole('slider', { name: 'Padding' }), 0.5);
await drag(pad.x + 45, pad.y, 600);
await hold(500);
mark('bg-end');

// Aspect ratios.
mark('aspect');
const aspect = page.getByRole('radiogroup', { name: 'Aspect ratio' });
for (const a of ['9:16', '1:1', '16:9']) {
  await clickOn(aspect.getByRole('radio', { name: a }), 520);
  await hold(950);
}
mark('aspect-end');

// Export in 4K at 60fps.
mark('export');
await clickOn(page.getByRole('button', { name: 'Export', exact: true }), 700);
await hold(400);
const sheet = page.getByRole('dialog', { name: 'Export' });
await clickOn(sheet.getByRole('radio', { name: '4K' }), 500);
await hold(250);
await clickOn(sheet.getByRole('radio', { name: '60 fps' }), 450);
await hold(300);
await clickOn(sheet.getByRole('button', { name: 'Export MP4' }), 550);
mark('export-start');
await moveTo(pos.x - 60, pos.y + 50, 700);
await sheet.getByText(/^Saved /).waitFor({ timeout: 300_000 });
mark('export-done');
await hold(1500);
mark('end');

await cdp.send('Page.stopScreencast');
await sleep(300);
writeFileSync(`${OUT}capture.json`, JSON.stringify(log));
console.log(`captured ${log.frames.length} frames, ${log.mouse.length} mouse samples`);
await context.close();
