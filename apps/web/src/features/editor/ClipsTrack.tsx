'use client';
import { outputDuration, type Clip, type Ms } from '@buffer-clip/core';
import { motion } from 'motion/react';
import { useEffect, useState, type PointerEvent, type RefObject } from 'react';
import { spring } from '@/design/motion';
import { cn } from '@/lib/cn';
import { formatTimecode } from '@/lib/format';
import { startDrag } from './drag';
import { useEditor, useStores } from './EditorContext';
import { clipTiles, type Filmstrip } from './filmstrip';
import { CLIP_LANE_H, useFilmstrip } from './FilmstripContext';
import { clipSpans, draftClipSpan, gapMarks, pct, pxToMs, trimDraft } from './timeline-geometry';

type Draft = { id: string; edge: 'start' | 'end'; srcT: Ms };

/** The clip's frames, tiled across the block like an NLE video track. */
function Frames({ strip, src, widthPx }: { strip: Filmstrip; src: { start: Ms; end: Ms }; widthPx: number }) {
  const tileW = (strip.frameW * CLIP_LANE_H) / strip.frameH;
  const tiles = clipTiles(strip, src, widthPx, tileW);
  return (
    <motion.div
      aria-hidden
      data-testid="clip-frames"
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {tiles.map((t) => (
        <span
          key={t.left}
          className="absolute inset-y-0 border-r border-black/25 bg-no-repeat"
          style={{
            left: t.left,
            width: t.width,
            backgroundImage: `url(${strip.url})`,
            backgroundSize: `${tileW * strip.count}px ${CLIP_LANE_H}px`,
            backgroundPosition: `${-t.frame * tileW}px 0`,
          }}
        />
      ))}
    </motion.div>
  );
}

function useWidth(ref: RefObject<HTMLDivElement | null>): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function Handle({ edge, onPointerDown }: { edge: 'start' | 'end'; onPointerDown: (e: PointerEvent<Element>) => void }) {
  return (
    <span
      aria-hidden
      onPointerDown={onPointerDown}
      className={cn(
        'absolute inset-y-0 z-10 flex w-2.5 cursor-ew-resize items-center justify-center bg-paper/25 opacity-0 transition-opacity duration-150 group-hover/clip:opacity-100',
        edge === 'start' ? 'left-0 rounded-l-[7px]' : 'right-0 rounded-r-[7px]',
      )}
    >
      <span className="h-3.5 w-0.5 rounded-full bg-paper/80" />
    </span>
  );
}

export function ClipsTrack({ lanesRef }: { lanesRef: RefObject<HTMLDivElement | null> }) {
  const { editor } = useStores();
  const clips = useEditor((s) => s.project.clips);
  const duration = useEditor((s) => s.recording.durationMs);
  const selection = useEditor((s) => s.selection);
  const [draft, setDraft] = useState<Draft | null>(null);
  const strip = useFilmstrip();
  const laneW = useWidth(lanesRef);

  const total = outputDuration(clips) || 1;
  const spans = clipSpans(clips);
  const gaps = gapMarks(clips, duration);
  const draftSpan = draft ? draftClipSpan(clips, duration, draft) : null;

  const onEdge = (e: PointerEvent<Element>, clip: Clip, edge: 'start' | 'end') => {
    const width = lanesRef.current?.getBoundingClientRect().width ?? 0;
    const srcAt = (dx: number) => trimDraft(clip, edge, pxToMs(dx, width, total));
    editor.getState().select({ kind: 'clip', id: clip.id });
    startDrag(e, {
      onMove: (dx) => setDraft({ id: clip.id, edge, srcT: srcAt(dx) }),
      onEnd: (dx, moved) => {
        setDraft(null);
        if (moved) editor.getState().trimClip(clip.id, edge, srcAt(dx));
      },
    });
  };

  return (
    <div data-tour="clips-lane" className="relative h-11">
      {draft && spans.filter(({ clip }) => clip.id === draft.id).map(({ clip, start, end }) => (
        // Ghost of the clip's committed extent, so the trimmed-away part stays visible while dragging.
        <div
          key={`ghost-${clip.id}`}
          aria-hidden
          className="absolute inset-y-0 rounded-[7px] border border-dashed border-ink/40 bg-ink/10"
          style={{ left: `${pct(start, total)}%`, width: `${pct(end - start, total)}%` }}
        />
      ))}

      {spans.map(({ clip, start, end }) => {
        const selected = selection?.kind === 'clip' && selection.id === clip.id;
        const fast = clip.speed !== 1;
        const dragging = draft?.id === clip.id && draftSpan;
        const shown = dragging ? draftSpan : { start, end };
        const src = dragging
          ? draft.edge === 'start' ? { start: draft.srcT, end: clip.srcEnd } : { start: clip.srcStart, end: draft.srcT }
          : { start: clip.srcStart, end: clip.srcEnd };
        return (
          <motion.div
            key={clip.id}
            layout={!draft}
            transition={spring.soft}
            data-testid="clip-block"
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`Clip ${formatTimecode(start)} to ${formatTimecode(end)}${fast ? `, ${clip.speed}× speed` : ''}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              editor.getState().select({ kind: 'clip', id: clip.id });
            }}
            className={cn(
              'group/clip absolute inset-y-0 overflow-hidden rounded-[7px] transition-shadow duration-200',
              fast ? 'bg-muted/70' : 'bg-ink',
              selected && 'ring-2 ring-ink ring-offset-2 ring-offset-canvas',
              strip && 'bg-black',
            )}
            style={{ left: `${pct(shown.start, total)}%`, width: `${pct(shown.end - shown.start, total)}%` }}
          >
            {strip && laneW > 0 && (
              <Frames strip={strip} src={src} widthPx={(pct(shown.end - shown.start, total) / 100) * laneW} />
            )}
            {/* Sped-up idle clips read as dimmed footage; a hairline keeps adjacent clips apart. */}
            {strip && fast && <span aria-hidden className="pointer-events-none absolute inset-0 bg-canvas/55" />}
            {strip && <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[7px] ring-1 ring-inset ring-white/15" />}
            <Handle edge="start" onPointerDown={(e) => onEdge(e, clip, 'start')} />
            <Handle edge="end" onPointerDown={(e) => onEdge(e, clip, 'end')} />
          </motion.div>
        );
      })}

      {!draft &&
        spans
          .filter(({ clip }) => clip.idle)
          .map(({ clip, start }) => (
            <button
              key={`idle-${clip.id}`}
              type="button"
              aria-label={clip.speed !== 1 ? 'Idle sped up, click to keep at normal speed' : 'Idle kept, click to cut'}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => editor.getState().cycleIdleClip(clip.id)}
              className="absolute top-1.5 z-20 ml-3 rounded-[5px] bg-paper/90 px-1 text-[10px] font-medium leading-4 text-ink shadow-card transition-transform hover:scale-105"
              style={{ left: `${pct(start, total)}%` }}
            >
              {clip.speed !== 1 ? `${clip.speed}×` : 'Keep'}
            </button>
          ))}

      {!draft &&
        gaps.map(({ gap, at }) => (
          <button
            key={`gap-${gap.srcStart}`}
            type="button"
            aria-label={`Idle gap ${((gap.srcEnd - gap.srcStart) / 1000).toFixed(1)}s cut, click to speed up`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => editor.getState().fillGap(gap)}
            // Sits above the lane so it never covers the trim handles at a cut.
            className="absolute -top-2 z-20 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-dashed border-secondary bg-canvas transition-transform duration-200 ease-(--ease-mac) hover:scale-125"
            style={{ left: `${pct(at, total)}%` }}
          />
        ))}
    </div>
  );
}
