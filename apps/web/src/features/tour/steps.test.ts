import { createInitialProject, type Project, type Recording } from '@buffer-clip/core';
import { describe, expect, it } from 'vitest';
import { bodyParts, stepCompleted, TOUR_STEPS, type TourSnapshot } from './steps';

const rec = {
  id: 'r', createdAt: 0, name: 'r', durationMs: 10000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false,
  events: [{ type: 'click', t: 1000, x: 10, y: 10, button: 0 }],
} as Recording;
const base = (): TourSnapshot => ({
  project: createInitialProject(rec), selection: null, picking: false,
  playing: false, outT: 0, seekId: 0, paletteOpen: false, exportOpen: false, pastCount: 0,
});
const step = (id: string) => TOUR_STEPS.find((s) => s.id === id)!;
const withProject = (s: TourSnapshot, fn: (p: Project) => Project): TourSnapshot => ({ ...s, project: fn(s.project) });

describe('tour steps', () => {
  it('has 15 steps in the agreed order', () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual([
      'play', 'scrub', 'trim', 'split', 'undo', 'idle', 'select-zoom', 'scale', 'add-zoom', 'pick',
      'background', 'cursor', 'aspect', 'palette', 'export',
    ]);
  });
  it('play, scrub, palette and export watch UI state', () => {
    const a = base();
    expect(stepCompleted(step('play'), a, { ...a, playing: true })).toBe(true);
    expect(stepCompleted(step('play'), a, a)).toBe(false);
    expect(stepCompleted(step('scrub'), a, { ...a, seekId: 1 })).toBe(true);
    expect(stepCompleted(step('palette'), a, { ...a, paletteOpen: true })).toBe(true);
    expect(stepCompleted(step('export'), a, { ...a, exportOpen: true })).toBe(true);
  });
  it('trim needs a changed edge with the same clip count; split needs one more non-idle clip', () => {
    const a = base();
    const clip = a.project.clips[0];
    const trimmed = withProject(a, (p) => ({ ...p, clips: [{ ...clip, srcEnd: clip.srcEnd - 100 }, ...p.clips.slice(1)] }));
    expect(stepCompleted(step('trim'), a, trimmed)).toBe(true);
    const split = withProject(a, (p) => ({ ...p, clips: [...p.clips, { id: 'x', srcStart: 1, srcEnd: 2, speed: 1 }] }));
    expect(stepCompleted(step('split'), a, split)).toBe(true);
    expect(stepCompleted(step('trim'), a, split)).toBe(false);
    const idle = withProject(a, (p) => ({ ...p, clips: [...p.clips, { id: 'y', srcStart: 1, srcEnd: 2, speed: 8, idle: true }] }));
    expect(stepCompleted(step('split'), a, idle)).toBe(false);
    expect(stepCompleted(step('idle'), a, idle)).toBe(true);
  });
  it('undo only counts for the undo step', () => {
    const a = { ...base(), pastCount: 2 };
    const undone = withProject({ ...a, pastCount: 1 }, (p) => ({ ...p, background: { ...p.background, padding: 1 } }));
    expect(stepCompleted(step('undo'), a, undone)).toBe(true);
    expect(stepCompleted(step('background'), a, undone)).toBe(false);
  });
  it('zoom steps follow the selected zoom', () => {
    const a = base();
    const z = a.project.zooms[0];
    const selected = { ...a, selection: { kind: 'zoom' as const, id: z.id } };
    expect(stepCompleted(step('select-zoom'), a, selected)).toBe(true);
    const scaled = withProject(selected, (p) => ({ ...p, zooms: p.zooms.map((x) => ({ ...x, scale: 2.4 })) }));
    expect(stepCompleted(step('scale'), selected, scaled)).toBe(true);
    const added = withProject(a, (p) => ({ ...p, zooms: [...p.zooms, { ...z, id: 'new' }] }));
    expect(stepCompleted(step('add-zoom'), a, added)).toBe(true);
    const picking = { ...selected, picking: true };
    const picked = withProject(picking, (p) => ({ ...p, zooms: p.zooms.map((x) => ({ ...x, target: { x: 5, y: 5 } })) }));
    expect(stepCompleted(step('pick'), picking, picked)).toBe(true);
    const followOff = withProject(selected, (p) => ({ ...p, zooms: p.zooms.map((x) => ({ ...x, target: { x: 5, y: 5 } })) }));
    expect(stepCompleted(step('pick'), selected, followOff)).toBe(false); // not via the Follow toggle
  });
  it('style steps watch background, cursor and aspect', () => {
    const a = base();
    expect(stepCompleted(step('background'), a, withProject(a, (p) => ({ ...p, background: { ...p.background, padding: 99 } })))).toBe(true);
    expect(stepCompleted(step('cursor'), a, withProject(a, (p) => ({ ...p, cursor: { ...p.cursor, size: 2 } })))).toBe(true);
    expect(stepCompleted(step('aspect'), a, withProject(a, (p) => ({ ...p, output: { ...p.output, aspect: '9:16' } })))).toBe(true);
  });
  it('turns {X} tokens into key caps', () => {
    expect(bodyParts('Press {Mod} {K}.', 'Ctrl')).toEqual([
      { text: 'Press ' }, { key: 'Ctrl' }, { text: ' ' }, { key: 'K' }, { text: '.' },
    ]);
  });
});
