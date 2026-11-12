import type { CSSProperties } from 'react';

const COLORS = ['#FF5F57', '#FEBC2E', '#28C840'];

/** macOS window dots: grey at rest, colour on hover. Decorative. */
export function TrafficLights() {
  return (
    <div className="group/tl flex gap-2" aria-hidden>
      {COLORS.map((c) => (
        <span
          key={c}
          style={{ '--c': c } as CSSProperties}
          className="size-3 rounded-full bg-hairline transition-colors duration-200 group-hover/tl:bg-(--c)"
        />
      ))}
    </div>
  );
}
