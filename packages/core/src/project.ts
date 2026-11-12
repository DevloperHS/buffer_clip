import { detectIdle } from './idle';
import type { Background, CursorStyle, OutputSettings, Project, Recording } from './types';
import { suggestZooms } from './zooms';

export const DEFAULT_CURSOR: CursorStyle = {
  visible: true,
  size: 1.5,
  smoothing: 0.5,
  clickRipple: true,
  hideWhenIdleMs: 2000,
};

export const DEFAULT_BACKGROUND: Background = {
  kind: 'gradient',
  value: '#F7F7F5,#DADAD6',
  padding: 64,
  radius: 14,
  shadow: 0.6,
};

// 60 fps by default: the preview animates at display refresh rate, and 30 fps exports look steppy next to it.
export const DEFAULT_OUTPUT: OutputSettings = { aspect: '16:9', height: 1080, fps: 60 };

export function createInitialProject(recording: Recording): Project {
  return {
    version: 1,
    recordingId: recording.id,
    clips: detectIdle(recording.events, recording.durationMs),
    zooms: suggestZooms(recording.events, recording.durationMs),
    cursor: { ...DEFAULT_CURSOR },
    background: { ...DEFAULT_BACKGROUND },
    output: { ...DEFAULT_OUTPUT },
  };
}
