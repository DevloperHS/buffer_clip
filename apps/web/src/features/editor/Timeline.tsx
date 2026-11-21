'use client';
import { outputDuration, type Ms } from '@buffer-clip/core';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, type PointerEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { spring } from '@/design/motion';
import { formatDuration, formatTimecode } from '@/lib/format';
import { ClipsTrack } from './ClipsTrack';
import { startDrag } from './drag';
import { useEditor, usePlayback, useStores } from './EditorContext';
import { pct, pxToMs, ticks } from './timeline-geometry';
import { ClicksTrack, ZoomsTrack } from './ZoomsTrack';

function Transport({ total }: { total: Ms }) {
  const { playback } = useStores();
  const playing = usePlayback((s) => s.playing);
  const outT = usePlayback((s) => s.outT);
  const duration = useEditor((s) => s.recording.durationMs);
  const saved = Math.max(0, duration - total);
  const hasAudio = useEditor((s) => s.recording.hasAudio);
  const muted = usePlayback((s) => s.muted);
  return (
    <div className="flex items-center gap-3 px-3 pt-2">
      <Button size="sm" variant="ghost" aria-label={playing ? 'Pause' : 'Play'} data-tour="transport-play" onClick={() => playback.getState().toggle()}>
        {playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
      </Button>
      <span data-testid="timecode" className="tabular text-[12px] text-ink">
        {formatTimecode(outT)} <span className="text-muted">/ {formatTimecode(total)}</span>
      </span>
      <span className="flex-1" />
      {hasAudio ? (
        <Button size="sm" variant="ghost" aria-label={muted ? 'Unmute preview' : 'Mute preview'} aria-pressed={muted}
          onClick={() => playback.getState().toggleMute()}>
          {muted ? <VolumeX size={14} aria-hidden /> : <Volume2 size={14} aria-hidden />}
        </Button>
      ) : (
        <span className="flex items-center gap-1 text-[11px] text-muted" title="Turn on tab audio or the microphone in the extension before recording">
          <VolumeX size={12} aria-hidden /> No sound recorded
        </span>
      )}
      {saved >= 100 && <span className="text-[11px] text-muted">Idle trimmed · {(saved / 1000).toFixed(1)}s saved</span>}
    </div>
  );
}

function Ruler({ total }: { total: Ms }) {
  return (
    <div data-tour="ruler" className="relative h-5 cursor-pointer" aria-hidden>
      {ticks(total).map((t) => (
        <span key={t} className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${pct(t, total)}%` }}>
          <span className="tabular text-[10px] leading-3 text-muted">{formatDuration(t)}</span>
          <span className="mt-0.5 h-1 w-px bg-hairline" />
        </span>
      ))}
    </div>
  );
}

function Playhead({ total }: { total: Ms }) {
  const outT = usePlayback((s) => s.outT);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 z-20 w-px bg-ink" style={{ left: `${pct(outT, total)}%` }}>
      <span className="absolute -top-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-ink" />
    </div>
  );
}

export function TimelineDock() {
  const { editor, playback } = useStores();
  const lanesRef = useRef<HTMLDivElement>(null);
  const clips = useEditor((s) => s.project.clips);
  const total = outputDuration(clips) || 1;

  const scrubTo = (clientX: number) => {
    const r = lanesRef.current?.getBoundingClientRect();
    if (!r) return;
    playback.getState().seek(pxToMs(clientX - r.left, r.width, total));
  };
  const onLanesPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    editor.getState().select(null);
    scrubTo(e.clientX);
    startDrag(e, { onMove: (_dx, ev) => scrubTo(ev.clientX), onEnd: () => {} });
  };

  return (
    <motion.section
      aria-label="Timeline"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      className="glass mx-3 mb-3 shrink-0 rounded-window border border-hairline shadow-window"
    >
      <Transport total={total} />
      <div className="grid grid-cols-[56px_1fr] gap-x-2 px-3 pb-3 pt-1">
        <div className="flex flex-col gap-1.5 text-[11px] text-muted">
          <span className="h-5" />
          <span className="flex h-11 items-center">Clips</span>
          <span className="flex h-7 items-center">Zooms</span>
          <span className="flex h-3 items-center">Clicks</span>
        </div>
        <div ref={lanesRef} onPointerDown={onLanesPointerDown} className="relative flex select-none flex-col gap-1.5">
          <Ruler total={total} />
          <ClipsTrack lanesRef={lanesRef} />
          <ZoomsTrack lanesRef={lanesRef} />
          <ClicksTrack />
          <Playhead total={total} />
        </div>
      </div>
    </motion.section>
  );
}
