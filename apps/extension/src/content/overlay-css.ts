export const OVERLAY_CSS = `
:host { all: initial; }
[hidden] { display: none !important; }
.layer { position: fixed; inset: 0; cursor: crosshair; font: 500 13px/1.4 Inter, -apple-system, "SF Pro Text", system-ui, sans-serif; color: #111; -webkit-font-smoothing: antialiased; }
.layer.dim, .dimlight { background: rgba(17,17,17,.38); }
.dimlight { position: fixed; inset: 0; animation: fade .3s cubic-bezier(.22,1,.36,1); }
.glass { background: rgba(251,251,250,.84); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); box-shadow: 0 0 0 1px rgba(0,0,0,.06), 0 18px 40px -12px rgba(0,0,0,.3); }
.hint { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 8px 14px; border-radius: 999px; white-space: nowrap; animation: drop .35s cubic-bezier(.22,1,.36,1); }
.box { position: fixed; border-radius: 10px; box-shadow: 0 0 0 9999px rgba(17,17,17,.38); outline: 1.5px solid #fff; }
.dims { position: absolute; left: 0; top: -28px; padding: 3px 8px; border-radius: 6px; background: #111; color: #fff; font-size: 11px; font-variant-numeric: tabular-nums; }
.bar { position: fixed; transform: translateX(-50%); display: flex; gap: 6px; padding: 6px; border-radius: 12px; cursor: default; animation: drop .3s cubic-bezier(.22,1,.36,1); }
button { all: unset; cursor: pointer; padding: 7px 12px; border-radius: 8px; transition: transform .15s cubic-bezier(.22,1,.36,1), background-color .2s, color .2s; }
button:active { transform: scale(.97); }
button:focus-visible { outline: 2px solid #111; outline-offset: 2px; }
.ghost { color: #6B6B68; }
.ghost:hover { background: rgba(0,0,0,.05); color: #111; }
.primary { background: #111; color: #fff; }
.count { position: fixed; width: 112px; height: 112px; transform: translate(-50%, -50%); display: grid; place-items: center; border-radius: 50%; animation: pop .4s cubic-bezier(.22,1,.36,1); }
.count svg { position: absolute; inset: 8px; width: 96px; height: 96px; transform: rotate(-90deg); }
.track { fill: none; stroke: rgba(17,17,17,.08); stroke-width: 4; }
.ring { fill: none; stroke: #111; stroke-width: 4; stroke-linecap: round; stroke-dasharray: 276.5; stroke-dashoffset: 276.5; }
.ring.run { animation: ring 1s linear forwards; }
.num { font-size: 40px; font-weight: 500; font-variant-numeric: tabular-nums; animation: pop .35s cubic-bezier(.22,1,.36,1); }
@keyframes ring { to { stroke-dashoffset: 0; } }
@keyframes pop { from { opacity: 0; transform: scale(.85); } }
@keyframes fade { from { opacity: 0; } }
@keyframes drop { from { opacity: 0; translate: 0 -6px; } }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 150ms !important; } }
`;
