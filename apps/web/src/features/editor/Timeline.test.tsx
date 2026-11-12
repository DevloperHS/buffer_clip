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

function setupTimeline() {
  const stores = createStores(rec, createInitialProject(rec));
  render(<EditorProvider stores={stores}><TimelineDock /></EditorProvider>);
  return stores;
}

describe('TimelineDock (clips)', () => {
  it('renders one block per clip and the timecode', () => {
    setupTimeline();
    expect(screen.getAllByTestId('clip-block')).toHaveLength(2);
    expect(screen.getByTestId('timecode')).toHaveTextContent('0:00.0');
  });
  it('selects a clip on press', async () => {
    const { editor } = setupTimeline();
    const [first] = screen.getAllByTestId('clip-block');
    await userEvent.click(first);
    expect(editor.getState().selection).toEqual({ kind: 'clip', id: editor.getState().project.clips[0].id });
    expect(first).toHaveAttribute('aria-pressed', 'true');
  });
  it('speeds up an idle gap, then keeps it, then cuts it again', async () => {
    const { editor } = setupTimeline();
    await userEvent.click(screen.getAllByRole('button', { name: /^Idle gap/ })[0]);
    expect(screen.getAllByTestId('clip-block')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: /Idle sped up/ }));
    expect(editor.getState().project.clips.find((c) => c.idle)?.speed).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: /Idle kept/ }));
    expect(screen.getAllByTestId('clip-block')).toHaveLength(2);
  });
  it('toggles playback from the transport', async () => {
    const { playback } = setupTimeline();
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(playback.getState().playing).toBe(true);
  });
});
