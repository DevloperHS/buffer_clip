import type { Recording } from '@buffer-clip/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectCard } from './ProjectCard';

const rec: Recording = {
  id: 'r1', createdAt: Date.now(), name: 'Onboarding', durationMs: 65_000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false, events: [],
};

function setup() {
  const onRename = vi.fn();
  const onDelete = vi.fn();
  render(<ProjectCard recording={rec} thumbUrl={null} index={0} onRename={onRename} onDelete={onDelete} />);
  return { onRename, onDelete };
}

describe('ProjectCard', () => {
  it('shows name, duration, date and links to the editor', () => {
    setup();
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
    expect(screen.getByText('1:05')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Onboarding' })).toHaveAttribute('href', '/editor/r1');
  });
  it('renames inline with Enter', async () => {
    const { onRename } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: 'Recording name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Checkout flow{Enter}');
    expect(onRename).toHaveBeenCalledOnce();
    expect(onRename).toHaveBeenCalledWith('r1', 'Checkout flow');
  });
  it('cancels rename with Escape', async () => {
    const { onRename } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Recording name' }), 'zzz{Escape}');
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
  });
  it('asks for confirmation before deleting', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete recording' }));
    expect(onDelete).toHaveBeenCalledWith('r1');
  });
  it('marks tutorial recordings with a badge', () => {
    render(
      <ProjectCard recording={{ ...rec, tutorial: true }} thumbUrl={null} index={0} onRename={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText('Tutorial')).toBeInTheDocument();
  });
  it('shows the tour-ready tooltip and dismisses it with Escape', async () => {
    const onDismissTip = vi.fn();
    render(
      <ProjectCard recording={{ ...rec, tutorial: true }} thumbUrl={null} index={0} onRename={vi.fn()} onDelete={vi.fn()}
        showTourTip onDismissTip={onDismissTip} />,
    );
    const tip = screen.getByRole('dialog', { name: 'Guided tour ready' });
    expect(tip).toHaveTextContent('Your guided tour is ready');
    expect(screen.getByRole('link', { name: 'Open tutorial' })).toHaveAttribute('href', '/editor/r1');
    await userEvent.keyboard('{Escape}');
    expect(onDismissTip).toHaveBeenCalled();
  });
});
