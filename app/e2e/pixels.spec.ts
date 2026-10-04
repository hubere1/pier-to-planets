import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

/**
 * NFR-G01/G02: Jeder Spiel-Pixel ist ein exaktes s × s-Quadrat auf 720/1080/1440 px Breite.
 * Prüft jeden Block des Bildes (360 × 800 Spiel-Pixel).
 */
for (const scale of [2, 3, 4]) {
  test.describe(`${360 * scale} px Breite`, () => {
    test.use({ viewport: { width: 360, height: 800 }, deviceScaleFactor: scale });

    test(`ganzzahlig skaliert (s = ${scale}), keine Mischpixel`, async ({ page }) => {
      await page.goto('/?hour=19&speed=0&ui=0');
      await page.waitForTimeout(1200);
      const png = PNG.sync.read(await page.screenshot());
      expect(png.width).toBe(360 * scale);
      let bad = 0;
      for (let gy = 0; gy < 800; gy++) {
        for (let gx = 0; gx < 360; gx++) {
          const base = (gy * scale * png.width + gx * scale) * 4;
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const i = ((gy * scale + dy) * png.width + gx * scale + dx) * 4;
              if (
                png.data[i] !== png.data[base] ||
                png.data[i + 1] !== png.data[base + 1] ||
                png.data[i + 2] !== png.data[base + 2]
              ) {
                bad++;
                dy = scale;
                break;
              }
            }
          }
        }
      }
      expect(bad).toBe(0);
    });
  });
}
