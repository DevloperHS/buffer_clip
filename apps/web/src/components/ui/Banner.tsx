import type { ReactNode } from 'react';

export function Banner({ children, role }: { children: ReactNode; role?: 'alert' | 'status' }) {
  return (
    <div role={role} className="mb-6 rounded-card border border-hairline bg-surface px-4 py-3 text-[13px] text-secondary">
      {children}
    </div>
  );
}
