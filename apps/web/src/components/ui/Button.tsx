'use client';
import { motion, type HTMLMotionProps } from 'motion/react';
import { spring } from '@/design/motion';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-canvas hover:opacity-90',
  secondary: 'bg-paper text-ink shadow-card hover:shadow-lift',
  ghost: 'text-secondary hover:bg-surface hover:text-ink',
};

export type ButtonProps = HTMLMotionProps<'button'> & { variant?: Variant; size?: 'sm' | 'md' };

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileHover={rest.disabled ? undefined : { y: -1 }}
      whileTap={rest.disabled ? undefined : { scale: 0.97 }}
      transition={spring.snappy}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-[10px] font-medium',
        'transition-[box-shadow,background-color,color,opacity] duration-200 ease-(--ease-mac)',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        'disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-[12px]' : 'h-9 px-4 text-[13px]',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}
