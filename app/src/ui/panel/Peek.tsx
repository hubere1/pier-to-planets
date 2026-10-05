/**
 * Peek-Zeile (docs/05 § Layout-Zonen): „Engpass: Lagerhalle · 1,2 K Taler · +18 %/s“
 * mit Kaufknopf und Kaufmenge. Vorschlag und Wirkung kommen aus `bottleneck()` (FR-K05).
 */
import { bottleneck, buildingCard, type BuyAmount } from '@ptp/sim';
import { money, num, t } from '../../l10n/index.ts';
import { Icon } from '../components/Icon.tsx';
import { useApp } from '../state.ts';
import { BuyButton } from './BuildingCard.tsx';

const AMOUNTS: readonly BuyAmount[] = [1, 10, 'max'];

export function BuyAmountSwitch() {
  const { session } = useApp();
  const current = session.state.value.buyAmount;
  return (
    <div class="amounts" role="group" aria-label={t('buyAmount.label')} data-coach="buyAmount">
      {AMOUNTS.map((a) => (
        <button
          type="button"
          key={String(a)}
          class={`btn-small ${a === current ? 'frame-primary' : 'frame-secondary'}`}
          aria-pressed={a === current}
          onClick={() => session.dispatch({ type: 'setBuyAmount', amount: a })}
        >
          <span class="px">{a === 'max' ? t('buyAmount.max') : `×${a}`}</span>
        </button>
      ))}
    </div>
  );
}

export function Peek() {
  const { session } = useApp();
  const s = session.state.value;
  const era = s.activeEra;
  const b = bottleneck(s, era);
  if (!b.building) {
    return (
      <div class="peek" data-testid="peek">
        <p class="peek-label">{t('peek.flowing')}</p>
        <BuyAmountSwitch />
      </div>
    );
  }
  const card = buildingCard(s, era, b.building);
  const gain =
    b.gainPct === null
      ? t('peek.gainAbs', { value: money(b.gainPerSec, era) })
      : t('peek.gainPct', { value: num(b.gainPct, { decimals: b.gainPct < 10 ? 1 : 0 }) });
  return (
    <div class="peek" data-testid="peek" data-coach="peek">
      <p class="peek-label">
        <Icon name="warn" />
        <span>
          {t('peek.bottleneck', { name: t(`building.${b.building}.name`) })}
          {' · '}
          <span class="positive">{gain}</span>
        </span>
      </p>
      <div class="peek-actions">
        <BuyAmountSwitch />
        <BuyButton era={era} card={card} testId="peek-buy" />
      </div>
    </div>
  );
}
