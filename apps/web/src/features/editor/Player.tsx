'use client';
import {
  buildCursorTrack, cameraFor, clamp01, contentFrame, easeInOutCubic, frameRect, outputDuration, outputSize,
  outToSrc, renderFrame, resolvePlayback, screenToFrame, type Point, type Project, type Rect,
} from '@buffer-clip/core';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { spring } from '@/design/motion';
import { prepareVideo } from '@/lib/video';
import { useEditor, useStores } from './EditorContext';
import { boxToZoom, fitInside, lockedBox, toCanvasPoint, withIntro, zoomGhostRect } from './preview-math';

const INTRO_DELAY_MS = 200;
const INTRO_MS = 1200;
const unzoomed = (p: Project): Project => ({ ...p, zooms: [] });
/** Smaller than this on screen counts as a click, not a box. */
const MIN_BOX_PX = 12;

export function Player({ videoUrl }: { videoUrl: string }) {
  const { editor, playback } = useStores();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mountedAt = useRef(0);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [drawing, setDrawing] = useState<{ a: Point; b: Point } | null>(null);
  // The anchor lives in a ref too, so a fast drag never reads a stale render.
  const anchor = useRef<Point | null>(null);

  const recording = useEditor((s) => s.recording);
  const output = useEditor((s) => s.project.output);
  const picking = useEditor((s) => s.picking);
  const hoverZoomId = useEditor((s) => s.hoverZoomId);
  const exportProgress = useEditor((s) => s.exportProgress);
  const pickingZoomId = useEditor((s) => (s.picking && s.selection?.kind === 'zoom' ? s.selection.id : null));
  const project = useEditor((s) => s.project);
  const size = outputSize(output);
  const track = useMemo(() => buildCursorTrack(recording.events), [recording.events]);
  const fit = fitInside(box, size.w / size.h);
  const hasStage = fit.w > 0; // the canvas only mounts once the stage has been measured

  // Measure the stage so the preview can morph smoothly between aspect ratios.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Make the recorded WebM seekable, then show the frame under the playhead.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let alive = true;
    prepareVideo(video)
      .then(() => {
        if (!alive) return;
        video.currentTime = outToSrc(editor.getState().project.clips, playback.getState().outT) / 1000;
        setReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [editor, playback, videoUrl]);

  // Seeks, play/pause and clip edits drive the video element.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => {
      video.currentTime = outToSrc(editor.getState().project.clips, playback.getState().outT) / 1000;
    };
    const offPlayback = playback.subscribe((s, prev) => {
      if (s.seekId !== prev.seekId) sync();
      if (s.playing === prev.playing) return;
      if (s.playing) {
        const total = outputDuration(editor.getState().project.clips);
        if (s.outT >= total - 50) playback.getState().seek(0);
        else sync();
        video.play().catch(() => playback.getState().pause());
      } else {
        video.pause();
      }
    });
    const offEditor = editor.subscribe((s, prev) => {
      if (s.project.clips !== prev.project.clips && !playback.getState().playing) sync();
    });
    return () => {
      offPlayback();
      offEditor();
    };
  }, [editor, playback]);

  // Render loop: while playing, the video is the clock.
  useEffect(() => {
    const video = videoRef.current;
    const ctx = canvasRef.current?.getContext('2d');
    if (!video || !ctx) return;
    if (!mountedAt.current) mountedAt.current = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const { project: p, intro, picking: drawingArea } = editor.getState();
      const pb = playback.getState();
      if (pb.playing && ready && !video.seeking) {
        const pos = resolvePlayback(p.clips, video.currentTime * 1000);
        if (!pos) {
          video.pause();
          playback.setState({ playing: false, outT: outputDuration(p.clips) });
        } else {
          if (pos.jumped) video.currentTime = pos.srcT / 1000;
          const speed = p.clips[pos.clipIndex].speed;
          if (video.playbackRate !== speed) video.playbackRate = speed;
          pb.tick(pos.outT);
        }
      }
      const k = intro ? easeInOutCubic(clamp01((now - mountedAt.current - INTRO_DELAY_MS) / INTRO_MS)) : 1;
      renderFrame(ctx, {
        // While drawing a zoom area, show the whole recording so the box is drawn on what it will zoom into.
        project: withIntro(drawingArea ? unzoomed(p) : p, k),
        recording,
        track,
        outT: playback.getState().outT,
        source: ready ? video : null,
        sourceSize: { w: video.videoWidth || recording.viewport.w, h: video.videoHeight || recording.viewport.h },
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [editor, playback, recording, track, ready, hasStage]);

  // Drawing a zoom area: drag a frame-shaped box; a plain click just re-aims the zoom.
  const rectNow = frameRect(project, recording);
  const aspect = rectNow.w / rectNow.h;
  const isBox = (r: Rect) => r.w * (fit.w / size.w) >= MIN_BOX_PX;
  const toPt = (e: PointerEvent<HTMLElement>) => toCanvasPoint(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect(), size);
  const onPickDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toPt(e);
    anchor.current = p;
    setDrawing({ a: p, b: p });
  };
  const onPickMove = (e: PointerEvent<HTMLDivElement>) => {
    const a = anchor.current;
    if (a) setDrawing({ a, b: toPt(e) });
  };
  const onPickUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = editor.getState();
    const a = anchor.current;
    anchor.current = null;
    setDrawing(null);
    if (!a || s.selection?.kind !== 'zoom') return;
    const b = toPt(e);
    const srcT = outToSrc(s.project.clips, playback.getState().outT);
    const rect = frameRect(s.project, recording);
    const frame = contentFrame(recording);
    const cam = cameraFor(unzoomed(s.project), recording, track, srcT);
    const drawn = lockedBox(a, b, aspect);
    if (isBox(drawn)) {
      s.updateZoom(s.selection.id, boxToZoom(drawn, rect, frame, cam));
    } else {
      const f = screenToFrame(b, rect, frame, cam);
      s.updateZoom(s.selection.id, { target: { x: Math.round(f.x), y: Math.round(f.y) } });
    }
    s.setPicking(false);
  };
  const live = drawing ? lockedBox(drawing.a, drawing.b, aspect) : null;
  const liveScale =
    live && isBox(live)
      ? boxToZoom(live, rectNow, contentFrame(recording), cameraFor(unzoomed(project), recording, track, 0)).scale
      : null;
  const pct = (r: Rect) => ({
    left: `${(r.x / size.w) * 100}%`,
    top: `${(r.y / size.h) * 100}%`,
    width: `${(r.w / size.w) * 100}%`,
    height: `${(r.h / size.h) * 100}%`,
  });

  const ghostId = hoverZoomId ?? pickingZoomId;
  const hovered = ghostId ? project.zooms.find((z) => z.id === ghostId) : undefined;
  const ghost = hovered && !drawing
    ? zoomGhostRect(picking ? unzoomed(project) : project, recording, track, hovered, outToSrc(project.clips, playback.getState().outT))
    : null;

  return (
    <div ref={stageRef} className="relative grid min-h-0 flex-1 place-items-center p-8">
      {hasStage && (
        <motion.div
          initial={false}
          animate={{ width: fit.w, height: fit.h }}
          transition={spring.soft}
          className="relative"
        >
          <canvas
            ref={canvasRef}
            width={size.w}
            height={size.h}
            data-testid="preview-canvas"
            data-ready={ready}
            className="block size-full rounded-window shadow-window"
          />
          {ghost && (
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute rounded-[6px] border-2 border-ink/80 bg-ink/5"
              style={pct(ghost)}
            />
          )}
          {picking && (
            <div
              data-testid="zoom-draw-layer"
              onPointerDown={onPickDown}
              onPointerMove={onPickMove}
              onPointerUp={onPickUp}
              className="absolute inset-0 cursor-crosshair touch-none select-none overflow-hidden rounded-window"
            >
              {/* Dim everything but the box being drawn, like a screenshot crop. */}
              {live && liveScale !== null ? (
                <div
                  aria-hidden
                  data-testid="zoom-draw-box"
                  className="pointer-events-none absolute rounded-[4px] border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                  style={pct(live)}
                >
                  <span className="tabular absolute left-1 top-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-canvas shadow-card">
                    {liveScale.toFixed(1)}×
                  </span>
                </div>
              ) : (
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/25" />
              )}
              {!drawing && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring.snappy}
                  className="glass pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full border border-hairline px-3 py-1 text-[12px] text-ink shadow-card"
                >
                  Drag a box around what the zoom should show · Click to just re-aim · Esc to cancel
                </motion.div>
              )}
            </div>
          )}
          {exportProgress !== null && (
            <div aria-hidden className="absolute inset-x-6 -bottom-4 h-0.5 overflow-hidden rounded-full bg-hairline">
              <motion.div className="h-full rounded-full bg-ink" animate={{ width: `${exportProgress * 100}%` }} transition={spring.soft} />
            </div>
          )}
        </motion.div>
      )}
      <video ref={videoRef} src={videoUrl} muted playsInline preload="auto" className="hidden" />
    </div>
  );
}
