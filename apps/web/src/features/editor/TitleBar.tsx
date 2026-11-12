'use client';
import type { Aspect } from '@buffer-clip/core';
import { Command as CommandIcon, Download, Redo2, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { TrafficLights } from '@/components/ui/TrafficLights';
import { cn } from '@/lib/cn';
import { useEditor, useHistory, useStores } from './EditorContext';

const ASPECTS: ReadonlyArray<{ value: Aspect; label: string }> = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
];

export function TitleBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { editor } = useStores();
  const name = useEditor((s) => s.recording.name);
  const aspect = useEditor((s) => s.project.output.aspect);
  const { canUndo, canRedo } = useHistory();

  return (
    <header className="glass relative z-20 flex h-12 shrink-0 items-center gap-4 border-b border-hairline px-4">
      <TrafficLights />
      <nav className="flex min-w-0 items-center gap-2 text-[12px]">
        <Link href="/" className="text-secondary transition-colors duration-200 hover:text-ink">Projects</Link>
        <span className="text-muted">/</span>
        <span className="truncate font-medium">{name}</span>
      </nav>
      <div data-tour="aspect" className="absolute left-1/2 w-[200px] -translate-x-1/2">
        <Segmented label="Aspect ratio" options={ASPECTS} value={aspect} onChange={(a) => editor.getState().setOutput({ aspect: a })} />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Button size="sm" variant="ghost" aria-label="Undo" data-tour="undo" onClick={() => editor.temporal.getState().undo()} className={cn(!canUndo && 'opacity-40')}>
          <Undo2 size={14} aria-hidden />
        </Button>
        <Button size="sm" variant="ghost" aria-label="Redo" onClick={() => editor.temporal.getState().redo()} className={cn(!canRedo && 'opacity-40')}>
          <Redo2 size={14} aria-hidden />
        </Button>
        <Button size="sm" aria-label="Open command palette" data-tour="actions" onClick={onOpenPalette}>
          <CommandIcon size={13} aria-hidden />
          <span>Actions</span>
        </Button>
        <Button size="sm" variant="primary" aria-label="Export" data-tour="export" onClick={() => editor.getState().setExportOpen(true)}>
          <Download size={13} aria-hidden />
          <span>Export</span>
        </Button>
      </div>
    </header>
  );
}
