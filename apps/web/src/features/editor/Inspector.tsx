'use client';
import { contentFrame, type CursorStyle } from '@buffer-clip/core';
import { Crosshair, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { spring } from '@/design/motion';
import { cn } from '@/lib/cn';
import { BackgroundPicker } from './BackgroundPicker';
import { useEditor, useGesture, useStores } from './EditorContext';
import { zoomPeakOut } from './timeline-geometry';

const SPEEDS = [
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
  { value: 8, label: '8×' },
] as const;

const CURSOR_SIZES: ReadonlyArray<{ value: CursorStyle['size']; label: string }> = [
  { value: 1, label: '1×' },
  { value: 1.5, label: '1.5×' },
  { value: 2, label: '2×' },
];

const percent = (v: number) => `${Math.round(v * 100)}%`;
const panel = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 12 },
  transition: spring.snappy,
};

function Section({ title, tour, children }: { title: string; tour?: string; children: ReactNode }) {
  return (
    <section data-tour={tour} className="border-b border-hairline px-4 py-4">
      <h3 className="mb-1 text-[11px] font-medium tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

export function Inspector() {
  const { editor, playback } = useStores();
  const gesture = useGesture();
  const ed = () => editor.getState();
  const background = useEditor((s) => s.project.background);
  const cursor = useEditor((s) => s.project.cursor);
  const recording = useEditor((s) => s.recording);
  const clipCount = useEditor((s) => s.project.clips.length);
  const picking = useEditor((s) => s.picking);
  const zoom = useEditor((s) => {
    const sel = s.selection;
    return sel?.kind === 'zoom' ? (s.project.zooms.find((z) => z.id === sel.id) ?? null) : null;
  });
  const clip = useEditor((s) => {
    const sel = s.selection;
    return sel?.kind === 'clip' ? (s.project.clips.find((c) => c.id === sel.id) ?? null) : null;
  });
  const zoomId = zoom?.id;
  // Jump to where the selected zoom is fully in, so every zoom edit is visible in the preview.
  useEffect(() => {
    if (!zoomId) return;
    const { project: p } = editor.getState();
    const z = p.zooms.find((x) => x.id === zoomId);
    if (z && !playback.getState().playing) playback.getState().seek(zoomPeakOut(z, p.clips));
  }, [zoomId, editor, playback]);

  const f = contentFrame(recording);
  const center = { x: f.x + f.w / 2, y: f.y + f.h / 2 };

  return (
    <aside aria-label="Inspector" className="w-[264px] shrink-0 overflow-y-auto border-l border-hairline bg-canvas">
      <AnimatePresence mode="popLayout" initial={false}>
        {zoom && (
          <motion.div key={`zoom-${zoom.id}`} {...panel}>
            <Section title="Zoom">
              <div data-tour="zoom-scale">
                <Slider label="Scale" value={zoom.scale} min={1.2} max={4} step={0.1} format={(v) => `${v.toFixed(1)}×`}
                  onChange={(v) => ed().updateZoom(zoom.id, { scale: v })} {...gesture} />
              </div>
              <Toggle label="Follow cursor" checked={zoom.target === 'follow'}
                onChange={(on) => ed().updateZoom(zoom.id, { target: on ? 'follow' : center })} />
              <Button size="sm" className="mt-1 w-full" data-tour="zoom-pick" aria-pressed={picking} onClick={() => ed().setPicking(!picking)}>
                <Crosshair size={13} aria-hidden /> {picking ? 'Drawing… Esc to cancel' : 'Draw zoom area'}
              </Button>
              <p className="pb-1 text-[11px] leading-relaxed text-muted">
                {zoom.target === 'follow'
                  ? 'The camera follows the cursor. Draw an area to lock the zoom onto a spot instead.'
                  : 'Drag a box on the preview and the zoom will show exactly that area.'}
              </p>
              <Slider label="Ease" value={zoom.easeMs} min={200} max={1500} step={50} format={(v) => `${v}ms`}
                onChange={(v) => ed().updateZoom(zoom.id, { easeMs: v })} {...gesture} />
              <Button size="sm" variant="ghost" className="mt-1 w-full" onClick={() => ed().deleteSelection()}>
                <Trash2 size={13} aria-hidden /> Delete zoom
              </Button>
            </Section>
          </motion.div>
        )}
        {clip && (
          <motion.div key={`clip-${clip.id}`} {...panel}>
            <Section title="Clip">
              <div className="py-2">
                <span className="mb-2 block text-[12px] text-secondary">Speed</span>
                <Segmented label="Speed" options={SPEEDS} value={clip.speed as (typeof SPEEDS)[number]['value']}
                  onChange={(v) => ed().setClipSpeed(clip.id, v)} />
              </div>
              {clipCount > 1 && (
                <Button size="sm" variant="ghost" className="mt-1 w-full" onClick={() => ed().deleteSelection()}>
                  <Trash2 size={13} aria-hidden /> Delete clip
                </Button>
              )}
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      <Section title="Background" tour="background">
        <BackgroundPicker />
        <Slider label="Padding" value={background.padding} min={0} max={160} onChange={(v) => ed().setBackground({ padding: v })} {...gesture} />
        <Slider label="Corner radius" value={background.radius} min={0} max={40} onChange={(v) => ed().setBackground({ radius: v })} {...gesture} />
        <Slider label="Shadow" value={background.shadow} min={0} max={1} step={0.05} format={percent}
          onChange={(v) => ed().setBackground({ shadow: v })} {...gesture} />
      </Section>

      <Section title="Cursor" tour="cursor">
        <Toggle label="Show cursor" checked={cursor.visible} onChange={(v) => ed().setCursor({ visible: v })} />
        <div className="py-2">
          <span className="mb-2 block text-[12px] text-secondary">Size</span>
          <Segmented label="Cursor size" options={CURSOR_SIZES} value={cursor.size} onChange={(v) => ed().setCursor({ size: v })} />
        </div>
        <Slider label="Smoothing" value={cursor.smoothing} min={0} max={1} step={0.05} format={percent}
          onChange={(v) => ed().setCursor({ smoothing: v })} {...gesture} />
        <Toggle label="Click ripple" checked={cursor.clickRipple} onChange={(v) => ed().setCursor({ clickRipple: v })} />
        <Toggle label="Hide when idle" checked={cursor.hideWhenIdleMs !== null}
          onChange={(v) => ed().setCursor({ hideWhenIdleMs: v ? 2000 : null })} />
      </Section>
    </aside>
  );
}
