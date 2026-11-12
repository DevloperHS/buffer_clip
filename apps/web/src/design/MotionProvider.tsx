'use client';
import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { spring } from './motion';

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={spring.soft}>
      {children}
    </MotionConfig>
  );
}
