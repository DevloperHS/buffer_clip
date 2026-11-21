'use client';
import { backgroundCss, type Background } from '@buffer-clip/core';
import { ChevronDown, Minus, Plus, Shuffle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { Slider } from '@/components/ui/Slider';
import { spring } from '@/design/motion';
import { cn } from '@/lib/cn';
import {
  ABSTRACT, convertStyle, GRADIENTS, MAX_STOPS, MIN_STOPS, sameStyle, shade, SOLIDS, stopsOf, toHex,
  type BgPreset, type BgStyle,
} from './backgrounds';
import { useEditor, useGesture, useStores } from './EditorContext';

const STYLES: ReadonlyArray<{ value: Background['kind']; label: string }> = [
  { value: 'mesh', label: 'Abstract' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'solid', label: 'Solid' },
];
const PRESETS: Record<Background['kind'], ReadonlyArray<BgPreset>> = { mesh: ABSTRACT, gradient: GRADIENTS, solid: SOLIDS };

const OPEN_KEY = 'buffer-clip:bg-customize-open';
const readOpen = () => {
  try {
    return localStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
};
const writeOpen = (open: boolean) => {
  try {
    localStorage.setItem(OPEN_KEY, open ? '1' : '0');
  } catch {
    // Storage blocked: the panel still opens for this visit.
  }
};

export function BackgroundPicker() {
  const { editor } = useStores();
  const gesture = useGesture();
  const background = useEditor((s) => s.project.background);
  const set = (b: Partial<Background>) => editor.getState().setBackground(b);
  const current: BgStyle = { kind: background.kind, value: background.value, angle: background.angle };
  const stops = stopsOf(background);
  const kind = background.kind;
  // The customize panel is collapsed by default; the choice is remembered.
  const [open, setOpen] = useState(readOpen);
  const toggleOpen = () => {
    setOpen((o) => {
      writeOpen(!o);
      return !o;
    });
  };
  const summary = [
    `${stops.length} ${stops.length === 1 ? 'colour' : 'colours'}`,
    kind !== 'solid' ? `${background.angle ?? 135}°` : null,
  ].filter(Boolean).join(' · ');

  const setStop = (i: number, c: string) => set({ value: stops.map((s, j) => (j === i ? c : s)).join(',') });
  const addStop = () => {
    const last = stops[stops.length - 1] ?? '#ffffff';
    set({ value: [...stops, shade(last, stops.length % 2 ? 0.35 : -0.35)].join(',') });
  };
  const removeStop = () => set({ value: stops.slice(0, -1).join(',') });

  return (
    <div className="mt-2 space-y-3">
      <Segmented label="Background style" options={STYLES} value={kind} onChange={(k) => k !== kind && set(convertStyle(current, k))} />

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={kind}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={spring.snappy}
          className="grid grid-cols-6 gap-2"
        >
          {PRESETS[kind].map((p) => {
            const on = sameStyle(current, p.bg);
            return (
              <button
                key={p.name}
                type="button"
                aria-label={p.name}
                aria-pressed={on}
                title={p.name}
                onClick={() => set({ angle: undefined, ...p.bg })}
                className={cn(
                  'aspect-square w-full rounded-[8px] shadow-card transition-transform duration-200 ease-(--ease-mac) hover:scale-110',
                  on && 'ring-2 ring-ink ring-offset-2 ring-offset-canvas',
                )}
                style={{ background: backgroundCss(p.bg) }}
              />
            );
          })}
        </motion.div>
      </AnimatePresence>

      <div className="rounded-[10px] bg-surface">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="bg-customize"
          onClick={toggleOpen}
          className="flex w-full items-center gap-2.5 rounded-[10px] p-2 text-left transition-colors hover:bg-hairline/60"
        >
          {/* Live preview of the current background, gradient direction included. */}
          <span aria-hidden className="h-6 w-10 shrink-0 rounded-[6px] shadow-card" style={{ background: backgroundCss(current) }} />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-medium text-ink">Customize</span>
            <span className="tabular block truncate text-[11px] text-muted">{summary}</span>
          </span>
          <motion.span aria-hidden animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy} className="grid size-6 place-items-center text-secondary">
            <ChevronDown size={14} />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="bg-customize"
              key="customize"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring.snappy}
              className="overflow-hidden"
            >
              <div className="px-2.5 pb-2.5 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1" role="group" aria-label="Colours">
                    {stops.map((c, i) => (
                      <label
                        key={i}
                        title={kind === 'mesh' && i === 0 ? 'Base colour' : `Colour ${i + 1}`}
                        className="relative size-6 cursor-pointer overflow-hidden rounded-full shadow-card ring-1 ring-black/10 transition-transform hover:scale-110"
                        style={{ background: c }}
                      >
                        <input
                          type="color"
                          aria-label={kind === 'mesh' && i === 0 ? 'Base colour' : `Colour ${i + 1}`}
                          value={toHex(c)}
                          onFocus={gesture.onGestureStart}
                          onBlur={gesture.onGestureEnd}
                          onChange={(e) => setStop(i, e.target.value)}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </label>
                    ))}
                    {stops.length < MAX_STOPS[kind] && (
                      <button type="button" aria-label="Add colour" onClick={addStop}
                        className="grid size-6 place-items-center rounded-full border border-dashed border-muted text-muted transition-colors hover:text-ink">
                        <Plus size={11} aria-hidden />
                      </button>
                    )}
                    {stops.length > MIN_STOPS[kind] && (
                      <button type="button" aria-label="Remove colour" onClick={removeStop}
                        className="grid size-6 place-items-center rounded-full text-muted transition-colors hover:text-ink">
                        <Minus size={11} aria-hidden />
                      </button>
                    )}
                  </div>
                  {kind === 'mesh' && (
                    <button type="button" aria-label="Shuffle layout" title="Shuffle layout"
                      onClick={() => set({ angle: Math.round(Math.random() * 360) })}
                      className="grid size-7 shrink-0 place-items-center rounded-[7px] text-secondary transition-colors hover:bg-hairline hover:text-ink">
                      <Shuffle size={13} aria-hidden />
                    </button>
                  )}
                </div>
                {kind !== 'solid' && (
                  <div className="mt-1">
                    <Slider label={kind === 'mesh' ? 'Rotate' : 'Angle'} value={background.angle ?? 135} min={0} max={360} step={5}
                      format={(v) => `${v}°`} onChange={(v) => set({ angle: v })} {...gesture} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
