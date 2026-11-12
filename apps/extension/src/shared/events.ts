import type { InputEvent } from '@buffer-clip/core';

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  target: unknown;
}

const isPasswordTarget = (t: unknown): boolean => {
  const el = t as { tagName?: string; type?: string } | null;
  return !!el && el.tagName === 'INPUT' && el.type === 'password';
};

export function keyFromEvent(e: KeyLike): { key: string; mods: string[] } {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push('ctrl');
  if (e.altKey) mods.push('alt');
  if (e.shiftKey) mods.push('shift');
  if (e.metaKey) mods.push('meta');
  return { key: isPasswordTarget(e.target) ? '•' : e.key, mods };
}

export function toRelativeEvents(raw: InputEvent[], startedAt: number, durationMs: number): InputEvent[] {
  return raw
    .map((e) => ({ ...e, t: Math.round((e.t - startedAt) * 10) / 10 }))
    .filter((e) => e.t >= 0 && e.t <= durationMs)
    .sort((a, b) => a.t - b.t);
}
