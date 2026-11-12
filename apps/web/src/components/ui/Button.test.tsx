import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders children and handles clicks', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Export</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it('applies the ink style for primary and surface style for secondary', () => {
    render(
      <>
        <Button variant="primary">A</Button>
        <Button>B</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'A' }).className).toContain('bg-ink');
    expect(screen.getByRole('button', { name: 'B' }).className).toContain('bg-paper');
  });
  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>X</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'X' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
