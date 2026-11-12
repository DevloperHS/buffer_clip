import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, getTheme, nextTheme, setTheme, THEME_KEY } from './theme';

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme', () => {
  it('defaults to following the system', () => {
    expect(getTheme()).toBe('system');
    localStorage.setItem(THEME_KEY, 'neon');
    expect(getTheme()).toBe('system');
  });
  it('saves and applies a chosen theme, and clears it for system', () => {
    setTheme('light');
    expect(getTheme()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    setTheme('system');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
  it('applies to a given root', () => {
    const el = document.createElement('div');
    applyTheme('dark', el);
    expect(el.dataset.theme).toBe('dark');
  });
  it('cycles system → light → dark → system', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
});
