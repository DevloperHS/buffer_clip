import { createInitialProject, outputDuration, type Recording } from '@buffer-clip/core';
import { describe, expect, it } from 'vitest';
import { buildDemoScript, DEMO_TARGETS, DEMO_TEXT, DEMO_VIEWPORT } from './demo-script';

describe('buildDemoScript', () => {
  const script = buildDemoScript();

  it('produces sorted events with 3 clicks and one key per character', () => {
    const times = script.events.map((e) => e.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(script.events.filter((e) => e.type === 'click')).toHaveLength(3);
    expect(script.events.filter((e) => e.type === 'key')).toHaveLength(DEMO_TEXT.length);
    expect(script.durationMs).toBe(11000);
  });
  it('clicks exactly on the targets', () => {
    const clicks = script.events.filter((e) => e.type === 'click');
    expect(clicks.map((c) => ({ x: c.x, y: c.y }))).toEqual([
      DEMO_TARGETS.newButton, DEMO_TARGETS.input, DEMO_TARGETS.createButton,
    ]);
  });
  it('describes the scene over time', () => {
    expect(script.sceneAt(0)).toEqual({ modalOpen: false, typed: '', created: false, pressed: null });
    expect(script.sceneAt(1550)).toMatchObject({ modalOpen: true, pressed: 'new' });
    expect(script.sceneAt(3550).typed).toBe('Lau');
    expect(script.sceneAt(6000)).toMatchObject({ modalOpen: true, typed: DEMO_TEXT });
    expect(script.sceneAt(10000)).toMatchObject({ modalOpen: false, created: true, pressed: null });
  });
  it('auto-edits into 2 zooms and cuts the idle stretch', () => {
    const rec: Recording = {
      id: 'demo', createdAt: 0, name: 'demo', durationMs: script.durationMs,
      viewport: DEMO_VIEWPORT, crop: null, hasAudio: false, events: script.events,
    };
    const p = createInitialProject(rec);
    expect(p.zooms).toHaveLength(2);
    expect(p.clips).toHaveLength(2);
    expect(outputDuration(p.clips)).toBe(7500);
  });
});
