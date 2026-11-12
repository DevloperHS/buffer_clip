// Compositor: renders each output frame of the demo onto a 1920x1080 canvas.
// Runs in Chromium (driven by render.mjs). Source footage comes from capture.mjs.
import { CAPTIONS, FPS, SCENES, SIZE } from './storyboard.js';

const { w: W, h: H } = SIZE;
const canvas = document.getElementById('c');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingQuality = 'high';

const INK = '#111111';
const FONT = '"Inter", "SF Pro Display", system-ui, sans-serif';

let cap; // capture.json
let rec; // { fps, count } of the raw recording frames
let capDir = 'build/capture';
const marks = () => cap.marks;

// ---------- math ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - (1 - k) ** 3;
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const backOut = (k) => {
  const c = 1.35;
  return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
};
const prog = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

function lastAtOrBefore(arr, t) {
  let lo = 0;
  let hi = arr.length - 1;
  if (t <= arr[0].t) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (arr[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// ---------- timeline ----------
const sceneAt = (t) => SCENES.find((s) => t >= s.t0 && t < s.t1) ?? SCENES[SCENES.length - 1];

/** Wall-clock capture time shown at output time t within an app scene. */
function srcTime(s, t) {
  const start = marks()[s.src] + (s.at ?? 0);
  if (s.until) {
    const end = marks()[s.until];
    return lerp(start, end, easeInOut(prog(t, s.t0, s.t1)));
  }
  return start + (t - s.t0) * (s.speed ?? 1);
}

// ---------- image cache ----------
const cache = new Map();
async function image(url) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url)
    .then((r) => r.blob())
    .then((b) => createImageBitmap(b));
  cache.set(url, p);
  if (cache.size > 12) {
    const first = cache.keys().next().value;
    cache.get(first).then((bm) => bm.close?.());
    cache.delete(first);
  }
  return p;
}
const appFrame = (srcT) => image(`${capDir}/frames/${cap.frames[lastAtOrBefore(cap.frames, srcT)].file}`);
const recFrame = (sec) => image(`build/rec/${String(clamp(Math.floor(sec * rec.fps) + 1, 1, rec.count)).padStart(5, '0')}.jpg`);

// ---------- cursor ----------
function mouseAt(srcT) {
  const m = cap.mouse;
  const i = lastAtOrBefore(m, srcT);
  const a = m[i];
  const b = m[Math.min(i + 1, m.length - 1)];
  const k = b.t > a.t ? clamp((srcT - a.t) / (b.t - a.t), 0, 1) : 0;
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
}
const ARROW = [[0, 0], [0, 16], [4.5, 12], [7.5, 19], [10, 18], [7, 11.5], [12.5, 11.5]];
function drawCursor(x, y, scale, press) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * press, scale * press);
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ARROW.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}

// ---------- camera ----------
// Base window: the 1600x900 app, scaled to float on the background with room for captions.
const S0 = 1.04;
const BASE = { x: (W - 1600 * S0) / 2, y: 34 };
const cam = { fx: 800, fy: 450, z: 1, init: false };

function camTarget(s, t, srcT) {
  const c = s.cam ?? { focus: [800, 450], z: 1 };
  const k = prog(t, s.t0, s.t1);
  let z = c.z;
  if (Array.isArray(z)) {
    const pos = k * (z.length - 1);
    const i = Math.min(Math.floor(pos), z.length - 2);
    z = lerp(z[i], z[i + 1], easeInOut(pos - i));
  }
  const f = c.focus === 'cursor' ? mouseAt(srcT) : { x: c.focus[0], y: c.focus[1] };
  return { fx: clamp(f.x, 0, 1600), fy: clamp(f.y, 0, 900), z };
}
function stepCamera(target, dt) {
  if (!cam.init) {
    Object.assign(cam, target, { init: true });
    return;
  }
  const kf = 1 - Math.exp(-dt / 0.22);
  const kz = 1 - Math.exp(-dt / 0.3);
  cam.fx = lerp(cam.fx, target.fx, kf);
  cam.fy = lerp(cam.fy, target.fy, kf);
  cam.z = lerp(cam.z, target.z, kz);
}
/** Screen transform for app coordinates under the current camera. */
function view() {
  const s = S0 * cam.z;
  const anchor = { x: BASE.x + cam.fx * S0, y: BASE.y + cam.fy * S0 };
  const pull = clamp((cam.z - 1) * 0.75, 0, 0.5);
  const c = { x: lerp(anchor.x, W / 2, pull), y: lerp(anchor.y, H * 0.47, pull) };
  return { s, ox: c.x - cam.fx * s, oy: c.y - cam.fy * s };
}

// ---------- drawing helpers ----------
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
const PALETTE = ['#F6F4FB', '#D8CFFF', '#FFD6EA', '#CBE4FF', '#FFFFFF'];
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function background(t) {
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(0, 0, W, H);
  const anchors = [[0.12, 0.18], [0.88, 0.22], [0.72, 0.88], [0.18, 0.82]];
  const turn = t * 0.09;
  const r = 0.62 * W;
  PALETTE.slice(1).forEach((col, i) => {
    const ax = anchors[i][0] - 0.5;
    const ay = anchors[i][1] - 0.5;
    const wob = Math.sin(t * 0.6 + i * 1.7) * 0.04;
    const x = (0.5 + (ax + wob) * Math.cos(turn) - ay * Math.sin(turn)) * W;
    const y = (0.5 + (ax + wob) * Math.sin(turn) + ay * Math.cos(turn)) * H;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(col, 0.95));
    g.addColorStop(0.45, hexA(col, 0.48));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
}
function windowShadow(x, y, w, h, r, alpha = 1) {
  ctx.save();
  ctx.shadowColor = `rgba(20,16,40,${0.22 * alpha})`;
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 24;
  roundRect(x, y, w, h, r);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
}
function logo(x, y, size) {
  roundRect(x, y, size, size, size * 0.28);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.17, 0, Math.PI * 2);
  ctx.fillStyle = '#FBFBFA';
  ctx.fill();
}
function pill(text, cx, cy, { size = 36, alpha = 1, rise = 0, weight = 600, bg = '#fff', fg = INK, padX = 30, padY = 17 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  const w = tw + padX * 2;
  const h = size + padY * 2;
  const x = cx - w / 2;
  const y = cy - h / 2 + rise;
  ctx.shadowColor = 'rgba(17,17,17,0.18)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 10;
  roundRect(x, y, w, h, 16);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(17,17,17,0.06)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, y + h / 2 + 1);
  ctx.restore();
}

// ---------- scenes ----------
/** 0..1: hidden in scenes marked hideCursor, with a short fade at their edges. */
function cursorVisibility(t) {
  const FADE = 0.25;
  let v = 1;
  for (const s of SCENES) {
    if (!s.hideCursor) continue;
    if (t >= s.t0 - FADE && t <= s.t1 + FADE) v = Math.min(v, 1 - Math.min(prog(t, s.t0 - FADE, s.t0), 1 - prog(t, s.t1, s.t1 + FADE)));
  }
  return v;
}
async function drawApp(s, t, dt) {
  const srcT = srcTime(s, t);
  stepCamera(camTarget(s, t, srcT), dt);
  const v = view();
  const img = await appFrame(srcT);
  const x = v.ox;
  const y = v.oy;
  const w = 1600 * v.s;
  const h = 900 * v.s;
  const r = 18 * v.s;

  // Entrance from the hook card, exit into the outro.
  let alpha = 1;
  let lift = 0;
  if (s.id === 'projects') {
    const k = prog(t, 2.75, 3.35);
    alpha = easeOut(k);
    lift = (1 - backOut(k)) * 90;
  }
  if (s.id === 'saved') alpha = 1 - easeInOut(prog(t, 35.25, 35.6));
  if (s.id === 'editor') alpha = easeOut(prog(t, 8.0, 8.18));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, lift);
  windowShadow(x, y, w, h, r, alpha);
  ctx.save();
  roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  // Cursor, with a press dip and ripple on clicks.
  const m = mouseAt(srcT);
  const near = cap.clicks.filter((c) => srcT >= c.t && srcT - c.t < 0.45);
  let press = 1;
  for (const c of near) {
    const k = (srcT - c.t) / 0.45;
    press = Math.min(press, 1 - 0.14 * Math.sin(Math.min(1, k * 2.2) * Math.PI));
    ctx.beginPath();
    ctx.arc(x + c.x * v.s, y + c.y * v.s, (8 + 30 * easeOut(k)) * Math.sqrt(v.s), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(17,17,17,${0.45 * (1 - k)})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  const cursorAlpha = cursorVisibility(t);
  if (cursorAlpha > 0 && m.x >= 0 && m.x <= 1600 && m.y >= 0 && m.y <= 900) {
    ctx.save();
    ctx.globalAlpha *= cursorAlpha;
    drawCursor(x + m.x * v.s, y + m.y * v.s, 1.55 * Math.sqrt(v.s), press);
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

async function drawRecord(s, t) {
  // A browser window playing the raw session, with Buffer Clip's countdown and REC badge.
  const enter = easeOut(prog(t, s.t0, s.t0 + 0.35));
  const exit = easeInOut(prog(t, s.t1 - 0.3, s.t1));
  const scale = lerp(0.94, 1, enter) * lerp(1, 0.97, exit);
  const alpha = enter * (1 - exit);
  const bw = 1600 * S0 * scale;
  const bh = 900 * S0 * scale;
  const x = (W - bw) / 2;
  const y = BASE.y + (900 * S0 - bh) / 2;
  const bar = 54 * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  windowShadow(x, y, bw, bh, 18, alpha);
  ctx.save();
  roundRect(x, y, bw, bh, 18);
  ctx.clip();
  ctx.fillStyle = '#F2F2F0';
  ctx.fillRect(x, y, bw, bar);
  ctx.fillStyle = '#E6E6E3';
  ctx.fillRect(x, y + bar - 1, bw, 1);
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(x + 26 * scale + i * 22 * scale, y + bar / 2, 6.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });
  roundRect(x + bw * 0.3, y + 12 * scale, bw * 0.4, bar - 24 * scale, 9 * scale);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.font = `500 ${15 * scale}px ${FONT}`;
  ctx.fillStyle = '#6B6B68';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('app.northwind.io/projects', x + bw / 2, y + bar / 2 + 1);

  const recT = Math.max(0, (t - s.t0 - 0.75) * s.speed);
  const img = await recFrame(recT);
  const ch = bh - bar;
  const cw = ch * (16 / 9);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y + bar, bw, ch);
  ctx.drawImage(img, x + (bw - cw) / 2, y + bar, cw, ch);

  // Extension icon with live badge timer.
  const ix = x + bw - 56 * scale;
  logo(ix, y + 13 * scale, 28 * scale);
  if (t > s.t0 + 0.75) {
    const sec = Math.floor(recT);
    pill(`● REC  0:${String(sec).padStart(2, '0')}`, ix - 70 * scale, y + bar / 2, {
      size: 14 * scale, padX: 12 * scale, padY: 5 * scale, bg: '#FF3B30', fg: '#fff', weight: 600,
    });
  }
  // Countdown: 3 · 2 · 1.
  if (t < s.t0 + 0.75) {
    const k = (t - s.t0) / 0.25;
    const n = 3 - Math.floor(k);
    const f = k % 1;
    ctx.fillStyle = `rgba(17,17,17,${0.35 * (1 - exit)})`;
    ctx.fillRect(x, y + bar, bw, ch);
    ctx.globalAlpha = alpha * (1 - f * 0.6);
    ctx.beginPath();
    ctx.arc(W / 2, y + bar + ch / 2, 92 * (1.08 - f * 0.12), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `700 ${96 * (1.08 - f * 0.12)}px ${FONT}`;
    ctx.fillText(String(n), W / 2, y + bar + ch / 2 + 4);
  }
  ctx.restore();
  ctx.restore();
}

function drawHook(t) {
  const out = easeInOut(prog(t, 2.55, 3.0));
  ctx.save();
  ctx.globalAlpha = 1 - out;
  const cy = H / 2 - 30 - out * 40;
  // Badge
  const b = easeOut(prog(t, 0.1, 0.6));
  pill('Buffer Clip  ·  first peek', W / 2, cy - 150, { size: 24, alpha: b, rise: (1 - b) * 16, weight: 500, padX: 22, padY: 11 });
  // Headline, word by word.
  const lines = [['Screen', 'recordings', '→'], ['polished', 'demos.']];
  ctx.font = `650 ${92}px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let i = 0;
  lines.forEach((words, li) => {
    const widths = words.map((wd) => ctx.measureText(wd).width);
    const total = widths.reduce((a, c) => a + c, 0) + (words.length - 1) * 26;
    let x = W / 2 - total / 2;
    const y = cy + li * 108;
    words.forEach((wd, wi) => {
      const k = easeOut(prog(t, 0.35 + i * 0.12, 0.85 + i * 0.12));
      ctx.save();
      ctx.globalAlpha = (1 - out) * k;
      ctx.fillStyle = wd === '→' ? '#8A84B8' : INK;
      ctx.fillText(wd, x, y + (1 - k) * 34);
      ctx.restore();
      x += widths[wi] + 26;
      i++;
    });
  });
  const sub = easeOut(prog(t, 1.2, 1.7));
  ctx.globalAlpha = (1 - out) * sub;
  ctx.font = `450 ${30}px ${FONT}`;
  ctx.fillStyle = '#5E5C6A';
  ctx.textAlign = 'center';
  ctx.fillText('Record once. Get a product demo with zooms, cuts and style.', W / 2, cy + 230 + (1 - sub) * 12);
  ctx.restore();
}

function drawOutro(t) {
  const s0 = 35.6;
  const k = easeOut(prog(t, s0 + 0.05, s0 + 0.65));
  const cy = H / 2 - 40;
  ctx.save();
  ctx.globalAlpha = k;
  const size = 104 * lerp(0.8, 1, backOut(k));
  logo(W / 2 - size / 2, cy - 150 - size / 2, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.font = `650 ${84}px ${FONT}`;
  ctx.fillText('Buffer Clip', W / 2, cy + 6 + (1 - k) * 24);
  const k2 = easeOut(prog(t, s0 + 0.45, s0 + 1.0));
  ctx.globalAlpha = k2;
  ctx.font = `500 ${36}px ${FONT}`;
  ctx.fillStyle = '#5E5C6A';
  ctx.fillText('Record. Polish. Share.', W / 2, cy + 90 + (1 - k2) * 14);
  const k3 = easeOut(prog(t, s0 + 0.9, s0 + 1.5));
  pill('First peek · coming soon', W / 2, cy + 200, { size: 26, alpha: k3, rise: (1 - k3) * 14, weight: 600, bg: INK, fg: '#fff', padX: 24, padY: 13 });
  ctx.restore();
}

function drawCaption(t) {
  const c = CAPTIONS.find((x) => t >= x.t0 - 0.05 && t < x.t1 + 0.3);
  if (!c) return;
  const kin = easeOut(prog(t, c.t0, c.t0 + 0.3));
  const kout = easeInOut(prog(t, c.t1, c.t1 + 0.25));
  pill(c.text, W / 2, H - 70, { size: 38, alpha: kin * (1 - kout), rise: (1 - kin) * 18 + kout * 8 });
}

// ---------- entry points ----------
let lastT = 0;
window.setup = async (capture, recInfo, dir) => {
  cap = capture;
  capDir = dir;
  rec = recInfo;
  cap.frames.sort((a, b) => a.t - b.t);
  cap.mouse.sort((a, b) => a.t - b.t);
  await document.fonts.load(`650 92px ${FONT}`);
  await document.fonts.load(`500 36px ${FONT}`);
  await document.fonts.load(`600 38px ${FONT}`);
  await document.fonts.load(`450 30px ${FONT}`);
  return { frames: Math.round(SCENES[SCENES.length - 1].t1 * FPS) };
};

window.renderFrame = async (i) => {
  const t = i / FPS;
  const dt = t - lastT || 1 / FPS;
  lastT = t;
  const s = sceneAt(t);
  background(t);
  if (s.id === 'hook') {
    drawHook(t);
    // The app window rises in under the fading headline.
    if (t > 2.75) await drawApp(SCENES[1], t, dt);
  } else if (s.kind === 'app') await drawApp(s, t, dt);
  else if (s.kind === 'record') await drawRecord(s, t);
  else if (s.id === 'outro') {
    if (t < 35.6 + 0.35) await drawApp(SCENES.find((x) => x.id === 'saved'), Math.min(t, 35.599), dt);
    drawOutro(t);
  }
  drawCaption(t);
  const url = canvas.toDataURL('image/jpeg', 0.95);
  return url.slice(url.indexOf(',') + 1);
};

/** Output times of on-screen clicks, for the soundtrack's UI ticks. */
window.clickTimes = () => {
  const out = [];
  for (const c of cap.clicks) {
    for (const s of SCENES) {
      if (s.kind !== 'app' || s.until) continue;
      const a = marks()[s.src] + (s.at ?? 0);
      const t = s.t0 + (c.t - a) / (s.speed ?? 1);
      if (t >= s.t0 && t < s.t1) out.push(t);
    }
  }
  return out;
};
