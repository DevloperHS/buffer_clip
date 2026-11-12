export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function formatDate(ts: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTimecode(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  const m = Math.floor(tenths / 600);
  const s = Math.floor(tenths / 10) % 60;
  return `${m}:${String(s).padStart(2, '0')}.${tenths % 10}`;
}
