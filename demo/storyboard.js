// The demo's edit: what plays when, how fast, where the camera looks, and what the captions say.
// Times are output seconds. `src` names a mark logged by capture.mjs; `at` offsets from it (seconds).
// Shared by the compositor (compose.js) and the music (music.js), which lands its drop on 8.0s.

export const FPS = 60;
export const SIZE = { w: 1920, h: 1080 };
export const DURATION = 40;
export const BPM = 120;

export const SCENES = [
  { id: 'hook', t0: 0, t1: 3.0, kind: 'card' },
  { id: 'projects', t0: 3.0, t1: 4.8, kind: 'app', src: 'projects', at: 0.35, speed: 1, cam: { focus: 'cursor', z: [1.0, 1.12] } },
  { id: 'record', t0: 4.8, t1: 8.0, kind: 'record', speed: 2.1 },
  { id: 'editor', t0: 8.0, t1: 11.0, kind: 'app', src: 'editor', at: 0, speed: 1, hideCursor: true, cam: { focus: [800, 450], z: 1.0 } },
  { id: 'play', t0: 11.0, t1: 15.0, kind: 'app', src: 'play', at: 0.1, speed: 1.25, hideCursor: true, cam: { focus: [585, 330], z: 1.3 } },
  { id: 'trim', t0: 15.0, t1: 17.4, kind: 'app', src: 'trim', at: 0, speed: 1.12, cam: { focus: 'cursor', z: 1.75 } },
  { id: 'split', t0: 17.4, t1: 19.0, kind: 'app', src: 'split', at: 0, speed: 1.25, cam: { focus: 'cursor', z: 1.6 } },
  { id: 'zoom', t0: 19.0, t1: 23.6, kind: 'app', src: 'zoom', at: 0, speed: 1.4, cam: { focus: 'cursor', z: 1.32 } },
  { id: 'bg', t0: 23.6, t1: 28.8, kind: 'app', src: 'bg', at: 0, speed: 1.65, cam: { focus: 'cursor', z: [1.5, 1.5, 1.5, 1.0, 1.0] } },
  { id: 'aspect', t0: 28.8, t1: 31.8, kind: 'app', src: 'aspect', at: 0, speed: 1.75, cam: { focus: [800, 420], z: 1.0 } },
  // Export: open the sheet, race through encoding, land on "Saved".
  { id: 'export', t0: 31.8, t1: 33.95, kind: 'app', src: 'export', at: 0, speed: 2.2, cam: { focus: 'cursor', z: [1.0, 1.5, 1.5] } },
  { id: 'encode', t0: 33.95, t1: 34.85, kind: 'app', src: 'export-start', at: 0, until: 'export-done', cam: { focus: [1430, 190], z: 1.5 } },
  { id: 'saved', t0: 34.85, t1: 35.6, kind: 'app', src: 'export-done', at: 0, speed: 1, cam: { focus: [1430, 190], z: 1.5 } },
  { id: 'outro', t0: 35.6, t1: 40, kind: 'card' },
];

export const CAPTIONS = [
  { t0: 3.15, t1: 4.75, text: 'Open Buffer Clip' },
  { t0: 4.95, t1: 7.9, text: 'Hit record. Use your app as usual.' },
  { t0: 8.25, t1: 10.9, text: 'It lands in the editor, already polished' },
  { t0: 11.15, t1: 14.9, text: 'Auto-zooms follow every click' },
  { t0: 15.15, t1: 17.3, text: 'Trim on a timeline with real frames' },
  { t0: 17.5, t1: 18.95, text: 'Split with one key' },
  { t0: 19.15, t1: 23.5, text: 'Draw exactly what to zoom into' },
  { t0: 23.75, t1: 28.7, text: 'Abstract backgrounds in one click' },
  { t0: 28.95, t1: 31.7, text: '16:9, 9:16 or 1:1' },
  { t0: 31.95, t1: 35.5, text: 'Export 4K at 60fps' },
];
