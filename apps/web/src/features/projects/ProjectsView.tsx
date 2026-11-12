'use client';
import type { Recording } from '@buffer-clip/core';
import { Video } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { spring } from '@/design/motion';
import { ProjectCard } from './ProjectCard';

export interface ProjectItem {
  recording: Recording;
  thumbUrl: string | null;
}

export interface ProjectsViewProps {
  items: ProjectItem[];
  loading: boolean;
  demoProgress: number | null;
  error: string | null;
  unsupported: boolean;
  onCreateDemo: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  loadPreview?: (id: string) => Promise<string | null>;
  newTutorialId?: string | null;
  onDismissTip?: () => void;
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-6 place-items-center rounded-[7px] bg-ink">
        <span className="size-2 rounded-full bg-canvas" />
      </span>
      <span className="text-[14px] font-medium tracking-tight">Buffer Clip</span>
    </div>
  );
}

export function ProjectsView(p: ProjectsViewProps) {
  const creating = p.demoProgress !== null;
  const progressLabel = `Generating… ${Math.round((p.demoProgress ?? 0) * 100)}%`;

  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-10 border-b border-hairline">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Wordmark />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button onClick={p.onCreateDemo} disabled={creating}>
              {creating ? progressLabel : 'How to use'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {p.unsupported && <Banner>Buffer Clip needs Chrome or Edge.</Banner>}
        {p.error && <Banner role="alert">{p.error}</Banner>}

        <div className="mb-8 flex items-baseline gap-3">
          <h1 className="text-[22px] font-medium tracking-tight">Your recordings</h1>
          {p.items.length > 0 && <span className="tabular text-[13px] text-secondary">{p.items.length}</span>}
        </div>

        {!p.loading && p.items.length === 0 ? (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.soft}
            className="mx-auto mt-16 max-w-md rounded-window bg-paper p-12 text-center shadow-card"
          >
            <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-surface text-ink">
              <Video size={20} aria-hidden />
            </span>
            <h2 className="text-[18px] font-medium tracking-tight">Record your first demo</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-secondary">
              Install the Buffer Clip extension to record a tab, or generate a demo recording to try the editor.
            </p>
            <Button variant="primary" className="mt-6" onClick={p.onCreateDemo} disabled={creating}>
              {creating ? progressLabel : 'How to use'}
            </Button>
          </motion.section>
        ) : (
          <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-6 gap-y-8">
            <AnimatePresence>
              {p.items.map((it, i) => (
                <ProjectCard
                  key={it.recording.id}
                  recording={it.recording}
                  thumbUrl={it.thumbUrl}
                  index={i}
                  onRename={p.onRename}
                  onDelete={p.onDelete}
                  loadPreview={p.loadPreview}
                  showTourTip={it.recording.id === p.newTutorialId}
                  onDismissTip={p.onDismissTip}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}
