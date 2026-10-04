import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test('Hafenszene startet im Hochformat ohne Konsolenfehler', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?hour=12&speed=0');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('scene')).toHaveAttribute('aria-label', /Harbor|Hafen/);
  await page.waitForTimeout(800);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/scene-noon-360x800.png' });
});

test.describe('Deutsch', () => {
  test.use({ locale: 'de-DE' });

  test('Debug-Regler lassen sich öffnen und zeigen Messwerte', async ({ page }) => {
    await page.goto('/?hour=23&speed=0');
    await page.getByRole('button', { name: 'Debug' }).click();
    await expect(page.getByText('Tageszeit: 23:00 Uhr')).toBeVisible();
    await page.getByRole('button', { name: 'Sparsam' }).click();
    await expect(page.getByRole('button', { name: 'Sparsam' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId('debug-stats')).toContainText('Skalierung ×3');
    await page.screenshot({ path: 'test-results/scene-night-debug-de.png' });
  });
});
