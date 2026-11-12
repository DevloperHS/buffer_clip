import { expect, test } from '@playwright/test';

test('play, split, undo and change aspect in the editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'How to use' }).last().click();
  const card = page.getByRole('link', { name: 'Open How to use Buffer Clip' });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();

  const canvas = page.getByTestId('preview-canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
  await expect(page.getByTestId('zoom-block')).toHaveCount(2);
  // Each clip shows its frames, tiled like an NLE video track.
  await expect(page.getByTestId('clip-frames')).toHaveCount(2, { timeout: 15_000 });
  expect(await page.getByTestId('clip-frames').first().locator('span').count()).toBeGreaterThan(2);

  await page.keyboard.press('Space');
  await page.waitForTimeout(1500);
  await page.keyboard.press('Space');
  await expect(page.getByTestId('timecode')).not.toHaveText(/^0:00\.0/);

  const clips = page.getByTestId('clip-block');
  const before = await clips.count();
  await page.keyboard.press('s');
  await expect(clips).toHaveCount(before + 1);
  await page.keyboard.press('Control+z');
  await expect(clips).toHaveCount(before);

  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Search actions' }).fill('9:16');
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('width', '608');
});

test('trimming a clip from its start moves the grabbed edge and shortens the video', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'How to use' }).last().click();
  const card = page.getByRole('link', { name: 'Open How to use Buffer Clip' });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
  await expect(page.getByTestId('preview-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
  await expect(page.getByTestId('timecode')).toHaveText(/\/ 0:07\.5/);

  const clip = page.getByTestId('clip-block').nth(1);
  const before = (await clip.boundingBox())!;
  await clip.hover();
  await page.mouse.move(before.x + 4, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + 120, before.y + before.height / 2, { steps: 10 });
  const mid = (await clip.boundingBox())!;
  expect(mid.x).toBeGreaterThan(before.x + 100); // the grabbed edge follows the pointer
  expect(Math.round(mid.x + mid.width)).toBe(Math.round(before.x + before.width)); // the far edge stays put
  await page.mouse.up();
  await expect(page.getByTestId('timecode')).not.toHaveText(/\/ 0:07\.5/); // output got shorter
});

test('drawing a box on the preview sets what a zoom shows', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'How to use' }).last().click();
  const card = page.getByRole('link', { name: 'Open How to use Buffer Clip' });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
  const canvas = page.getByTestId('preview-canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });

  await page.getByTestId('zoom-block').first().click();
  await page.getByRole('button', { name: 'Draw zoom area' }).click();
  const layer = page.getByTestId('zoom-draw-layer');
  await expect(layer).toBeVisible();
  await expect(page.getByText('Drag a box around what the zoom should show')).toBeVisible();

  // A box about a third of the preview's width: roughly a 3x zoom, shown live while dragging.
  const c = (await canvas.boundingBox())!;
  await page.mouse.move(c.x + c.width * 0.3, c.y + c.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(c.x + c.width * 0.62, c.y + c.height * 0.5, { steps: 8 });
  await expect(page.getByTestId('zoom-draw-box')).toContainText('×');
  await page.mouse.up();

  await expect(layer).toBeHidden();
  await expect(page.getByTestId('zoom-block').first()).toHaveAccessibleName(/Zoom (2\.[5-9]|3\.\d)×/);
  await expect(page.getByRole('switch', { name: 'Follow cursor' })).toHaveAttribute('aria-checked', 'false');
});
