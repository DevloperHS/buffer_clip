// Original soundtrack, synthesised offline with Web Audio: no samples, nothing licensed, nothing to credit.
// Airy 120 BPM house groove in C: Fmaj7 · G(add9) · Em7 · Am7. Intro builds to a drop at 8.0s
// (when the editor opens), full groove to 36s, then a pad tail. UI clicks get soft ticks.
import { BPM, DURATION } from './storyboard.js';

const SR = 44100;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const DROP = 8.0;
const END_GROOVE = 36.0;

const CHORDS = [
  [53, 57, 60, 64], // Fmaj7
  [55, 59, 62, 69], // G add9
  [52, 55, 59, 62], // Em7
  [57, 60, 64, 67], // Am7
];
const ROOTS = [41, 43, 40, 45];
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

function noiseBuffer(ctx, seconds) {
  const b = ctx.createBuffer(1, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
  const d = b.getChannelData(0);
  let seed = 1234567;
  for (let i = 0; i < d.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  return b;
}

function impulse(ctx, seconds, decay) {
  const len = Math.ceil(seconds * ctx.sampleRate);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let seed = 99 + c * 7919;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = ((seed / 0x7fffffff) * 2 - 1) * (1 - i / len) ** decay;
    }
  }
  return b;
}

export async function renderMusic(clickTimes = []) {
  const ctx = new OfflineAudioContext(2, Math.ceil(DURATION * SR), SR);
  const noise = noiseBuffer(ctx, 2);

  // ---- Buses ----
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.2;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(0.9, 0.6);
  master.gain.setValueAtTime(0.9, DURATION - 2.2);
  master.gain.linearRampToValueAtTime(0, DURATION - 0.05);
  master.connect(comp).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 3.2, 3.5);
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.32;
  reverb.connect(reverbOut).connect(master);

  const delay = ctx.createDelay(1);
  delay.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const dlp = ctx.createBiquadFilter();
  dlp.type = 'lowpass';
  dlp.frequency.value = 2400;
  delay.connect(dlp).connect(fb).connect(delay);
  const delayOut = ctx.createGain();
  delayOut.gain.value = 0.35;
  dlp.connect(delayOut).connect(master);

  // Sidechain: pad and bass duck on every kick for the pumping feel.
  const duck = ctx.createGain();
  duck.connect(master);

  const kicks = [];
  for (let t = DROP; t < END_GROOVE + 0.01; t += BEAT) kicks.push(t);
  duck.gain.setValueAtTime(1, 0);
  for (const t of kicks) {
    duck.gain.setValueAtTime(1, t);
    duck.gain.linearRampToValueAtTime(0.42, t + 0.012);
    duck.gain.setTargetAtTime(1, t + 0.04, 0.09);
  }

  const chordAt = (t) => Math.floor(t / BAR) % 4;

  // ---- Pad ----
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.Q.value = 0.6;
  padFilter.frequency.setValueAtTime(380, 0);
  padFilter.frequency.exponentialRampToValueAtTime(2600, DROP - 0.1);
  padFilter.frequency.setValueAtTime(1900, DROP);
  padFilter.frequency.setValueAtTime(1900, END_GROOVE);
  padFilter.frequency.exponentialRampToValueAtTime(700, DURATION);
  const padGain = ctx.createGain();
  padGain.gain.value = 0.11;
  padFilter.connect(padGain);
  padGain.connect(duck);
  const padSend = ctx.createGain();
  padSend.gain.value = 0.6;
  padGain.connect(padSend).connect(reverb);

  for (let bar = 0; bar * BAR < DURATION; bar++) {
    const t = bar * BAR;
    const last = (bar + 1) * BAR >= DURATION;
    const len = last ? DURATION - t : BAR + 0.15;
    for (const m of CHORDS[bar % 4]) {
      for (const det of [-9, 0, 9]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(m);
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.35);
        g.gain.setValueAtTime(0.18, t + len - 0.25);
        g.gain.linearRampToValueAtTime(0, t + len);
        o.connect(g).connect(padFilter);
        o.start(t);
        o.stop(t + len + 0.05);
      }
    }
  }

  // ---- Arp pluck (16ths from 4s; quieter in the intro) ----
  const ARP = [0, 2, 1, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 2];
  const arpBus = ctx.createGain();
  arpBus.gain.value = 0.085;
  arpBus.connect(master);
  arpBus.connect(delay);
  const arpSend = ctx.createGain();
  arpSend.gain.value = 0.5;
  arpBus.connect(arpSend).connect(reverb);
  for (let t = 4.0, i = 0; t < DURATION - 1.2; t += BEAT / 4, i++) {
    const intro = t < DROP;
    const outro = t >= END_GROOVE;
    const chord = CHORDS[chordAt(t)];
    const m = chord[ARP[i % 16]] + 12;
    const vel = (i % 4 === 0 ? 1 : 0.62) * (intro ? 0.55 : outro ? 0.5 : 1);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mtof(m);
    const o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.value = mtof(m) * 1.002;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(4200, t);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o.connect(f);
    o2.connect(g2).connect(f);
    f.connect(g).connect(arpBus);
    o.start(t);
    o2.start(t);
    o.stop(t + 0.25);
    o2.stop(t + 0.25);
  }

  // ---- Bass ----
  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.34;
  bassBus.connect(duck);
  const BASS = [[0, 0.75, 0], [1.5, 0.4, 12], [2, 0.75, 0], [3.5, 0.4, 12]];
  for (let bar = DROP / BAR; bar * BAR < END_GROOVE; bar++) {
    const root = ROOTS[bar % 4];
    for (const [beat, len, oct] of BASS) {
      const t = bar * BAR + beat * BEAT;
      const d = len * BEAT;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = mtof(root + oct);
      const o2 = ctx.createOscillator();
      o2.type = 'sawtooth';
      o2.frequency.value = mtof(root + oct);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 320;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + 0.008);
      g.gain.setValueAtTime(0.85, t + d - 0.04);
      g.gain.linearRampToValueAtTime(0, t + d);
      const g2 = ctx.createGain();
      g2.gain.value = 0.3;
      o.connect(g);
      o2.connect(g2).connect(f).connect(g);
      g.connect(bassBus);
      o.start(t);
      o2.start(t);
      o.stop(t + d + 0.02);
      o2.stop(t + d + 0.02);
    }
  }

  // ---- Drums ----
  const drums = ctx.createGain();
  drums.gain.value = 0.9;
  drums.connect(master);
  const kick = (t, level = 1) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.13);
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g).connect(drums);
    o.start(t);
    o.stop(t + 0.45);
  };
  const noiseHit = (t, { type, freq, q = 0.7, level, decay, send = 0 }) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    s.connect(f).connect(g).connect(drums);
    if (send) {
      const sg = ctx.createGain();
      sg.gain.value = send;
      g.connect(sg).connect(reverb);
    }
    s.start(t, Math.random() * 1.5);
    s.stop(t + decay + 0.02);
  };
  for (const t of kicks) kick(t, 0.95);
  for (let t = DROP; t < END_GROOVE; t += BEAT) {
    const beat = Math.round((t - DROP) / BEAT) % 4;
    if (beat === 1 || beat === 3) {
      for (const off of [0, 0.011, 0.022]) noiseHit(t + off, { type: 'bandpass', freq: 1500, level: 0.32, decay: 0.16, send: 0.5 });
    }
    noiseHit(t + BEAT / 2, { type: 'highpass', freq: 7500, level: 0.16, decay: 0.11 });
    noiseHit(t + BEAT / 4, { type: 'highpass', freq: 9000, level: 0.05, decay: 0.035 });
    noiseHit(t + (3 * BEAT) / 4, { type: 'highpass', freq: 9000, level: 0.07, decay: 0.035 });
  }
  // Intro hats: soft 8ths from 4s to tease the groove.
  for (let t = 4.0; t < DROP; t += BEAT / 2) noiseHit(t, { type: 'highpass', freq: 8500, level: 0.05, decay: 0.04 });

  // ---- Riser into the drop, impact on it, and a last kick to close the groove ----
  {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, DROP - 2.5);
    f.frequency.exponentialRampToValueAtTime(7000, DROP);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, DROP - 2.5);
    g.gain.exponentialRampToValueAtTime(0.16, DROP - 0.02);
    g.gain.linearRampToValueAtTime(0, DROP);
    s.connect(f).connect(g).connect(master);
    s.start(DROP - 2.5);
    s.stop(DROP + 0.05);
  }
  const impact = (t) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 1.35);
    noiseHit(t, { type: 'highpass', freq: 3500, level: 0.22, decay: 1.6, send: 0.8 });
  };
  impact(DROP);
  impact(END_GROOVE);

  // ---- UI ticks on clicks ----
  const ticks = ctx.createGain();
  ticks.gain.value = 0.11;
  ticks.connect(master);
  for (const t of clickTimes) {
    if (t < 0 || t > DURATION - 0.1) continue;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(2300, t);
    o.frequency.exponentialRampToValueAtTime(1200, t + 0.03);
    const g = ctx.createGain();
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(ticks);
    o.start(t);
    o.stop(t + 0.06);
  }

  const buf = await ctx.startRendering();
  return toWav(buf);
}

function toWav(buf) {
  const ch = [buf.getChannelData(0), buf.getChannelData(1)];
  let peak = 0;
  for (const c of ch) for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const n = buf.length;
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  out.setUint32(4, 36 + n * 4, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 2, true);
  out.setUint32(24, SR, true);
  out.setUint32(28, SR * 4, true);
  out.setUint16(32, 4, true);
  out.setUint16(34, 16, true);
  str(36, 'data');
  out.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++) {
    for (const c of ch) {
      const v = Math.max(-1, Math.min(1, c[i] * gain));
      out.setInt16(o, v * 0x7fff, true);
      o += 2;
    }
  }
  const bytes = new Uint8Array(out.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
