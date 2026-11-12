import { createInitialProject, type Recording } from '@buffer-clip/core';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const exporter = vi.hoisted(() => ({ exportMp4: vi.fn() }));
vi.mock('@/lib/export/exportMp4', async (orig) => ({ ...(await orig<object>()), exportMp4: exporter.exportMp4 }));
const download = vi.hoisted(() => ({ downloadBlob: vi.fn() }));
vi.mock('@/lib/export/download', () => download);
const storage = vi.hoisted(() => ({ getVideo: vi.fn() }));
vi.mock('@/lib/storage', () => storage);

import { ExportError } from '@/lib/export/exportMp4';
import { EditorProvider } from './EditorContext';
import { ExportSheet } from './ExportSheet';
import { createStores } from './store';

const rec: Recording = {
  id: 'r', createdAt: 0, name: 'Demo: New project flow', durationMs: 10000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false,
  events: [{ type: 'move', t: 0, x: 0, y: 0 }, { type: 'click', t: 1000, x: 10, y: 10, button: 0 }],
};

function setup() {
  const stores = createStores(rec, createInitialProject(rec));
  stores.editor.getState().setExportOpen(true);
  render(<EditorProvider stores={stores}><ExportSheet /></EditorProvider>);
  return stores;
}

beforeEach(() => {
  vi.clearAllMocks();
  storage.getVideo.mockResolvedValue(new Blob(['webm']));
});

describe('ExportSheet', () => {
  it('shows output options and a size estimate, and edits the output settings', async () => {
    const { editor } = setup();
    const dialog = screen.getByRole('dialog', { name: 'Export' });
    expect(within(dialog).getByText(/1920×1080/)).toBeInTheDocument();
    expect(within(dialog).getByText(/≈/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('radio', { name: '4K' }));
    expect(editor.getState().project.output.height).toBe(2160);
    await userEvent.click(within(dialog).getByRole('radio', { name: '30 fps' }));
    expect(editor.getState().project.output.fps).toBe(30);
  });
  it('exports, reports progress, downloads and shows the saved state', async () => {
    let finish: (b: Blob) => void = () => {};
    exporter.exportMp4.mockImplementation(({ onProgress }: { onProgress: (p: number) => void }) => {
      onProgress(0.42);
      return new Promise<Blob>((r) => (finish = r));
    });
    const { editor } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Export MP4' }));
    expect(await screen.findByText('Exporting… 42%')).toBeInTheDocument();
    expect(editor.getState().exportProgress).toBeCloseTo(0.42);
    const mp4 = new Blob(['mp4'], { type: 'video/mp4' });
    await act(async () => finish(mp4));
    expect(await screen.findByText('Saved Demo - New project flow.mp4')).toBeInTheDocument();
    expect(download.downloadBlob).toHaveBeenCalledWith(mp4, 'Demo - New project flow.mp4');
    expect(editor.getState().exportProgress).toBeNull();
    expect(exporter.exportMp4.mock.calls[0][0]).toMatchObject({ recording: rec });
  });
  it('cancels an export in progress', async () => {
    let signal: AbortSignal | undefined;
    exporter.exportMp4.mockImplementation((o: { signal: AbortSignal }) => {
      signal = o.signal;
      return new Promise((_, reject) => o.signal.addEventListener('abort', () => reject(new ExportError('cancelled'))));
    });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Export MP4' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel export' }));
    expect(signal?.aborted).toBe(true);
    expect(await screen.findByRole('button', { name: 'Export MP4' })).toBeInTheDocument();
  });
  it('explains codec errors and offers 1080p', async () => {
    exporter.exportMp4.mockRejectedValue(new ExportError('codec'));
    const { editor } = setup();
    act(() => editor.getState().setOutput({ height: 2160 }));
    await userEvent.click(screen.getByRole('button', { name: 'Export MP4' }));
    expect(await screen.findByText("This browser can't encode video at this size. Try 1080p.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Use 1080p' }));
    expect(editor.getState().project.output.height).toBe(1080);
  });
});
