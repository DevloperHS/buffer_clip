/**
 * Shorten audio by `speed` while keeping its pitch (overlap-add with Hann windows), so sped-up
 * idle stretches keep their sound instead of going silent or turning into chipmunks.
 */
export function timeStretch(input: Float32Array, speed: number, sampleRate: number): Float32Array {
  const outLen = Math.max(0, Math.round(input.length / speed));
  if (speed === 1) return input.slice(0, outLen);
  const out = new Float32Array(outLen);
  const norm = new Float32Array(outLen);
  const frame = Math.max(16, Math.round(sampleRate * 0.04));
  const hopOut = Math.floor(frame / 2);
  const hopIn = hopOut * speed;
  const win = Float32Array.from({ length: frame }, (_, j) => 0.5 - 0.5 * Math.cos((2 * Math.PI * j) / (frame - 1)));
  for (let k = 0; ; k++) {
    const outPos = k * hopOut;
    if (outPos >= outLen) break;
    const inPos = Math.round(k * hopIn);
    for (let j = 0; j < frame; j++) {
      const o = outPos + j;
      const s = inPos + j;
      if (o >= outLen) break;
      if (s >= input.length) break;
      out[o] += input[s] * win[j];
      norm[o] += win[j];
    }
  }
  for (let i = 0; i < outLen; i++) if (norm[i] > 1e-3) out[i] /= norm[i];
  return out;
}

/** Linear fade-in and fade-out over `samples` at both ends, in place, so cuts don't click. */
export function fadeEdges(data: Float32Array, samples: number): void {
  const n = Math.min(samples, Math.floor(data.length / 2));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    data[i] *= g;
    data[data.length - 1 - i] *= g;
  }
}
