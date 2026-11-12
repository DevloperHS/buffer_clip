import type { Transition } from 'motion/react';

export const spring = {
  snappy: { type: 'spring', stiffness: 500, damping: 35 },
  soft: { type: 'spring', stiffness: 200, damping: 26 },
} satisfies Record<string, Transition>;

export const easeMac = [0.22, 1, 0.36, 1] as const;
