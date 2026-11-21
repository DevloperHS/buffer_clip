'use client';
import type { Project, Recording } from '@buffer-clip/core';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TrafficLights } from '@/components/ui/TrafficLights';
import { spring } from '@/design/motion';
import { requestFromExtension } from '@/lib/bridge';
import { deleteRecording, getVideo, loadOrCreateProject, saveRecording } from '@/lib/storage';
import { computeMotion } from '@/lib/motion';
import { captureThumbnail } from '@/lib/thumbnail';
import { EditorWorkspace } from './EditorWorkspace';

type State =
  | { status: 'loading' }
  | { status: 'receiving' }
  | { status: 'missing' }
  | { status: 'ready'; recording: Recording; project: Project; created: boolean; videoUrl: string };

export function EditorScreen({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    (async () => {
      let loaded = await loadOrCreateProject(id);
      if (!loaded) {
        if (alive) setState({ status: 'receiving' });
        const received = await requestFromExtension(id);
        if (received) {
          const thumb = await captureThumbnail(received.video);
          const motion = await computeMotion(received.video, received.recording.durationMs).catch(() => null);
          const recording = motion ? { ...received.recording, motion } : received.recording;
          await saveRecording(recording, received.video, thumb);
          received.ack();
          loaded = await loadOrCreateProject(id);
        }
      }
      const video = loaded ? await getVideo(id) : undefined;
      if (!alive) return;
      if (!loaded || !video) {
        setState({ status: 'missing' });
        return;
      }
      url = URL.createObjectURL(video);
      setState({ status: 'ready', ...loaded, videoUrl: url });
    })().catch(() => {
      if (alive) setState({ status: 'missing' });
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  if (state.status === 'ready') {
    return <EditorWorkspace recording={state.recording} project={state.project} created={state.created} videoUrl={state.videoUrl} />;
  }

  const onDelete = async () => {
    await deleteRecording(id);
    router.push('/');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="glass sticky top-0 z-10 flex h-12 items-center gap-4 border-b border-hairline px-4">
        <TrafficLights />
        <Link href="/" className="text-[12px] text-secondary transition-colors duration-200 hover:text-ink">Projects</Link>
      </header>
      <main className="flex flex-1 items-center justify-center p-8">
        {state.status === 'loading' && (
          <div aria-busy="true" className="aspect-video w-full max-w-5xl animate-pulse rounded-window bg-hairline/60">
            <span className="sr-only">Loading recording</span>
          </div>
        )}
        {state.status === 'receiving' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.soft}
            className="flex flex-col items-center gap-4 text-center"
          >
            <span className="relative grid size-12 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-ink/10" />
              <span className="size-3 rounded-full bg-ink" />
            </span>
            <p className="text-[13px] text-secondary">Receiving recording from the extension…</p>
          </motion.div>
        )}
        {state.status === 'missing' && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.soft}
            className="max-w-sm rounded-window bg-paper p-10 text-center shadow-card"
          >
            <h1 className="text-[18px] font-medium tracking-tight">This recording couldn&apos;t be loaded</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-secondary">
              It may have been deleted, or the browser cleared its storage.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="ghost" onClick={onDelete}>Delete</Button>
              <Link
                href="/"
                className="inline-flex h-9 items-center rounded-[10px] bg-ink px-4 text-[13px] font-medium text-canvas transition-opacity duration-200 hover:opacity-90"
              >
                Back to projects
              </Link>
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
}
