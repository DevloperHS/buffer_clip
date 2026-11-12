import type { Recording } from '@buffer-clip/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectsView, type ProjectItem } from './ProjectsView';

const item = (id: string): ProjectItem => ({
  recording: {
    id, createdAt: Date.now(), name: `Rec ${id}`, durationMs: 5000,
    viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false, events: [],
  } as Recording,
  thumbUrl: null,
});

const base = {
  items: [] as ProjectItem[], loading: false, demoProgress: null, error: null, unsupported: false,
  onCreateDemo: vi.fn(), onRename: vi.fn(), onDelete: vi.fn(),
};

describe('ProjectsView', () => {
  it('shows the empty state and starts the tutorial from it', async () => {
    const onCreateDemo = vi.fn();
    render(<ProjectsView {...base} onCreateDemo={onCreateDemo} />);
    expect(screen.getByText('Record your first demo')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'How to use' });
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[1]);
    expect(onCreateDemo).toHaveBeenCalledOnce();
  });
  it('shows the tooltip on the newly created tutorial card only', () => {
    render(<ProjectsView {...base} items={[item('a'), item('b')]} newTutorialId="b" onDismissTip={vi.fn()} />);
    expect(screen.getAllByRole('dialog', { name: 'Guided tour ready' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Open tutorial' })).toHaveAttribute('href', '/editor/b');
  });
  it('hides the empty state while loading', () => {
    render(<ProjectsView {...base} loading />);
    expect(screen.queryByText('Record your first demo')).not.toBeInTheDocument();
  });
  it('renders a card per recording with a count', () => {
    render(<ProjectsView {...base} items={[item('a'), item('b')]} />);
    expect(screen.getByRole('link', { name: 'Open Rec a' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Rec b' })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
  it('shows generation progress and disables the header button', () => {
    render(<ProjectsView {...base} items={[item('a')]} demoProgress={0.4} />);
    expect(screen.getByRole('button', { name: 'Generating… 40%' })).toBeDisabled();
  });
  it('shows error and browser-support banners', () => {
    render(<ProjectsView {...base} error="Not enough storage. Delete old recordings." unsupported />);
    expect(screen.getByRole('alert')).toHaveTextContent('Not enough storage');
    expect(screen.getByText('Buffer Clip needs Chrome or Edge.')).toBeInTheDocument();
  });
});
