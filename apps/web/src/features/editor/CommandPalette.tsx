'use client';
import { Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { spring } from '@/design/motion';
import { cn } from '@/lib/cn';
import { filterCommands, type Command } from './commands';

export function CommandPalette({ open, commands, onClose }: { open: boolean; commands: Command[]; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && <PaletteBody key="palette" commands={commands} onClose={onClose} />}
    </AnimatePresence>
  );
}

function PaletteBody({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const list = useMemo(() => filterCommands(commands, query), [commands, query]);

  const run = (c: Command) => {
    onClose();
    c.run();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = list[active];
      if (c) run(c);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex justify-center bg-black/20 pt-[18vh] backdrop-blur-[2px]"
    >
      <motion.div
        role="dialog"
        aria-label="Command palette"
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={spring.snappy}
        className="glass h-fit w-[min(560px,92vw)] overflow-hidden rounded-window border border-hairline shadow-window"
      >
        <div className="flex items-center gap-2 border-b border-hairline px-4">
          <Search size={15} className="text-muted" aria-hidden />
          <input
            autoFocus
            aria-label="Search actions"
            placeholder="Search actions"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted"
          />
        </div>
        <ul role="listbox" aria-label="Actions" className="max-h-[320px] overflow-y-auto p-1.5">
          {list.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted">No matching actions</li>}
          {list.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(c)}
              className={cn(
                'relative flex cursor-default items-center justify-between rounded-[9px] px-3 py-2 text-[13px]',
                i === active ? 'text-ink' : 'text-secondary',
              )}
            >
              {i === active && (
                <motion.span layoutId="palette-active" transition={spring.snappy} className="absolute inset-0 rounded-[9px] bg-surface" />
              )}
              <span className="relative">{c.label}</span>
              {c.hint && <kbd className="relative font-sans text-[11px] text-muted">{c.hint}</kbd>}
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}
