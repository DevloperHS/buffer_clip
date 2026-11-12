'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { recordDemo } from '@/features/demo/record-demo';
import {
  deleteRecording, getThumb, getVideo, listRecordings, renameRecording, saveRecording, storageErrorMessage,
} from '@/lib/storage';
import { ProjectsView, type ProjectItem } from './ProjectsView';

export function ProjectsScreen() {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoProgress, setDemoProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [newTutorialId, setNewTutorialId] = useState<string | null>(null);
  const thumbUrls = useRef<string[]>([]);
  const previewUrls = useRef(new Map<string, string>());

  const refresh = useCallback(async () => {
    const recs = await listRecordings();
    const next = await Promise.all(
      recs.map(async (recording) => {
        const thumb = await getThumb(recording.id);
        return { recording, thumbUrl: thumb ? URL.createObjectURL(thumb) : null };
      }),
    );
    thumbUrls.current.forEach((u) => URL.revokeObjectURL(u));
    thumbUrls.current = next.flatMap((i) => (i.thumbUrl ? [i.thumbUrl] : []));
    setItems(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    setUnsupported(!('VideoEncoder' in window));
    refresh().catch((e) => {
      setError(storageErrorMessage(e));
      setLoading(false);
    });
    const thumbs = thumbUrls;
    const previews = previewUrls.current;
    return () => {
      thumbs.current.forEach((u) => URL.revokeObjectURL(u));
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [refresh]);

  const loadPreview = useCallback(async (id: string) => {
    const cached = previewUrls.current.get(id);
    if (cached) return cached;
    const video = await getVideo(id);
    if (!video) return null;
    const url = URL.createObjectURL(video);
    previewUrls.current.set(id, url);
    return url;
  }, []);

  const onCreateDemo = async () => {
    setError(null);
    setDemoProgress(0);
    try {
      const { recording, video, thumb } = await recordDemo(setDemoProgress);
      await saveRecording(recording, video, thumb);
      await refresh();
      setNewTutorialId(recording.id);
    } catch (e) {
      setError(storageErrorMessage(e));
    } finally {
      setDemoProgress(null);
    }
  };

  const onRename = async (id: string, name: string) => {
    await renameRecording(id, name);
    await refresh();
  };

  const onDelete = async (id: string) => {
    await deleteRecording(id);
    setItems((prev) => prev.filter((i) => i.recording.id !== id));
  };

  return (
    <ProjectsView
      items={items}
      loading={loading}
      demoProgress={demoProgress}
      error={error}
      unsupported={unsupported}
      onCreateDemo={onCreateDemo}
      onRename={onRename}
      onDelete={onDelete}
      loadPreview={loadPreview}
      newTutorialId={newTutorialId}
      onDismissTip={() => setNewTutorialId(null)}
    />
  );
}
