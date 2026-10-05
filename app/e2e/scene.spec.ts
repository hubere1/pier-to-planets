import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

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

test.describe('Kamera (docs/06 §6)', () => {
  test.use({ locale: 'de-DE' });

  test('Wischen schwenkt die Kamera, der Bereich ist begrenzt', async ({ page }) => {
    await page.goto('/?hour=12&speed=0');
    const box = (await page.locator('canvas').boundingBox())!;
    const y = box.y + box.height * 0.45;
    // Nach links wischen → Kamera nach rechts, bis zum Anschlag.
    await page.mouse.move(box.x + 300, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, y, { steps: 12 });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Debug' }).click();
    await expect(page.getByText('Kamera: 40 px')).toBeVisible();
    await page.screenshot({ path: 'test-results/scene-camera-right.png' });
  });

  for (const [cam, hour] of [
    [-40, 19],
    [-17, 12],
    [40, 23],
  ] as const) {
    test(`Ebenen bleiben pixelgenau bei Kamera ${cam}`, async ({ page }) => {
      await page.goto(`/?hour=${hour}&speed=0&ui=0&cam=${cam}`);
      await page.waitForTimeout(1000);
      const png = PNG.sync.read(await page.screenshot());
      const s = 3;
      let bad = 0;
      for (let gy = 0; gy < png.height / s; gy++) {
        for (let gx = 0; gx < 360; gx++) {
          const base = (gy * s * png.width + gx * s) * 4;
          const i = ((gy * s + s - 1) * png.width + gx * s + s - 1) * 4;
          if (png.data.readUInt32LE(i) !== png.data.readUInt32LE(base)) bad++;
        }
      }
      expect(bad).toBe(0);
      await page.screenshot({ path: `test-results/scene-camera-${cam}.png` });
    });
  }
});
