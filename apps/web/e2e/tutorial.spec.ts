import { expect, test } from '@playwright/test';

test('How to use guides a new user through the editor by doing', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'How to use' }).last().click();

  const tip = page.getByRole('dialog', { name: 'Guided tour ready' });
  await expect(tip).toBeVisible({ timeout: 30_000 });
  await tip.getByRole('link', { name: 'Open tutorial' }).click();

  const tour = page.getByRole('dialog', { name: 'Guided tour' });
  await expect(tour).toContainText('Press Space to play', { timeout: 15_000 });
  await page.keyboard.press('Space');
  await expect(tour).toContainText('Scrub the timeline');
  await page.keyboard.press('Space');

  const ruler = page.locator('[data-tour="ruler"]');
  const rb = (await ruler.boundingBox())!;
  await page.mouse.click(rb.x + rb.width * 0.2, rb.y + rb.height / 2);
  await expect(tour).toContainText('Trim a clip');

  const clip = page.getByTestId('clip-block').nth(1);
  const cb = (await clip.boundingBox())!;
  await clip.hover();
  await page.mouse.move(cb.x + 4, cb.y + cb.height / 2);
  await page.mouse.down();
  await page.mouse.move(cb.x + 80, cb.y + cb.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(tour).toContainText('Split at the playhead');

  await page.keyboard.press('s');
  await expect(tour).toContainText('Undo');
  await page.keyboard.press('Control+z');
  await expect(tour).toContainText('Speed up idle time');

  await tour.getByRole('button', { name: 'End tour' }).click();
  await expect(tour).toBeHidden();

  await page.reload();
  await expect(page.getByTestId('preview-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
  await page.waitForTimeout(1000);
  await expect(page.getByRole('dialog', { name: 'Guided tour' })).toHaveCount(0);
});
