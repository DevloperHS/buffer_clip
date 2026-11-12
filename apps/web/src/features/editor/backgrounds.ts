import type { Background } from '@buffer-clip/core';

export type BgStyle = Pick<Background, 'kind' | 'value' | 'angle'>;
export interface BgPreset {
  name: string;
  bg: BgStyle;
}

/** Abstract mesh backgrounds: a base colour plus soft colour blobs. */
export const ABSTRACT: ReadonlyArray<BgPreset> = [
  { name: 'Aurora', bg: { kind: 'mesh', value: '#0B1026,#6D5BFF,#00D1FF,#FF5FA2', angle: 135 } },
  { name: 'Sunset', bg: { kind: 'mesh', value: '#FF7A59,#FFB36B,#FF4E8A,#7B4DFF', angle: 200 } },
  { name: 'Peach', bg: { kind: 'mesh', value: '#FFE3D3,#FF9A8B,#FFC3A0,#FF6A88', angle: 135 } },
  { name: 'Lagoon', bg: { kind: 'mesh', value: '#0F3D3E,#1CC8A0,#3BA4FF,#A6FFCB', angle: 60 } },
  { name: 'Lilac', bg: { kind: 'mesh', value: '#EDE7FF,#B39DFF,#FFB6E1,#8EC5FF', angle: 135 } },
  { name: 'Ember', bg: { kind: 'mesh', value: '#1A0B0B,#FF3D00,#FF8A00,#8B0000', angle: 300 } },
  { name: 'Citrus', bg: { kind: 'mesh', value: '#FFF6D6,#FFD23F,#A5E65A,#FF8C42', angle: 135 } },
  { name: 'Ocean', bg: { kind: 'mesh', value: '#04152D,#1446A0,#00B4D8,#90E0EF', angle: 230 } },
  { name: 'Rose', bg: { kind: 'mesh', value: '#2A0A1F,#E0457B,#FF8FB1,#7A1E48', angle: 135 } },
  { name: 'Mint', bg: { kind: 'mesh', value: '#E8FFF6,#7FE7C4,#B5F2FF,#9FA8FF', angle: 90 } },
  { name: 'Midnight', bg: { kind: 'mesh', value: '#05060A,#2B2D6E,#6C3CE0,#0F8B8D', angle: 170 } },
  { name: 'Candy', bg: { kind: 'mesh', value: '#FFF0F6,#FF6EC7,#7AF0FF,#FFD36E', angle: 135 } },
];

export const GRADIENTS: ReadonlyArray<BgPreset> = [
  { name: 'Mist', bg: { kind: 'gradient', value: '#F7F7F5,#DADAD6' } },
  { name: 'Stone', bg: { kind: 'gradient', value: '#E9E9E6,#BDBDB8' } },
  { name: 'Graphite', bg: { kind: 'gradient', value: '#3A3A3A,#0E0E0E' } },
  { name: 'Dusk', bg: { kind: 'gradient', value: '#2E3192,#1BFFFF', angle: 135 } },
  { name: 'Flamingo', bg: { kind: 'gradient', value: '#F857A6,#FF5858', angle: 120 } },
  { name: 'Sky', bg: { kind: 'gradient', value: '#A1C4FD,#C2E9FB', angle: 160 } },
  { name: 'Forest', bg: { kind: 'gradient', value: '#134E5E,#71B280', angle: 135 } },
  { name: 'Mango', bg: { kind: 'gradient', value: '#FFE259,#FFA751', angle: 135 } },
  { name: 'Violet', bg: { kind: 'gradient', value: '#8E2DE2,#4A00E0', angle: 135 } },
  { name: 'Coral', bg: { kind: 'gradient', value: '#FF9966,#FF5E62', angle: 90 } },
  { name: 'Ice', bg: { kind: 'gradient', value: '#E0EAFC,#CFDEF3,#B6C9F0', angle: 180 } },
  { name: 'Neon', bg: { kind: 'gradient', value: '#12C2E9,#C471ED,#F64F59', angle: 120 } },
];

export const SOLIDS: ReadonlyArray<BgPreset> = [
  { name: 'Paper', bg: { kind: 'solid', value: '#FFFFFF' } },
  { name: 'Ink', bg: { kind: 'solid', value: '#111111' } },
  { name: 'Sand', bg: { kind: 'solid', value: '#EFE9DF' } },
  { name: 'Slate', bg: { kind: 'solid', value: '#2F3542' } },
  { name: 'Blush', bg: { kind: 'solid', value: '#F6D6D6' } },
  { name: 'Sage', bg: { kind: 'solid', value: '#CFE3D2' } },
];

export const MAX_STOPS: Record<Background['kind'], number> = { solid: 1, gradient: 4, mesh: 5 };
export const MIN_STOPS: Record<Background['kind'], number> = { solid: 1, gradient: 2, mesh: 2 };

const hex6 = (c: string) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return '#888888';
  return '#' + (m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1]).toLowerCase();
};

/** Mix a colour toward white (amt > 0) or black (amt < 0). */
export function shade(color: string, amt: number): string {
  const n = parseInt(hex6(color).slice(1), 16);
  const t = amt > 0 ? 255 : 0;
  const k = Math.abs(amt);
  const ch = (v: number) => Math.round(v + (t - v) * k).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

export const stopsOf = (bg: Pick<Background, 'value'>) => bg.value.split(',').map((s) => s.trim()).filter(Boolean);

/** Switch style while keeping the user's colours, inventing tints/shades when the new style needs more. */
export function convertStyle(bg: BgStyle, kind: Background['kind']): BgStyle {
  const stops = stopsOf(bg);
  const base = stops[0] ?? '#ffffff';
  if (kind === 'solid') return { kind, value: base };
  let next = stops;
  if (kind === 'gradient' && stops.length < 2) next = [base, shade(base, -0.35)];
  if (kind === 'mesh' && stops.length < 3) {
    const second = stops[1] ?? shade(base, 0.45);
    next = [shade(base, -0.55), base, second, shade(second, 0.3)];
  }
  next = next.slice(0, MAX_STOPS[kind]);
  return { kind, value: next.join(','), angle: bg.angle };
}

export const sameStyle = (a: BgStyle, b: BgStyle) =>
  a.kind === b.kind && a.value.toLowerCase() === b.value.toLowerCase() && (a.angle ?? 135) === (b.angle ?? 135);

export const toHex = hex6;
