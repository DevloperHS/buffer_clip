import { expect, test } from '@playwright/test';

test('generate a demo recording and open it in the editor', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Record your first demo')).toBeVisible();

  await page.getByRole('button', { name: 'How to use' }).last().click();
  await expect(page.getByRole('button', { name: /Generating/ }).first()).toBeVisible();

  const card = page.getByRole('link', { name: 'Open How to use Buffer Clip' });
  await expect(card).toBeVisible({ timeout: 30_000 });

  await card.click();
  await expect(page).toHaveURL(/\/editor\//);
  const canvas = page.getByTestId('preview-canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });

  const painted = await canvas.evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    const px = ctx.getImageData(c.width / 2, c.height / 2, 1, 1).data;
    return px[3] === 255;
  });
  expect(painted).toBe(true);
});
