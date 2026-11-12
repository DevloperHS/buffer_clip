import type { InputEvent, Rect } from '@buffer-clip/core';

export type Mode = 'tab' | 'area';
export interface Viewport { w: number; h: number; dpr: number }
export interface Prepared { crop: Rect | null; viewport: Viewport }

export interface Session {
  tabId: number;
  phase: 'preparing' | 'recording';
  startedAt: number | null; // epoch ms when recording began
  mode: Mode;
  audio: boolean;
}

export interface PendingSummary { id: string; name: string; durationMs: number; createdAt: number }
export interface StatusResponse { session: Session | null; pending: PendingSummary[] }
export interface Result { ok: boolean; error?: string; id?: string }

/** Messages handled by the background service worker. */
export type BgRequest =
  | { type: 'popup:status' }
  | { type: 'popup:start'; tabId: number; mode: Mode; audio: boolean }
  | { type: 'popup:stop' }
  | { type: 'popup:open'; id: string }
  | { type: 'offscreen:tick'; elapsedMs: number };

/** Messages handled by the offscreen document. */
export type OffscreenRequest =
  | { type: 'offscreen:start'; streamId: string; audio: boolean; viewport: Viewport; crop: Rect | null }
  | { type: 'offscreen:stop' }
  | { type: 'content:events'; events: InputEvent[] };

/** Messages handled by the recorder content script. */
export type ContentRequest =
  | { type: 'content:prepare'; mode: Mode }
  | { type: 'content:begin' }
  | { type: 'content:end' };

export const EXT_SOURCE = 'buffer-clip-ext';
export const APP_SOURCE = 'buffer-clip-app';
