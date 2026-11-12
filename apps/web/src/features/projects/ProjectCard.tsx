'use client';
import type { Recording } from '@buffer-clip/core';
import { Pencil, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { spring } from '@/design/motion';
import { cn } from '@/lib/cn';
import { formatDate, formatDuration } from '@/lib/format';
import { TourReadyTip } from './TourReadyTip';

export interface ProjectCardProps {
  recording: Recording;
  thumbUrl: string | null;
  index: number;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  loadPreview?: (id: string) => Promise<string | null>;
  showTourTip?: boolean;
  onDismissTip?: () => void;
}

const swap = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: spring.snappy,
};

export function ProjectCard({ recording, thumbUrl, index, onRename, onDelete, loadPreview, showTourTip, onDismissTip }: ProjectCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState(recording.name);
  // One-shot guard: Enter/Escape unmount the input, which also fires blur.
  const editActive = useRef(false);

  const onEnter = () => {
    setHovered(true);
    if (loadPreview && !previewUrl) void loadPreview(recording.id).then(setPreviewUrl);
  };

  const startEdit = () => {
    editActive.current = true;
    setDraft(recording.name);
    setEditing(true);
  };

  const commit = () => {
    if (!editActive.current) return;
    editActive.current = false;
    setEditing(false);
    const name = draft.trim();
    if (name && name !== recording.name) onRename(recording.id, name);
    else setDraft(recording.name);
  };

  const cancel = () => {
    editActive.current = false;
    setDraft(recording.name);
    setEditing(false);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ ...spring.soft, delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      onMouseEnter={onEnter}
      onMouseLeave={() => setHovered(false)}
      className="group relative"
    >
      <Link
        href={`/editor/${recording.id}`}
        aria-label={`Open ${recording.name}`}
        className="block overflow-hidden rounded-card bg-surface shadow-card transition-shadow duration-300 ease-(--ease-mac) group-hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <div className="relative aspect-video">
          {thumbUrl && <img src={thumbUrl} alt="" className="absolute inset-0 size-full object-cover" />}
          {previewUrl && (
            <video
              src={previewUrl}
              muted
              loop
              playsInline
              autoPlay
              className={cn(
                'absolute inset-0 size-full object-cover transition-opacity duration-300 ease-(--ease-mac)',
                hovered ? 'opacity-100' : 'opacity-0',
              )}
            />
          )}
          <span className="tabular absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
            {formatDuration(recording.durationMs)}
          </span>
          {recording.tutorial && (
            <span className="absolute left-2 top-2 rounded-md bg-paper/90 px-1.5 py-0.5 text-[11px] font-medium text-ink shadow-card backdrop-blur">
              Tutorial
            </span>
          )}
        </div>
      </Link>

      <div className="mt-3 flex min-h-9 items-start justify-between gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              aria-label="Recording name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') cancel();
              }}
              className="w-full rounded-md bg-surface px-1.5 py-0.5 text-[13px] font-medium outline-none ring-1 ring-hairline focus:ring-ink"
            />
          ) : (
            <p className="truncate text-[13px] font-medium">{recording.name}</p>
          )}
          <p className="mt-0.5 text-[12px] text-secondary">{formatDate(recording.createdAt, Date.now())}</p>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {confirming ? (
            <motion.div key="confirm" {...swap} className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={() => onDelete(recording.id)}>
                Delete recording
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              {...swap}
              className="flex gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100"
            >
              <Button size="sm" variant="ghost" aria-label="Rename" onClick={startEdit}>
                <Pencil size={14} aria-hidden />
              </Button>
              <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => setConfirming(true)}>
                <Trash2 size={14} aria-hidden />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {showTourTip && (
        <>
          <span aria-hidden className="pointer-events-none absolute -inset-1.5 rounded-[16px] ring-2 ring-ink/70 motion-safe:animate-pulse" />
          <TourReadyTip href={`/editor/${recording.id}`} onDismiss={() => onDismissTip?.()} />
        </>
      )}
    </motion.article>
  );
}
