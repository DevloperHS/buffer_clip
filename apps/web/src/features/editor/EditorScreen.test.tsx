import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const storage = vi.hoisted(() => ({
  loadOrCreateProject: vi.fn(),
  getVideo: vi.fn(),
  deleteRecording: vi.fn(),
  saveRecording: vi.fn(),
}));
vi.mock('@/lib/storage', () => storage);
const bridge = vi.hoisted(() => ({ requestFromExtension: vi.fn() }));
vi.mock('@/lib/bridge', () => bridge);
vi.mock('@/lib/thumbnail', () => ({ captureThumbnail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./EditorWorkspace', () => ({ EditorWorkspace: () => <div data-testid="preview" /> }));

import { EditorScreen } from './EditorScreen';

const loaded = { recording: { id: 'r1', name: 'Onboarding' }, project: { recordingId: 'r1' }, created: true };

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
  bridge.requestFromExtension.mockResolvedValue(null);
});

describe('EditorScreen', () => {
  it('shows a loading state first', () => {
    storage.loadOrCreateProject.mockReturnValue(new Promise(() => {}));
    render(<EditorScreen id="r1" />);
    expect(screen.getByText('Loading recording')).toBeInTheDocument();
  });
  it('renders the workspace when the recording is already local', async () => {
    storage.loadOrCreateProject.mockResolvedValue(loaded);
    storage.getVideo.mockResolvedValue(new Blob(['v']));
    render(<EditorScreen id="r1" />);
    expect(await screen.findByTestId('preview')).toBeInTheDocument();
    expect(bridge.requestFromExtension).not.toHaveBeenCalled();
  });
  it('receives a new recording from the extension, saves it and acks', async () => {
    const ack = vi.fn();
    const video = new Blob(['v']);
    const recording = { id: 'r1', name: 'Recording' };
    storage.loadOrCreateProject.mockResolvedValueOnce(null).mockResolvedValueOnce(loaded);
    storage.getVideo.mockResolvedValue(video);
    storage.saveRecording.mockResolvedValue(undefined);
    bridge.requestFromExtension.mockResolvedValue({ recording, video, ack });
    render(<EditorScreen id="r1" />);
    expect(await screen.findByTestId('preview')).toBeInTheDocument();
    expect(storage.saveRecording).toHaveBeenCalledWith(recording, video, undefined);
    expect(ack).toHaveBeenCalledOnce();
  });
  it('explains when the recording is missing and can delete it', async () => {
    storage.loadOrCreateProject.mockResolvedValue(null);
    storage.deleteRecording.mockResolvedValue(undefined);
    render(<EditorScreen id="gone" />);
    expect(await screen.findByText("This recording couldn't be loaded")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(storage.deleteRecording).toHaveBeenCalledWith('gone');
    expect(push).toHaveBeenCalledWith('/');
  });
});
