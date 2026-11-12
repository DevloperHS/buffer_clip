export type Theme = 'system' | 'light' | 'dark';

export const THEME_KEY = 'buffer-clip:theme';
export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];
const EVENT = 'buffer-clip:theme';

const isTheme = (v: unknown): v is Theme => typeof v === 'string' && (THEMES as readonly string[]).includes(v);

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isTheme(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

/** `system` leaves the attribute off so the prefers-color-scheme media query decides. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function setTheme(theme: Theme) {
  try {
    if (theme === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this page view.
  }
  const flip = () => {
    applyTheme(theme);
    window.dispatchEvent(new Event(EVENT));
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (doc.startViewTransition && !reduce) doc.startViewTransition(flip);
  else flip();
}

export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
}

export function subscribeTheme(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

/** Runs before first paint (inlined in <head>) so a saved theme never flashes the other one. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
