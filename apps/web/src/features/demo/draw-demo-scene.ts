import { DEMO_TARGETS, type DemoScene } from './demo-script';

const W = 1280;
const H = 720;
const INK = '#111111';
const BG = '#F7F7F5';
const LINE = '#E6E6E3';
const SOFT = '#ECECEA';
const TEXT2 = '#6B6B68';
const FONT = '500 14px Inter, -apple-system, system-ui, sans-serif';

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font = FONT) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function centeredButton(ctx: CanvasRenderingContext2D, c: { x: number; y: number }, w: number, text: string, pressed: boolean) {
  rr(ctx, c.x - w / 2, c.y - 18, w, 36, 10, pressed ? '#2A2A2A' : INK);
  ctx.font = FONT;
  const tw = ctx.measureText(text).width;
  label(ctx, text, c.x - tw / 2, c.y, '#FFFFFF');
}

const CARDS = ['Website refresh', 'Q3 roadmap', 'Hiring plan'];

export function drawDemoScene(ctx: CanvasRenderingContext2D, s: DemoScene): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // top bar
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, 104);
  ctx.fillStyle = LINE;
  ctx.fillRect(0, 104, W, 1);
  rr(ctx, 32, 36, 32, 32, 9, INK);
  label(ctx, 'Northwind', 76, 52, INK, '600 16px Inter, system-ui, sans-serif');
  ['Overview', 'Projects', 'Team'].forEach((t, i) => label(ctx, t, 260 + i * 110, 52, i === 1 ? INK : TEXT2));
  centeredButton(ctx, DEMO_TARGETS.newButton, 140, 'New project', s.pressed === 'new');

  // sidebar
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 105, 220, H - 105);
  ctx.fillStyle = LINE;
  ctx.fillRect(220, 105, 1, H - 105);
  for (let i = 0; i < 6; i++) rr(ctx, 24, 140 + i * 44, i === 1 ? 172 : 120 + ((i * 23) % 50), 12, 6, i === 1 ? '#D9D9D6' : SOFT);

  // project cards
  const names = s.created ? [...CARDS, 'Launch plan'] : CARDS;
  names.forEach((name, i) => {
    const x = 260 + (i % 3) * 330;
    const y = 150 + Math.floor(i / 3) * 190;
    const isNew = s.created && i === 3;
    rr(ctx, x, y, 300, 160, 14, '#FFFFFF');
    if (isNew) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.roundRect(x, y, 300, 160, 14);
      ctx.stroke();
    }
    rr(ctx, x + 20, y + 20, 40, 40, 10, isNew ? INK : SOFT);
    label(ctx, name, x + 20, y + 90, INK);
    rr(ctx, x + 20, y + 118, 160, 8, 4, SOFT);
  });

  if (!s.modalOpen) return;

  // modal
  ctx.fillStyle = 'rgba(17,17,17,0.28)';
  ctx.fillRect(0, 0, W, H);
  rr(ctx, 380, 230, 520, 260, 18, '#FFFFFF');
  label(ctx, 'New project', 412, 270, INK, '600 18px Inter, system-ui, sans-serif');
  label(ctx, 'Name your project', 412, 300, TEXT2);
  const inp = DEMO_TARGETS.input;
  rr(ctx, inp.x - 228, inp.y - 22, 456, 44, 10, BG);
  ctx.lineWidth = 1;
  ctx.strokeStyle = s.typed ? INK : LINE;
  ctx.beginPath();
  ctx.roundRect(inp.x - 228, inp.y - 22, 456, 44, 10);
  ctx.stroke();
  label(ctx, s.typed || 'Untitled', inp.x - 212, inp.y, s.typed ? INK : '#A3A3A0');
  ctx.font = FONT;
  const caretX = inp.x - 212 + (s.typed ? ctx.measureText(s.typed).width + 2 : 0);
  ctx.fillStyle = INK;
  ctx.fillRect(caretX, inp.y - 10, 1.5, 20);
  label(ctx, 'Cancel', 600, DEMO_TARGETS.createButton.y, TEXT2);
  centeredButton(ctx, DEMO_TARGETS.createButton, 120, 'Create', s.pressed === 'create');
}
