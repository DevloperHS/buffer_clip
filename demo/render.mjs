// Step 2 of the demo pipeline: compose the captured footage into the final video.
//
//   node demo/render.mjs                       # full render -> demo/buffer-clip-first-peek.mp4
//   node demo/render.mjs --stills 3.5,12,25    # just write PNG stills at those seconds (for review)
//
// Env: CAPTURE_NAME (default "capture"), the folder under demo/build written by capture.mjs.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const DIR = fileURLToPath(new URL('.', import.meta.url));
const BUILD = join(DIR, 'build');
const CAP = process.env.CAPTURE_NAME ?? 'capture';
const OUT = join(DIR, 'buffer-clip-first-peek.mp4');
const stillsArg = process.argv.indexOf('--stills');
const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;

const capture = JSON.parse(readFileSync(join(BUILD, CAP, 'capture.json'), 'utf8'));

// Raw session frames for the "recording" scene.
const REC_FPS = 30;
const recDir = join(BUILD, 'rec');
if (!existsSync(join(recDir, '00001.jpg'))) {
  mkdirSync(recDir, { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(BUILD, CAP, 'raw.webm'), '-vf', `fps=${REC_FPS}`, '-q:v', '2', join(recDir, '%05d.jpg')]);
}
const rec = { fps: REC_FPS, count: readdirSync(recDir).filter((f) => f.endsWith('.jpg')).length };

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.json': 'application/json' };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.route('http://demo.local/**', (route) => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
  const file = join(DIR, path);
  if (!existsSync(file)) return route.fulfill({ status: 404 });
  return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: readFileSync(file) });
});
await page.goto('http://demo.local/compose.html');
await page.waitForFunction(() => typeof window.renderFrame === 'function');
const { frames } = await page.evaluate(([c, r, d]) => window.setup(c, r, d), [capture, rec, `build/${CAP}`]);

if (stills) {
  const dir = join(BUILD, 'stills');
  mkdirSync(dir, { recursive: true });
  // The camera is smoothed frame to frame, so walk up to each still from a little before it.
  for (const s of stills) {
    const target = Math.round(s * 60);
    for (let i = Math.max(0, target - 90); i <= target; i++) {
      const b64 = await page.evaluate((n) => window.renderFrame(n), i);
      if (i === target) writeFileSync(join(dir, `still-${String(s).replace('.', '_')}s.jpg`), Buffer.from(b64, 'base64'));
    }
    console.log('still', s);
  }
  await browser.close();
  process.exit(0);
}

// Soundtrack.
const wav = await page.evaluate(async () => {
  const { renderMusic } = await import('./music.js');
  return renderMusic(window.clickTimes());
});
const wavPath = join(BUILD, 'music.wav');
writeFileSync(wavPath, Buffer.from(wav, 'base64'));
console.log('music written');

// Video: frames piped straight into ffmpeg, muxed with the music.
rmSync(OUT, { force: true });
const ff = spawn('ffmpeg', [
  '-v', 'error', '-y',
  '-f', 'image2pipe', '-framerate', '60', '-c:v', 'mjpeg', '-i', '-',
  '-i', wavPath,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
  '-shortest', '-movflags', '+faststart',
  OUT,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`)))));

const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  const b64 = await page.evaluate((n) => window.renderFrame(n), i);
  if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 120 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await done;
await browser.close();
console.log('wrote', OUT);
