'use client';
import { motion } from 'motion/react';
import { spring } from '@/design/motion';
import { cn } from '@/lib/cn';

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-2 text-[12px]"
    >
      <span className="text-secondary">{label}</span>
      <span className={cn('relative h-[18px] w-[30px] rounded-full transition-colors duration-200', checked ? 'bg-ink' : 'bg-hairline')}>
        <motion.span
          layout
          transition={spring.snappy}
          className={cn('absolute top-[2px] size-[14px] rounded-full bg-paper shadow-card', checked ? 'right-[2px]' : 'left-[2px]')}
        />
      </span>
    </button>
  );
}
