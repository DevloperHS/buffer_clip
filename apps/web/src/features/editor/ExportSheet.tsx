'use client';
import { outputDuration, outputSize, type OutputSettings } from '@buffer-clip/core';
import { Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { spring } from '@/design/motion';
import { downloadBlob } from '@/lib/export/download';
import { estimateBytes, exportErrorMessage, exportFileName, formatBytes, type ExportErrorCode } from '@/lib/export/export-plan';
import { ExportError, exportMp4 } from '@/lib/export/exportMp4';
import { formatTimecode } from '@/lib/format';
import { getVideo } from '@/lib/storage';
import { useEditor, useStores } from './EditorContext';

type Phase =
  | { kind: 'idle' }
  | { kind: 'exporting'; progress: number }
  | { kind: 'done'; blob: Blob; fileName: string }
  | { kind: 'error'; code: ExportErrorCode; message: string };

const RESOLUTIONS: ReadonlyArray<{ value: OutputSettings['height']; label: string }> = [
  { value: 1080, label: '1080p' },
  { value: 2160, label: '4K' },
];
const FRAME_RATES: ReadonlyArray<{ value: OutputSettings['fps']; label: string }> = [
  { value: 30, label: '30 fps' },
  { value: 60, label: '60 fps' },
];

export function ExportSheet() {
  const { editor } = useStores();
  const open = useEditor((s) => s.exportOpen);
  const output = useEditor((s) => s.project.output);
  const project = useEditor((s) => s.project);
  const recording = useEditor((s) => s.recording);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const size = outputSize(output);
  const total = outputDuration(project.clips);
  const estimate = formatBytes(estimateBytes(project, recording.hasAudio));
  const busy = phase.kind === 'exporting';

  const close = () => {
    if (busy) return;
    setPhase({ kind: 'idle' });
    editor.getState().setExportOpen(false);
  };

  const start = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    let shown = -1;
    const report = (p: number) => {
      const pct = Math.floor(p * 100);
      if (pct === shown) return;
      shown = pct;
      setPhase({ kind: 'exporting', progress: p });
      editor.setState({ exportProgress: p });
    };
    report(0);
    try {
      const video = await getVideo(recording.id);
      if (!video) throw new ExportError('decode');
      const blob = await exportMp4({ project: editor.getState().project, recording, video, signal: controller.signal, onProgress: report });
      const fileName = exportFileName(recording.name);
      downloadBlob(blob, fileName);
      setPhase({ kind: 'done', blob, fileName });
    } catch (e) {
      const code: ExportErrorCode = e instanceof ExportError ? e.code : 'failed';
      setPhase(code === 'cancelled' ? { kind: 'idle' } : { kind: 'error', code, message: exportErrorMessage(code) });
    } finally {
      editor.setState({ exportProgress: null });
      abortRef.current = null;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Export"
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={spring.snappy}
          className="glass absolute right-3 top-14 z-30 w-[320px] origin-top-right rounded-window border border-hairline p-4 shadow-window"
        >
          <h2 className="text-[14px] font-medium tracking-tight">Export MP4</h2>

          {phase.kind === 'idle' && (
            <>
              <div className="mt-4 space-y-3">
                <div>
                  <span className="mb-1.5 block text-[12px] text-secondary">Resolution</span>
                  <Segmented label="Resolution" options={RESOLUTIONS} value={output.height}
                    onChange={(height) => editor.getState().setOutput({ height })} />
                </div>
                <div>
                  <span className="mb-1.5 block text-[12px] text-secondary">Frame rate</span>
                  <Segmented label="Frame rate" options={FRAME_RATES} value={output.fps}
                    onChange={(fps) => editor.getState().setOutput({ fps })} />
                </div>
              </div>
              <p className="tabular mt-4 text-[12px] text-secondary">
                {size.w}×{size.h} · {formatTimecode(total)} · ≈ {estimate}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={close}>Cancel</Button>
                <Button size="sm" variant="primary" onClick={start}>Export MP4</Button>
              </div>
            </>
          )}

          {phase.kind === 'exporting' && (
            <div className="mt-4">
              <p className="tabular text-[12px] text-ink">Exporting… {Math.floor(phase.progress * 100)}%</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-hairline">
                <motion.div className="h-full rounded-full bg-ink" animate={{ width: `${phase.progress * 100}%` }} transition={spring.soft} />
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="sm" variant="ghost" aria-label="Cancel export" onClick={() => abortRef.current?.abort()}>Cancel</Button>
              </div>
            </div>
          )}

          {phase.kind === 'done' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="mt-4">
              <div className="flex items-center gap-2.5">
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={spring.snappy}
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-canvas"
                >
                  <Check size={14} aria-hidden />
                </motion.span>
                <p className="min-w-0 truncate text-[13px]">Saved {phase.fileName}</p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => downloadBlob(phase.blob, phase.fileName)}>Download again</Button>
                <Button size="sm" variant="primary" onClick={close}>Done</Button>
              </div>
            </motion.div>
          )}

          {phase.kind === 'error' && (
            <div className="mt-4">
              <p role="alert" className="text-[13px] text-secondary">{phase.message}</p>
              <div className="mt-4 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={close}>Close</Button>
                {phase.code === 'codec' && output.height === 2160 ? (
                  <Button size="sm" variant="primary" onClick={() => {
                    editor.getState().setOutput({ height: 1080 });
                    setPhase({ kind: 'idle' });
                  }}>Use 1080p</Button>
                ) : (
                  <Button size="sm" variant="primary" onClick={() => setPhase({ kind: 'idle' })}>Try again</Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
