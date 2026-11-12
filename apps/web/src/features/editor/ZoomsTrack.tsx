'use client';
import { outputDuration, outToSrc, type Ms, type Zoom } from '@buffer-clip/core';
import { motion } from 'motion/react';
import { useMemo, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import { spring } from '@/design/motion';
import { cn } from '@/lib/cn';
import { formatTimecode } from '@/lib/format';
import { startDrag } from './drag';
import { useEditor, useStores } from './EditorContext';
import { clickMarks, moveSpan, pct, pxToMs, zoomSpan, type SpanMode } from './timeline-geometry';

const MIN_SPAN_OUT: Ms = 300;

export function ZoomsTrack({ lanesRef }: { lanesRef: RefObject<HTMLDivElement | null> }) {
  const { editor } = useStores();
  const zooms = useEditor((s) => s.project.zooms);
  const clips = useEditor((s) => s.project.clips);
  const selection = useEditor((s) => s.selection);
  const intro = useEditor((s) => s.intro);
  const [draft, setDraft] = useState<{ id: string; start: Ms; end: Ms } | null>(null);
  const total = outputDuration(clips) || 1;

  const drag = (e: PointerEvent<Element>, z: Zoom, mode: SpanMode) => {
    const width = lanesRef.current?.getBoundingClientRect().width ?? 0;
    const base = zoomSpan(z, clips);
    // Neighbours bound the drag so zoom blocks never slide over each other.
    const others = zooms.filter((o) => o.id !== z.id).map((o) => zoomSpan(o, clips));
    const lo = Math.max(0, ...others.filter((o) => o.end <= base.start + 1).map((o) => o.end));
    const hi = Math.min(total, ...others.filter((o) => o.start >= base.end - 1).map((o) => o.start));
    const at = (dx: number) => moveSpan(base, pxToMs(dx, width, total), mode, hi, MIN_SPAN_OUT, lo);
    editor.getState().select({ kind: 'zoom', id: z.id });
    startDrag(e, {
      onMove: (dx) => setDraft({ id: z.id, ...at(dx) }),
      onEnd: (dx, moved) => {
        setDraft(null);
        if (!moved) return;
        const s = at(dx);
        editor.getState().updateZoom(z.id, { start: outToSrc(clips, s.start), end: outToSrc(clips, s.end) });
      },
    });
  };

  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    const r = lanesRef.current?.getBoundingClientRect();
    const outT = r ? pxToMs(e.clientX - r.left, r.width, total) : 0;
    editor.getState().addZoomAt(outToSrc(clips, outT));
  };

  return (
    <div data-testid="zoom-lane" data-tour="zooms-lane" className="relative h-7" onDoubleClick={onDoubleClick}>
      {zooms.map((z, i) => {
        const span = draft?.id === z.id ? draft : zoomSpan(z, clips);
        const selected = selection?.kind === 'zoom' && selection.id === z.id;
        return (
          <motion.div
            key={z.id}
            data-testid="zoom-block"
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`Zoom ${z.scale.toFixed(1)}× at ${formatTimecode(span.start)}`}
            initial={intro ? { opacity: 0, y: 6, scale: 0.9 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spring.soft, delay: intro ? 1.1 + i * 0.07 : 0 }}
            onPointerDown={(e) => drag(e, z, 'move')}
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseEnter={() => editor.getState().setHoverZoom(z.id)}
            onMouseLeave={() => editor.getState().setHoverZoom(null)}
            className={cn(
              'group/zoom absolute inset-y-0 min-w-2 cursor-grab overflow-hidden rounded-[7px] border bg-paper px-2 text-[10px] font-medium leading-[26px] shadow-card transition-colors duration-200 active:cursor-grabbing',
              selected ? 'border-ink text-ink' : 'border-hairline text-secondary hover:text-ink',
            )}
            style={{ left: `${pct(span.start, total)}%`, width: `${pct(span.end - span.start, total)}%` }}
          >
            <span className="pointer-events-none block truncate">
              {z.scale.toFixed(1)}×{z.target === 'follow' ? ' · follow' : ''}
            </span>
            <span aria-hidden onPointerDown={(e) => drag(e, z, 'start')} className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize" />
            <span aria-hidden onPointerDown={(e) => drag(e, z, 'end')} className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize" />
          </motion.div>
        );
      })}
    </div>
  );
}

export function ClicksTrack() {
  const events = useEditor((s) => s.recording.events);
  const clips = useEditor((s) => s.project.clips);
  const total = outputDuration(clips) || 1;
  const marks = useMemo(() => clickMarks(events, clips), [events, clips]);
  return (
    <div aria-hidden className="relative h-3">
      {marks.map((m) => (
        <span key={m.key} data-testid="click-mark"
          className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary"
          style={{ left: `${pct(m.at, total)}%` }} />
      ))}
    </div>
  );
}
