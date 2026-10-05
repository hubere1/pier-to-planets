/**
 * HUD (docs/05 § Layout-Zonen): Geld der Ära, Einnahmen/s, Sterne, Zahnrad.
 * Kristalle erscheinen mit dem Kristall-System (M5, D-039). Werte aus `hud()` (Lehre 5).
 */
import { hud } from '@ptp/sim';
import { money, num, rate, t } from '../../l10n/index.ts';
import { Icon } from '../components/Icon.tsx';
import { ui, useApp } from '../state.ts';

export function Hud() {
  const { session } = useApp();
  const h = hud(session.state.value);
  return (
    <header class="hud frame-panel" data-testid="hud">
      <div class="hud-money" data-coin-target>
        <Icon name="coin" />
        <span class="px-num" aria-label={t('hud.money', { value: money(h.money, h.era) })}>
          {num(h.money)}
        </span>
      </div>
      <div class="hud-rate px-num" aria-label={t('hud.rate', { value: rate(h.incomePerSec) })}>
        {rate(h.incomePerSec)}
      </div>
      <div class="hud-stars" aria-label={t('hud.stars', { n: h.stars })}>
        <Icon name="star" />
        <span class="px-num">{num(h.stars)}</span>
      </div>
      <button
        type="button"
        class="hud-gear"
        aria-label={t('settings.title')}
        onClick={() => (ui.dialog.value = 'settings')}
      >
        <Icon name="gear" />
      </button>
    </header>
  );
}
