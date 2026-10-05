import { expect, test, type Page } from '@playwright/test';

/**
 * UI-Layout (docs/02 NFR-Q02/Q04, Lehre 11): 360 × 640, 320 dp und 412 × 915, Schrift 100 und
 * 200 %, DE und EN. Statt Pixel-Goldens (Schriftrendering unterscheidet sich zwischen Windows
 * und dem Linux-CI, D-043) prüfen die Tests: kein waagerechter Überlauf, kein abgeschnittener
 * Text, Touch-Ziele ≥ 48 dp. Screenshots landen zur Durchsicht in test-results/.
 */

const SIZES = [
  { name: '360x640', width: 360, height: 640 },
  { name: '320x640', width: 320, height: 640 },
  { name: '412x915', width: 412, height: 915 },
] as const;

async function problems(page: Page): Promise<string[]> {
  // Erst messen, wenn die Pixel-Schriften geladen sind (sonst misst man die Ersatzschrift).
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const out: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth + 1) out.push(`Seite ${doc.scrollWidth}px breit`);
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('.sr-only');
    };
    for (const el of document.querySelectorAll<HTMLElement>(
      '.hud, .peek, .card, .btn, .btn-small, .dialog, .coach-bubble, .message, .nav-tab',
    )) {
      if (!visible(el)) continue;
      const label = `${el.className.split(' ')[0]} „${(el.textContent ?? '').trim().slice(0, 30)}“`;
      if (el.scrollWidth > el.clientWidth + 1) {
        // Verursacher nennen: das Kind, das am weitesten über den Rand ragt.
        const edge = el.getBoundingClientRect().left + el.clientLeft + el.clientWidth;
        let worst = '';
        let max = 0;
        for (const c of el.querySelectorAll<HTMLElement>('*')) {
          const over = c.getBoundingClientRect().right - edge;
          if (over > max) {
            max = over;
            worst = `${c.tagName.toLowerCase()}.${c.className}`;
          }
        }
        out.push(
          `${label}: Text abgeschnitten (${el.scrollWidth}>${el.clientWidth}, ${worst} +${Math.round(max)}px)`,
        );
      }
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 1 || r.left < -1) out.push(`${label}: ragt aus dem Bild`);
    }
    // Nur unsere Oberfläche (PixiJS hängt einen eigenen, unsichtbaren Hilfsknopf an <body>).
    for (const el of document.querySelectorAll<HTMLElement>('main button')) {
      if (!visible(el) || el.classList.contains('sheet-handle')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 47.5 || r.height < 47.5) {
        out.push(
          `Knopf „${el.textContent?.trim() || el.getAttribute('aria-label')}“ ${Math.round(r.width)}×${Math.round(r.height)}`,
        );
      }
    }
    return out;
  });
}

for (const size of SIZES) {
  for (const font of [100, 200]) {
    for (const locale of ['de-DE', 'en-US']) {
      test.describe(`${size.name} · Schrift ${font} % · ${locale}`, () => {
        test.use({
          viewport: { width: size.width, height: size.height },
          locale,
        });

        test('Kernscreens ohne Überlauf, Touch-Ziele ≥ 48 dp', async ({ page }) => {
          test.setTimeout(90_000);
          if (font !== 100) {
            await page.addInitScript((pct) => {
              document.addEventListener('DOMContentLoaded', () => {
                document.documentElement.style.fontSize = `${pct}%`;
              });
            }, font);
          }
          const tag = `${size.name}-${font}-${locale.slice(0, 2)}`;
          await page.goto('/?preset=mid&hour=12&speed=0&quality=low');
          await expect(page.getByTestId('hud')).toBeVisible();
          await page.waitForTimeout(600);
          const found: string[] = [];
          const check = async (screen: string) => {
            for (const p of await problems(page)) found.push(`${screen}: ${p}`);
            await page.screenshot({ path: `test-results/layout/${tag}-${screen}.png` });
          };
          await check('peek');
          await page.locator('[data-coach="tab-build"]').click();
          await check('build');
          await page.locator('.sheet-handle').click();
          await check('build-full');
          await page.locator('[data-coach="tab-goals"]').click();
          await check('goals');
          await page.locator('[data-coach="tab-eras"]').click();
          await check('eras');
          await page.locator('[data-coach="tab-goals"]').click();
          await page.getByTestId('prestige-open').click();
          await check('prestige');
          await page.keyboard.press('Escape');
          await page.locator('.dialog-close').click();
          await page.locator('.hud-gear').click();
          await check('settings');
          expect(found).toEqual([]);
        });
      });
    }
  }
}

test.describe('Tutorial und leere Zustände', () => {
  test.use({ viewport: { width: 320, height: 640 }, locale: 'de-DE' });

  test('Coach und Bauplätze bei 320 dp und 200 % lesbar', async ({ page }) => {
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.fontSize = '200%';
      });
    });
    await page.goto('/?mem=1&hour=9&speed=0&quality=low');
    await expect(page.getByTestId('coach')).toBeVisible();
    await page.waitForTimeout(600);
    expect(await problems(page)).toEqual([]);
    await page.screenshot({ path: 'test-results/layout/tutorial-320-200.png' });
    await page.locator('[data-coach="tab-build"]').click();
    expect(await problems(page)).toEqual([]);
    await page.screenshot({ path: 'test-results/layout/fresh-build-320-200.png' });
  });
});
