'use client';
import type { Rect } from '@buffer-clip/core';
import { Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { spring } from '@/design/motion';
import { modKeyLabel } from '../editor/commands';
import { useEditor, useStores } from '../editor/EditorContext';
import { initialTourState, tourReducer, type TourAction, type TourState } from './controller';
import { placeCard } from './placement';
import { clearTourProgress, loadTourProgress, saveTourProgress } from './progress';
import { bodyParts, snapshotFrom, stepCompleted, TOUR_STEPS, type TourSnapshot } from './steps';

const CELEBRATE_MS = 700;
const CARD_W = 280;
const HOLE_PAD = 6;
const DIM = 'rgba(17,17,17,.38)';

function useTargetRect(target: string | null, active: boolean): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useEffect(() => {
    if (!active || !target) {
      setRect(null);
      return;
    }
    let raf = 0;
    let last = '';
    const loop = () => {
      const r = document.querySelector(`[data-tour="${target}"]`)?.getBoundingClientRect();
      const visible = !!r && r.width > 0 && r.height > 0;
      const k = visible ? `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}` : '';
      if (k !== last) {
        last = k;
        setRect(visible ? { x: r.x, y: r.y, w: r.width, h: r.height } : null);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return rect;
}

function Body({ text }: { text: string }) {
  const mod = modKeyLabel() === '⌘' ? '⌘' : 'Ctrl';
  return (
    <>
      {bodyParts(text, mod).map((p, i) =>
        'key' in p ? (
          <kbd key={i} className="mx-0.5 inline-block rounded-[5px] border border-b-2 border-hairline bg-paper px-1.5 font-sans text-[11px] text-ink">
            {p.key}
          </kbd>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export function TourOverlay({ recordingId, startDelayMs }: { recordingId: string; startDelayMs: number }) {
  const stores = useStores();
  const router = useRouter();
  const total = TOUR_STEPS.length;
  const [state, dispatch] = useReducer(
    (s: TourState, a: TourAction) => tourReducer(s, a, total),
    undefined,
    () => initialTourState(loadTourProgress(recordingId), total),
  );
  const [visible, setVisible] = useState(startDelayMs === 0);
  const [cardH, setCardH] = useState(170);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<TourSnapshot | null>(null);
  const restart = useEditor((s) => s.tourRestart);
  const restartSeen = useRef(restart);
  const step = TOUR_STEPS[state.index];
  const showing = visible && (state.status === 'running' || state.status === 'celebrating');
  const rect = useTargetRect(step.target, showing);

  // Start after the magic-open intro.
  useEffect(() => {
    if (startDelayMs === 0) return;
    const t = setTimeout(() => setVisible(true), startDelayMs);
    return () => clearTimeout(t);
  }, [startDelayMs]);

  // Restart from the palette.
  useEffect(() => {
    if (restart === restartSeen.current) return;
    restartSeen.current = restart;
    clearTourProgress(recordingId);
    dispatch({ type: 'restart' });
    setVisible(true);
  }, [restart, recordingId]);

  // Persist progress.
  useEffect(() => {
    if (state.status === 'running' || state.status === 'celebrating') saveTourProgress(recordingId, { step: state.index });
    else saveTourProgress(recordingId, { done: true });
  }, [recordingId, state.index, state.status]);

  // Watch the editor: compare each state with the one just before it.
  useEffect(() => {
    if (!visible || state.status !== 'running') return;
    prevRef.current = snapshotFrom(stores);
    const check = () => {
      const cur = snapshotFrom(stores);
      const prev = prevRef.current ?? cur;
      prevRef.current = cur;
      if (stepCompleted(step, prev, cur)) dispatch({ type: 'completed' });
    };
    const offs = [stores.editor.subscribe(check), stores.playback.subscribe(check), stores.editor.temporal.subscribe(check)];
    return () => offs.forEach((off) => off());
  }, [stores, step, state.status, visible]);

  // Celebrate briefly, then move on.
  useEffect(() => {
    if (state.status !== 'celebrating') return;
    const t = setTimeout(() => dispatch({ type: 'advance' }), CELEBRATE_MS);
    return () => clearTimeout(t);
  }, [state.status, state.index]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [state.index, state.status, showing]);

  if (!visible || state.status === 'closed') return null;

  if (state.status === 'finished') {
    return (
      // Distinct keys: without them React reuses the spotlight element as the finish card, inline styles and all.
      <div key="tour-finish" className="fixed inset-0 z-40 grid place-items-center" style={{ background: DIM }}>
        <motion.div
          role="dialog"
          aria-label="Guided tour"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={spring.soft}
          className="w-[340px] rounded-[16px] bg-paper border border-hairline p-6 text-center shadow-window"
        >
          <span className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-ink text-canvas">
            <Check size={18} aria-hidden />
          </span>
          <h2 className="text-[18px] font-medium tracking-tight">You&apos;re ready</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-secondary">
            You played, trimmed, split, zoomed, styled and exported. Next, record your own tab with the Buffer Clip extension.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="ghost" onClick={() => dispatch({ type: 'close' })}>Keep editing</Button>
            <Button variant="primary" onClick={() => router.push('/')}>Back to projects</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const vp = { w: window.innerWidth, h: window.innerHeight };
  const hole = rect ? { x: rect.x - HOLE_PAD, y: rect.y - HOLE_PAD, w: rect.w + HOLE_PAD * 2, h: rect.h + HOLE_PAD * 2 } : null;
  const pos = placeCard(hole, { w: CARD_W, h: cardH }, vp);

  return (
    <div key="tour-steps" className="pointer-events-none fixed inset-0 z-40">
      {hole ? (
        <motion.div
          aria-hidden
          className="absolute rounded-[12px]"
          initial={false}
          animate={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
          transition={spring.soft}
          style={{ boxShadow: `0 0 0 9999px ${DIM}` }}
        >
          <span className="absolute inset-0 rounded-[12px] ring-2 ring-white motion-safe:animate-pulse" />
        </motion.div>
      ) : (
        <div aria-hidden className="absolute inset-0" style={{ background: DIM }} />
      )}

      <motion.div
        ref={cardRef}
        role="dialog"
        aria-label="Guided tour"
        initial={false}
        animate={{ left: pos.left, top: pos.top }}
        transition={spring.soft}
        className="pointer-events-auto absolute rounded-[14px] bg-paper border border-hairline p-4 shadow-window"
        style={{ width: CARD_W }}
      >
        <div className="flex items-center justify-between text-[11px] text-secondary">
          <span className="tabular">Step <b className="font-medium text-ink">{state.index + 1}</b> of {total}</span>
          <button type="button" onClick={() => dispatch({ type: 'end' })} className="transition-colors hover:text-ink">
            End tour
          </button>
        </div>
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-hairline">
          <motion.div className="h-full rounded-full bg-ink" animate={{ width: `${((state.index + 1) / total) * 100}%` }} transition={spring.soft} />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={spring.snappy}
            className="mt-3"
          >
            <p className="text-[14px] font-medium tracking-tight">{step.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-secondary"><Body text={step.body} /></p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={() => dispatch({ type: 'skip' })} className="text-[11px] text-muted transition-colors hover:text-ink">
            Skip step
          </button>
          {state.status === 'celebrating' ? (
            <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.snappy} className="text-[12px] font-medium text-ink">
              ✓ Nice
            </motion.span>
          ) : (
            <span className="text-[11px] text-secondary">Waiting for you…</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
