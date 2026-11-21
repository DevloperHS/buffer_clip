import { createInitialProject, type Recording } from '@buffer-clip/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EditorProvider } from './EditorContext';
import { Inspector } from './Inspector';
import { createStores } from './store';

const rec: Recording = {
  id: 'r', createdAt: 0, name: 'Demo', durationMs: 10000,
  viewport: { w: 1280, h: 720, dpr: 1 }, crop: null, hasAudio: false,
  events: [
    { type: 'click', t: 1000, x: 100, y: 100, button: 0 },
    { type: 'click', t: 8000, x: 600, y: 400, button: 0 },
  ],
};

function setup() {
  localStorage.clear(); // the customize panel remembers whether it was open
  const stores = createStores(rec, createInitialProject(rec));
  render(<EditorProvider stores={stores}><Inspector /></EditorProvider>);
  return stores;
}

describe('Inspector', () => {
  it('edits background padding', () => {
    const { editor } = setup();
    fireEvent.change(screen.getByRole('slider', { name: 'Padding' }), { target: { value: '100' } });
    expect(editor.getState().project.background.padding).toBe(100);
  });
  it('applies a background preset', async () => {
    const { editor } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Graphite' }));
    expect(editor.getState().project.background).toMatchObject({ kind: 'gradient', value: '#3A3A3A,#0E0E0E' });
  });
  it('switches to abstract backgrounds and applies one', async () => {
    const { editor } = setup();
    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Background style' })).getByRole('radio', { name: 'Abstract' }));
    expect(editor.getState().project.background.kind).toBe('mesh');
    await userEvent.click(screen.getByRole('button', { name: 'Aurora' }));
    expect(editor.getState().project.background).toMatchObject({ kind: 'mesh', value: '#0B1026,#6D5BFF,#00D1FF,#FF5FA2' });
    expect(screen.getByRole('button', { name: 'Aurora' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('keeps the customize panel collapsed until opened', async () => {
    setup();
    const toggle = screen.getByRole('button', { name: /Customize/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Colour 1')).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Colour 1')).toBeInTheDocument();
  });
  it('builds a custom gradient: edit colours, add a stop and set the angle', async () => {
    const { editor } = setup();
    await userEvent.click(screen.getByRole('button', { name: /Customize/ }));
    fireEvent.change(screen.getByLabelText('Colour 1'), { target: { value: '#ff0000' } });
    await userEvent.click(screen.getByRole('button', { name: 'Add colour' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Angle' }), { target: { value: '90' } });
    const bg = editor.getState().project.background;
    expect(bg.kind).toBe('gradient');
    expect(bg.value.split(',')).toHaveLength(3);
    expect(bg.value.startsWith('#ff0000')).toBe(true);
    expect(bg.angle).toBe(90);
  });
  it('toggles click ripple and sets cursor size', async () => {
    const { editor } = setup();
    await userEvent.click(screen.getByRole('switch', { name: 'Click ripple' }));
    expect(editor.getState().project.cursor.clickRipple).toBe(false);
    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Cursor size' })).getByRole('radio', { name: '2×' }));
    expect(editor.getState().project.cursor.size).toBe(2);
  });
  it('shows zoom controls for a selected zoom', async () => {
    const { editor, playback } = setup();
    const id = editor.getState().project.zooms[0].id;
    act(() => editor.getState().select({ kind: 'zoom', id }));
    expect(playback.getState().outT).toBe(500); // jumped to where the zoom is fully in, so edits are visible
    fireEvent.change(await screen.findByRole('slider', { name: 'Scale' }), { target: { value: '2.5' } });
    expect(editor.getState().project.zooms.find((z) => z.id === id)?.scale).toBe(2.5);
    await userEvent.click(screen.getByRole('switch', { name: 'Follow cursor' }));
    expect(editor.getState().project.zooms.find((z) => z.id === id)?.target).toBe('follow');
    await userEvent.click(screen.getByRole('button', { name: 'Delete zoom' }));
    expect(editor.getState().project.zooms.some((z) => z.id === id)).toBe(false);
  });
  it('sets clip speed for a selected clip', async () => {
    const { editor } = setup();
    const id = editor.getState().project.clips[0].id;
    act(() => editor.getState().select({ kind: 'clip', id }));
    const group = await screen.findByRole('radiogroup', { name: 'Speed' });
    await userEvent.click(within(group).getByRole('radio', { name: '4×' }));
    expect(editor.getState().project.clips[0].speed).toBe(4);
  });
});
