export type Ms = number;
export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Size { w: number; h: number }

export type InputEvent =
  | { type: 'move'; t: Ms; x: number; y: number }
  | { type: 'click'; t: Ms; x: number; y: number; button: 0 | 1 | 2 }
  | { type: 'key'; t: Ms; key: string; mods: string[] }
  | { type: 'scroll'; t: Ms; dx: number; dy: number }
  | { type: 'resize'; t: Ms; w: number; h: number };

export interface Recording {
  id: string;
  createdAt: number;
  name: string;
  durationMs: Ms;
  viewport: { w: number; h: number; dpr: number };
  crop: Rect | null;
  hasAudio: boolean;
  tutorial?: true; // created by "How to use"; opens with the guided tour
  events: InputEvent[];
  /** How much the picture changes over time, so idle detection never cuts moving footage. */
  motion?: MotionTrack;
  /** 'letterbox': captured at a fixed 16-aligned size, so the page may sit between thin bars. */
  captureFit?: 'letterbox';
}

/** Change between consecutive sampled frames (0..1), one value every `stepMs` of source time. */
export interface MotionTrack { stepMs: Ms; values: number[] }

export interface Clip { id: string; srcStart: Ms; srcEnd: Ms; speed: number; idle?: boolean }

export interface Zoom {
  id: string;
  start: Ms;
  end: Ms;
  scale: number;
  target: Point | 'follow';
  easeMs: Ms;
  auto: boolean;
}

export interface CursorStyle {
  visible: boolean;
  size: 1 | 1.5 | 2;
  smoothing: number; // 0..1
  clickRipple: boolean;
  hideWhenIdleMs: Ms | null;
}

export interface Background {
  /** solid: one colour. gradient: linear stops along the angle. mesh: a base colour, then soft blobs (abstract). */
  kind: 'solid' | 'gradient' | 'mesh';
  value: string; // comma-separated colours
  angle?: number; // degrees, CSS convention; default 135
  padding: number; // px at 1080p output height
  radius: number; // px at 1080p output height
  shadow: number; // 0..1
}

export type Aspect = '16:9' | '9:16' | '1:1';

export interface OutputSettings { aspect: Aspect; height: 1080 | 2160; fps: 30 | 60 }

export interface Project {
  version: 1;
  recordingId: string;
  clips: Clip[];
  zooms: Zoom[];
  cursor: CursorStyle;
  background: Background;
  output: OutputSettings;
}
