import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { filterCommands, type Command } from './commands';
import { CommandPalette } from './CommandPalette';
import { buildCommands } from './commands';
import type { EditorApi } from './editor-api';

const cmds = (): Command[] => [
  { id: 'split', label: 'Split clip at playhead', hint: 'S', run: vi.fn() },
  { id: 'a169', label: 'Aspect ratio 16:9', run: vi.fn() },
  { id: 'a916', label: 'Aspect ratio 9:16', run: vi.fn() },
];

describe('filterCommands', () => {
  it('matches every word, case-insensitively', () => {
    expect(filterCommands(cmds(), 'ASPECT 9:16').map((c) => c.id)).toEqual(['a916']);
    expect(filterCommands(cmds(), '')).toHaveLength(3);
  });
});

describe('CommandPalette', () => {
  it('filters and runs the highlighted command with Enter', async () => {
    const list = cmds();
    const onClose = vi.fn();
    render(<CommandPalette open commands={list} onClose={onClose} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Search actions' }), 'aspect{ArrowDown}{Enter}');
    expect(list[2].run).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
  });
  it('shows an empty state and closes with Escape', async () => {
    const onClose = vi.fn();
    render(<CommandPalette open commands={cmds()} onClose={onClose} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Search actions' }), 'zzz');
    expect(screen.getByText('No matching actions')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('renders nothing when closed', () => {
    render(<CommandPalette open={false} commands={cmds()} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('buildCommands', () => {
  const api = new Proxy({}, { get: () => vi.fn() }) as EditorApi;
  it('offers Restart tutorial only on tutorial recordings', () => {
    const ids = (tutorial?: boolean) => buildCommands(api, { projects: vi.fn(), tutorial }, 'Ctrl+').map((c) => c.id);
    expect(ids(true)).toContain('restart-tutorial');
    expect(ids(false)).not.toContain('restart-tutorial');
  });
});
