import type { Session } from '../shared/messages';

export type PopupView = 'idle' | 'preparing' | 'recording' | 'restricted';

export function popupView(recordable: boolean, session: Session | null): PopupView {
  if (session?.phase === 'recording') return 'recording';
  if (session?.phase === 'preparing') return 'preparing';
  return recordable ? 'idle' : 'restricted';
}
