'use client';
import type { CSSProperties } from 'react';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}

export function Slider({ label, value, min, max, step = 1, format = String, onChange, onGestureStart, onGestureEnd }: SliderProps) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="py-2">
      <div className="mb-2 flex justify-between text-[12px]">
        <span className="text-secondary">{label}</span>
        <span className="tabular text-ink">{format(value)}</span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={onGestureStart}
        onPointerUp={onGestureEnd}
        onPointerCancel={onGestureEnd}
        className="bc-range w-full"
        style={{ '--fill': `${fill}%` } as CSSProperties}
      />
    </div>
  );
}
