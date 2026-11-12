import { describe, expect, it } from 'vitest';
import { buildDemoScript } from './demo-script';
import { drawDemoScene } from './draw-demo-scene';

function mockCtx() {
  const calls: string[] = [];
  const store: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(store, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return () => ({ width: 42 });
      return () => { calls.push(String(prop)); };
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('drawDemoScene', () => {
  const script = buildDemoScript();
  it.each([0, 1550, 3550, 6000, 10000])('paints the scene at %ims without throwing', (t) => {
    const { ctx, calls } = mockCtx();
    drawDemoScene(ctx, script.sceneAt(t));
    expect(calls[0]).toBe('fillRect');
    expect(calls.length).toBeGreaterThan(10);
  });
  it('draws the modal title text only while the modal is open', () => {
    const texts = (t: number) => {
      const seen: string[] = [];
      const { ctx } = mockCtx();
      (ctx as unknown as Record<string, unknown>).fillText = (s: string) => { seen.push(s); };
      drawDemoScene(ctx, script.sceneAt(t));
      return seen;
    };
    expect(texts(0)).not.toContain('Name your project');
    expect(texts(6000)).toContain('Name your project');
  });
});
