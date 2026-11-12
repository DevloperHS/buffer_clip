import { createInitialProject, type Recording } from '@buffer-clip/core';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { EditorProvider } from '../editor/EditorContext';
import { createStores } from '../editor/store';
import { TourOverlay } from './TourOverlay';

const rec: Recording = {
  id: 'tut', createdAt: 0, name: 'How to use Buffer Clip', durationMs: 10000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false, tutorial: true,
  events: [{ type: 'click', t: 1000, x: 10, y: 10, button: 0 }],
};
const KEY = 'buffer-clip:tour:tut';

function setup() {
  const stores = createStores(rec, createInitialProject(rec));
  render(<EditorProvider stores={stores}><TourOverlay recordingId="tut" startDelayMs={0} /></EditorProvider>);
  return stores;
}

beforeEach(() => {
  localStorage.clear();
  push.mockReset();
});

describe('TourOverlay', () => {
  it('starts at step 1 and advances when the user does it', async () => {
    const { playback } = setup();
    const card = await screen.findByRole('dialog', { name: 'Guided tour' });
    expect(card).toHaveTextContent('Step 1 of 15');
    expect(card).toHaveTextContent('Press Space to play');
    act(() => playback.getState().play());
    expect(await screen.findByText('✓ Nice')).toBeInTheDocument();
    expect(await screen.findByText('Scrub the timeline', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('{"step":1}');
  });
  it('skips a step and ends the tour', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Skip step' }));
    expect(screen.getByRole('dialog', { name: 'Guided tour' })).toHaveTextContent('Step 2 of 15');
    await userEvent.click(screen.getByRole('button', { name: 'End tour' }));
    expect(screen.queryByRole('dialog', { name: 'Guided tour' })).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('{"done":true}');
  });
  it('resumes from saved progress and shows the finish card after the last step', async () => {
    localStorage.setItem(KEY, '{"step":14}');
    const { editor } = setup();
    expect(await screen.findByText('Export your video')).toBeInTheDocument();
    act(() => editor.getState().setExportOpen(true));
    expect(await screen.findByText("You're ready", {}, { timeout: 2000 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to projects' }));
    expect(push).toHaveBeenCalledWith('/');
  });
  it('stays hidden when finished, and restarts on request', async () => {
    localStorage.setItem(KEY, '{"done":true}');
    const { editor } = setup();
    expect(screen.queryByRole('dialog', { name: 'Guided tour' })).not.toBeInTheDocument();
    act(() => editor.getState().restartTour());
    expect(await screen.findByRole('dialog', { name: 'Guided tour' })).toHaveTextContent('Step 1 of 15');
  });
});
