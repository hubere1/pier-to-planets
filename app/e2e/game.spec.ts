import { expect, test, type Page } from '@playwright/test';

/**
 * M3 – Ära 1 spielbar (docs/07): Journey ab Neuinstallation, Speichern über Neuladen,
 * Rückkehr-Dialog, Prestige, Ziel-Gebäude, Sprache, Einstellungen.
 */

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function step(page: Page): Promise<string | null> {
  return page
    .getByTestId('coach')
    .getAttribute('data-step', { timeout: 3000 })
    .catch(() => null);
}

/** Erster Schritt: das Boot im Coach-Rahmen antippen (Szene, nicht der Knopf). */
async function tapBoat(page: Page): Promise<void> {
  const frame = page.locator('.coach-frame');
  await expect(frame).toBeVisible({ timeout: 15_000 });
  const r = (await frame.boundingBox())!;
  await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  await expect(page.getByTestId('coach')).toHaveAttribute('data-step', 'keepTapping');
}

/** Weiter tippen wie ein Mensch (~4 Tipps/s, „Entladen“ = Tipp, NFR-Q04) bis zum Kauf-Hinweis. */
async function tapUntilFirstBuy(page: Page, maxSeconds: number): Promise<void> {
  const until = Date.now() + maxSeconds * 1000;
  const unload = page.getByTestId('unload');
  while (Date.now() < until) {
    if ((await step(page)) === 'firstBuy') return;
    for (let i = 0; i < 4; i++) {
      const t = Date.now();
      // Kein Schiff am Steg → Knopf ist aria-disabled; dann kurz warten wie ein Mensch.
      await unload.click({ timeout: 250, trial: false }).catch(() => undefined);
      await page.waitForTimeout(Math.max(0, 250 - (Date.now() - t)));
    }
  }
  throw new Error(`Kein Kauf-Hinweis nach ${maxSeconds} s`);
}

test.describe('Deutsch', () => {
  test.use({ locale: 'de-DE' });

  test('Journey: Neuinstallation → erster Kauf ≤ 60 s, Kran ≤ 5 Min (FR-K02, M3-Exit)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = collectErrors(page);
    const t0 = Date.now();
    await page.goto('/?mem=1&hour=9&speed=0');
    await expect(page.getByTestId('coach')).toHaveAttribute('data-step', 'tapBoat');
    await expect(page.getByText('Tippe auf das Boot')).toBeVisible();
    await tapBoat(page);
    await tapUntilFirstBuy(page, 60);
    await expect(page.getByTestId('peek')).toContainText('Engpass: Kran');
    await page.getByTestId('peek-buy').click();
    const firstBuy = (Date.now() - t0) / 1000;
    console.log(`Erster Kauf (Kran) nach ${firstBuy.toFixed(1)} s`);
    expect(firstBuy).toBeLessThanOrEqual(60);
    // Erster Kauf ist der Kran (Engpass-Vorschlag, D-038) → Kran ≤ 5 Min ist damit belegt.
    await expect(page.getByTestId('coach')).toHaveAttribute('data-step', 'bottleneck');
    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByTestId('coach')).toHaveAttribute('data-step', 'buyAmount');
    await page.getByRole('button', { name: 'Weiter' }).click();
    // Kran entlädt jetzt selbst: Einnahmen/s > 0
    await expect(page.getByTestId('hud')).not.toContainText('0,0/s');
    await page.getByRole('button', { name: 'Bauen' }).click();
    await expect(page.getByTestId('card-crane')).toContainText('Stufe 1');
    await page.screenshot({ path: 'test-results/journey-after-crane.png' });
    expect(errors).toEqual([]);
  });

  test('Spielstand übersteht Neuladen (Autosave nach Kauf, Datei-Speicher)', async ({ page }) => {
    test.setTimeout(120_000);
    // Ohne preset/mem: echter Spielstand in IndexedDB (Browser-Variante von save.json).
    await page.goto('/?hour=12&speed=0');
    await expect(page.getByTestId('hud')).toBeVisible();
    await tapBoat(page);
    await tapUntilFirstBuy(page, 60);
    await page.getByTestId('peek-buy').click();
    await page.waitForTimeout(300);
    await page.reload();
    await page.getByRole('button', { name: 'Bauen' }).click();
    await expect(page.getByTestId('card-crane')).toContainText('Stufe 1');
    // Unter 60 s Abwesenheit kein Rückkehr-Dialog
    await expect(page.getByTestId('return-dialog')).toHaveCount(0);
  });

  test('Rückkehr nach 2 h: Dialog mit Ertrag und Deckel-Hinweis, Einsammeln schließt', async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto('/?preset=mid&hour=12&speed=0');
    await expect(page.getByTestId('hud')).toBeVisible();
    await page.clock.fastForward('05:00:00');
    await expect(page.getByTestId('return-dialog')).toBeVisible();
    await expect(page.getByTestId('return-dialog')).toContainText('Willkommen zurück');
    await expect(page.getByTestId('return-dialog')).toContainText('höchstens 4');
    await page.screenshot({ path: 'test-results/return-dialog-de.png' });
    await page.getByTestId('return-collect').click();
    await expect(page.getByTestId('return-dialog')).toHaveCount(0);
  });

  test('Prestige: Vorschau, Gedrückt-Halten 1 s, Sterne im HUD', async ({ page }) => {
    await page.goto('/?preset=mid&hour=12&speed=0');
    await page.getByRole('button', { name: 'Ziele' }).click();
    await expect(page.getByTestId('prestige-card')).toContainText('+2 Sterne möglich');
    await page.getByTestId('prestige-open').click();
    const dialog = page.getByTestId('prestige-dialog');
    await expect(dialog).toContainText('+20');
    await page.screenshot({ path: 'test-results/prestige-dialog-de.png' });
    // Kurz tippen reicht nicht
    await page.getByTestId('prestige-hold').click();
    await expect(dialog).toBeVisible();
    const box = (await page.getByTestId('prestige-hold').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1300);
    await page.mouse.up();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByLabel('2 Sterne')).toBeVisible();
    await expect(page.getByTestId('message')).toContainText('+2 Sterne');
  });

  test('Ziel-Gebäude bauen: Vollbild-Feier (docs/05 § Feedback)', async ({ page }) => {
    await page.goto('/?preset=full&hour=21&speed=0');
    await page.getByRole('button', { name: 'Ziele' }).click();
    await page.getByTestId('goal-build').click();
    await expect(page.getByTestId('celebration')).toContainText('Raumhafen-Anleger fertig!');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/goal-celebration-de.png' });
    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByTestId('goal-card')).toContainText('Gebaut!');
  });

  test('Kauf ohne Deckung nennt den fehlenden Betrag (FR-K07, Lehre 4)', async ({ page }) => {
    await page.goto('/?preset=fresh&hour=12&speed=0');
    await expect(page.getByTestId('peek-buy')).toContainText('Es fehlen 50');
    await expect(page.getByTestId('peek-buy')).toHaveAttribute('aria-disabled', 'true');
  });

  test('Sprache wechselt ohne Neustart (FR-X04), Einstellungen schließen', async ({ page }) => {
    await page.goto('/?preset=early&hour=12&speed=0');
    await page.getByRole('button', { name: 'Einstellungen' }).click();
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('button', { name: 'Build' })).toBeVisible();
    await expect(page.getByTestId('peek')).toContainText('Bottleneck');
  });

  test('Szene antippen: Gebäude öffnet seine Karte im Bauen-Tab', async ({ page }) => {
    await page.goto('/?preset=mid&hour=12&speed=0');
    await expect(page.getByTestId('hud')).toBeVisible();
    // Szene richtet sich nach dem Panel aus (ResizeObserver) – kurz warten.
    await page.waitForTimeout(1500);
    // Lagerhalle: Spiel-x 104, Fassade ~60 px über dem Kai (y 414). Bei 360 CSS-px ist
    // 1 Spiel-Pixel = 1 CSS-px; die Szene rückt so weit hoch, dass y 556 über dem Panel liegt.
    const canvas = (await page.locator('canvas').boundingBox())!;
    const peekTop = await page.evaluate(
      () => document.querySelector('[data-testid="peek"]')!.getBoundingClientRect().top,
    );
    const offsetY = Math.max(-160, Math.min(0, Math.round(peekTop - 556)));
    await page.mouse.click(canvas.x + 104, canvas.y + offsetY + 414 - 60);
    await expect(page.getByTestId('tab-build')).toBeVisible();
    await expect(page.getByTestId('card-warehouse')).toHaveClass(/card-selected/);
  });
});
