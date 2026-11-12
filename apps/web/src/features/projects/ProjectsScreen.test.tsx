import type { Recording } from '@buffer-clip/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rec: Recording = {
  id: 'r1', createdAt: Date.now(), name: 'Onboarding', durationMs: 5000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false, events: [],
};

const storage = vi.hoisted(() => ({
  listRecordings: vi.fn(),
  getThumb: vi.fn(),
  getVideo: vi.fn(),
  saveRecording: vi.fn(),
  renameRecording: vi.fn(),
  deleteRecording: vi.fn(),
  storageErrorMessage: vi.fn(() => 'Not enough storage. Delete old recordings.'),
}));
vi.mock('@/lib/storage', () => storage);
const demo = vi.hoisted(() => ({ recordDemo: vi.fn() }));
vi.mock('@/features/demo/record-demo', () => demo);

import { ProjectsScreen } from './ProjectsScreen';

beforeEach(() => {
  vi.clearAllMocks();
  storage.listRecordings.mockResolvedValue([rec]);
  storage.getThumb.mockResolvedValue(undefined);
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

describe('ProjectsScreen', () => {
  it('loads recordings from storage', async () => {
    render(<ProjectsScreen />);
    expect(await screen.findByRole('link', { name: 'Open Onboarding' })).toBeInTheDocument();
  });
  it('flags browsers without WebCodecs', async () => {
    render(<ProjectsScreen />);
    expect(await screen.findByText('Buffer Clip needs Chrome or Edge.')).toBeInTheDocument();
  });
  it('records, saves and refreshes when creating a demo', async () => {
    const out = { recording: { ...rec, id: 'r2', name: 'Demo' }, video: new Blob(), thumb: new Blob() };
    demo.recordDemo.mockResolvedValue(out);
    storage.saveRecording.mockResolvedValue(undefined);
    render(<ProjectsScreen />);
    await screen.findByRole('link', { name: 'Open Onboarding' });
    storage.listRecordings.mockResolvedValue([out.recording, rec]);
    await userEvent.click(screen.getByRole('button', { name: 'How to use' }));
    expect(await screen.findByRole('link', { name: 'Open Demo' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Guided tour ready' })).toBeInTheDocument();
    expect(storage.saveRecording).toHaveBeenCalledWith(out.recording, out.video, out.thumb);
  });
  it('shows a friendly error when saving fails', async () => {
    demo.recordDemo.mockResolvedValue({ recording: rec, video: new Blob(), thumb: new Blob() });
    storage.saveRecording.mockRejectedValue(new DOMException('full', 'QuotaExceededError'));
    render(<ProjectsScreen />);
    await screen.findByRole('link', { name: 'Open Onboarding' });
    await userEvent.click(screen.getByRole('button', { name: 'How to use' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Not enough storage');
  });
  it('removes a card after deleting', async () => {
    storage.deleteRecording.mockResolvedValue(undefined);
    render(<ProjectsScreen />);
    await screen.findByRole('link', { name: 'Open Onboarding' });
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Delete recording' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Open Onboarding' })).not.toBeInTheDocument());
    expect(storage.deleteRecording).toHaveBeenCalledWith('r1');
  });
});
