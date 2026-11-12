'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useEditor } from './EditorContext';
import { buildFilmstrip, type Filmstrip } from './filmstrip';

/** Sprite frames are drawn at 2× the lane height so they stay sharp on retina screens. */
export const CLIP_LANE_H = 44;

const FilmstripContext = createContext<Filmstrip | null>(null);

export function FilmstripProvider({ videoUrl, children }: { videoUrl: string; children: ReactNode }) {
  const recording = useEditor((s) => s.recording);
  const [strip, setStrip] = useState<Filmstrip | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let made: Filmstrip | null = null;
    buildFilmstrip(videoUrl, {
      durationMs: recording.durationMs,
      viewportW: recording.viewport.w,
      crop: recording.crop,
      frameH: CLIP_LANE_H * 2,
      signal: ac.signal,
    })
      .then((s) => {
        made = s;
        if (!s && !ac.signal.aborted) console.warn('Timeline frames unavailable: video could not be decoded');
        if (!ac.signal.aborted) setStrip(s);
        else if (s) URL.revokeObjectURL(s.url);
      })
      // No frames is fine: clips fall back to solid blocks.
      .catch((e) => console.warn('Timeline frames unavailable:', e));
    return () => {
      ac.abort();
      if (made) URL.revokeObjectURL(made.url);
      setStrip(null);
    };
  }, [videoUrl, recording]);

  return <FilmstripContext.Provider value={strip}>{children}</FilmstripContext.Provider>;
}

export const useFilmstrip = () => useContext(FilmstripContext);
