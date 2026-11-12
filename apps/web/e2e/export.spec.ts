import { expect, test } from '@playwright/test';
import { ALL_FORMATS, BufferSource, Input } from 'mediabunny';
import { readFile } from 'node:fs/promises';

test('exports the edited demo as an MP4 that matches the edit', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'How to use' }).last().click();
  const card = page.getByRole('link', { name: 'Open How to use Buffer Clip' });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
  await expect(page.getByTestId('preview-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Export' });
  await expect(sheet.getByText(/1920×1080/)).toBeVisible();

  const downloadPromise = page.waitForEvent('download', { timeout: 200_000 });
  await sheet.getByRole('button', { name: 'Export MP4' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('How to use Buffer Clip.mp4');
  await expect(sheet.getByText('Saved How to use Buffer Clip.mp4')).toBeVisible();

  const bytes = await readFile(await download.path());
  const input = new Input({ formats: ALL_FORMATS, source: new BufferSource(bytes) });
  expect(await input.computeDuration()).toBeCloseTo(7.5, 0);
  const video = await input.getPrimaryVideoTrack();
  expect(video?.displayWidth).toBe(1920);
  expect(video?.displayHeight).toBe(1080);
});
