import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { MotionProvider } from '@/design/MotionProvider';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Buffer Clip',
  description: 'Turn screen recordings into polished product demos.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <Script id="theme-boot" strategy="beforeInteractive">{THEME_BOOT_SCRIPT}</Script>
      </head>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
