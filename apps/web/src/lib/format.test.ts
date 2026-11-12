import { describe, expect, it } from 'vitest';
import { formatDate, formatDuration, formatTimecode } from './format';

describe('formatDuration', () => {
  it('formats m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(3_605_000)).toBe('60:05');
    expect(formatDuration(999)).toBe('0:01');
  });
});

describe('formatDate', () => {
  const now = new Date(2026, 10, 9, 15, 0).getTime();
  it('says Today and Yesterday', () => {
    expect(formatDate(new Date(2026, 10, 9, 8, 0).getTime(), now)).toBe('Today');
    expect(formatDate(new Date(2026, 10, 8, 23, 59).getTime(), now)).toBe('Yesterday');
  });
  it('falls back to short month and day', () => {
    expect(formatDate(new Date(2026, 10, 3, 12, 0).getTime(), now)).toBe('Nov 3');
  });
});

describe('formatTimecode', () => {
  it('formats m:ss.d', () => {
    expect(formatTimecode(0)).toBe('0:00.0');
    expect(formatTimecode(3250)).toBe('0:03.2');
    expect(formatTimecode(65_000)).toBe('1:05.0');
  });
});
