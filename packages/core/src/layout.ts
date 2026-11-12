import type { OutputSettings, Project, Recording, Rect, Size } from './types';

const ASPECTS: Record<OutputSettings['aspect'], number> = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 };

export function outputSize(o: OutputSettings): Size {
  const w = Math.round((o.height * ASPECTS[o.aspect]) / 2) * 2;
  return { w, h: o.height };
}

export function contentFrame(r: Recording): Rect {
  return r.crop ?? { x: 0, y: 0, w: r.viewport.w, h: r.viewport.h };
}

export function computeLayout(out: Size, frameAspect: number, paddingPx: number): Rect {
  const aw = out.w - paddingPx * 2;
  const ah = out.h - paddingPx * 2;
  let w = aw;
  let h = aw / frameAspect;
  if (h > ah) {
    h = ah;
    w = ah * frameAspect;
  }
  return { x: (out.w - w) / 2, y: (out.h - h) / 2, w, h };
}

export function frameRect(project: Project, recording: Recording): Rect {
  const out = outputSize(project.output);
  const frame = contentFrame(recording);
  return computeLayout(out, frame.w / frame.h, project.background.padding * (out.h / 1080));
}
