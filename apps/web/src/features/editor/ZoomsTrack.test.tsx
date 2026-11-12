import { createInitialProject, type Recording } from '@buffer-clip/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EditorProvider } from './EditorContext';
import { createStores } from './store';
import { TimelineDock } from './Timeline';

const rec: Recording = {
  id: 'r', createdAt: 0, name: 'Demo', durationMs: 10000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false,
  events: [
    { type: 'move', t: 0, x: 0, y: 0 },
    { type: 'click', t: 1000, x: 100, y: 100, button: 0 },
    { type: 'move', t: 1100, x: 110, y: 105 },
    { type: 'click', t: 8000, x: 600, y: 400, button: 0 },
  ],
};

function setup() {
  const stores = createStores(rec, createInitialProject(rec));
  render(<EditorProvider stores={stores}><TimelineDock /></EditorProvider>);
  return stores;
}

describe('TimelineDock (zooms and clicks)', () => {
  it('renders zoom blocks and click marks', () => {
    setup();
    expect(screen.getAllByTestId('zoom-block')).toHaveLength(2);
    expect(screen.getAllByTestId('click-mark')).toHaveLength(2);
  });
  it('selects a zoom on press and reports hover', async () => {
    const { editor } = setup();
    const [first] = screen.getAllByTestId('zoom-block');
    await userEvent.hover(first);
    expect(editor.getState().hoverZoomId).toBe(editor.getState().project.zooms[0].id);
    await userEvent.click(first);
    expect(editor.getState().selection).toEqual({ kind: 'zoom', id: editor.getState().project.zooms[0].id });
  });
  it('adds a zoom on double-click in the zoom lane', async () => {
    const { editor } = setup();
    await userEvent.dblClick(screen.getByTestId('zoom-lane'));
    expect(screen.getAllByTestId('zoom-block')).toHaveLength(3);
    expect(editor.getState().selection?.kind).toBe('zoom');
  });
});
