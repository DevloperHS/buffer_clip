'use client';
import { Monitor, Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { spring } from '@/design/motion';
import { getTheme, nextTheme, setTheme, subscribeTheme, type Theme } from '@/lib/theme';
import { Button } from './Button';

const ICON = { system: Monitor, light: Sun, dark: Moon } as const;
const LABEL: Record<Theme, string> = { system: 'Match system', light: 'Light', dark: 'Dark' };

export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, () => 'system');
}

export function ThemeToggle() {
  const theme = useTheme();
  const Icon = ICON[theme];
  const next = nextTheme(theme);
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={`Appearance: ${LABEL[theme]}. Switch to ${LABEL[next]}`}
      title={`Appearance: ${LABEL[theme]}`}
      onClick={() => setTheme(next)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          className="grid place-items-center"
          initial={{ opacity: 0, rotate: -60, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 60, scale: 0.6 }}
          transition={spring.snappy}
        >
          <Icon size={14} aria-hidden />
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
