import { describe, expect, it } from 'vitest';
import { formatElapsed } from './format';
import { isRecordable } from './recordable';

describe('isRecordable', () => {
  it('allows regular websites and localhost', () => {
    expect(isRecordable('https://example.com/app')).toBe(true);
    expect(isRecordable('http://localhost:5173/')).toBe(true);
  });
  it('rejects browser and store pages', () => {
    for (const url of [
      'chrome://settings', 'edge://flags', 'about:blank', 'chrome-extension://abc/popup.html',
      'https://chromewebstore.google.com/detail/x', 'https://chrome.google.com/webstore/detail/x',
      'view-source:https://example.com', 'devtools://devtools/bundled/inspector.html', undefined, '',
    ]) expect(isRecordable(url)).toBe(false);
  });
});

describe('formatElapsed', () => {
  it('formats m:ss', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(65_400)).toBe('1:05');
  });
});
