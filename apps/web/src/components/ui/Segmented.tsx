'use client';
import { motion } from 'motion/react';
import { useId } from 'react';
import { spring } from '@/design/motion';
import { cn } from '@/lib/cn';

export interface SegmentedProps<T extends string | number> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string | number>({ label, options, value, onChange }: SegmentedProps<T>) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[9px] bg-surface p-0.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex-1 rounded-[7px] px-2.5 py-1 text-[12px] font-medium transition-colors duration-200',
              on ? 'text-ink' : 'text-secondary hover:text-ink',
            )}
          >
            {on && (
              <motion.span layoutId={`seg-${id}`} transition={spring.snappy} className="absolute inset-0 rounded-[7px] bg-paper shadow-card" />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
