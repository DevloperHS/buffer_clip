'use client';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { spring } from '@/design/motion';

export function TourReadyTip({ href, onDismiss }: { href: string; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [onDismiss]);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label="Guided tour ready"
      initial={{ opacity: 0, y: 8, scale: 0.96, x: '-50%' }}
      animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
      transition={{ ...spring.soft, delay: 0.25 }}
      className="glass absolute left-1/2 top-[calc(100%+12px)] z-30 w-[260px] rounded-[14px] border border-hairline p-4 shadow-window"
    >
      <span aria-hidden className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-l border-t border-hairline bg-canvas" />
      <p className="text-[13px] font-medium tracking-tight">Your guided tour is ready</p>
      <p className="mt-1 text-[12px] leading-relaxed text-secondary">
        Open it to learn the editor by doing. It takes about 3 minutes.
      </p>
      <Link
        href={href}
        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-ink px-3 text-[12px] font-medium text-canvas transition-opacity duration-200 hover:opacity-90"
      >
        Open tutorial
        <ArrowRight size={13} aria-hidden />
      </Link>
    </motion.div>
  );
}
