import { expect, test } from '@playwright/test';

test('leere App startet im Hochformat ohne Konsolenfehler', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pier to Planets' })).toBeVisible();
  await expect(page.getByTestId('boot-status')).toBeVisible();

  // Kein horizontales Scrollen bei 360 CSS-px (D-002, Lehre 11).
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);

  await page.screenshot({ path: 'test-results/boot-360x640.png' });
});

test.describe('Deutsch', () => {
  test.use({ locale: 'de-DE' });

  test('zeigt den deutschen Untertitel', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Vom Hafen ins All')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('de');
    await page.screenshot({ path: 'test-results/boot-360x640-de.png' });
  });
});
