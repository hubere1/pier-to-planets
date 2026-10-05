/**
 * Gebäudekarte (docs/05 § Bauen): Name, Stufe, Fortschritt zum nächsten Meilenstein,
 * Wirkung jetzt → nach Kauf (nur aufgeklappt), Kaufknopf mit Kosten oder Grund (Lehre 4).
 */
import { buildingCard, type BuildingCard as Card } from '@ptp/sim';
import type { EraId } from '@ptp/content';
import { money, num, t } from '../../l10n/index.ts';
import { BUILDINGS } from '../../render/scene/harborLayout.ts';
import { Icon } from '../components/Icon.tsx';
import { SpriteThumb } from '../components/SpriteThumb.tsx';
import { ui, useApp } from '../state.ts';

export function effectText(kind: Card['effectKind'], value: number): string {
  if (kind === 'vehicles') return t('effect.vehicles', { value: num(value, { decimals: 2 }) });
  if (kind === 'goods') return t('effect.goods', { value: num(value, { decimals: 1 }) });
  return t(`effect.${kind}`, { value: num(value * 100) });
}

export function BuyButton(props: { era: EraId; card: Card; testId?: string }) {
  const { session } = useApp();
  const c = props.card;
  const name = t(`building.${c.id}.name`);
  if (c.blocked === 'locked') return null;
  const label =
    c.blocked === 'funds'
      ? t('buy.missing', { amount: money(c.missing!, props.era) })
      : t('buy.action', { amount: money(c.cost, props.era), n: c.amount });
  return (
    <button
      type="button"
      class={`btn ${c.canBuy ? 'frame-primary' : 'frame-secondary btn-missing'}`}
      data-testid={props.testId ?? `buy-${c.id}`}
      aria-label={c.canBuy ? t('buy.aria', { name, n: c.amount, cost: money(c.cost) }) : label}
      aria-disabled={!c.canBuy}
      onClick={(e) => {
        e.stopPropagation();
        if (!c.canBuy) return;
        session.dispatch({ type: 'buy', era: props.era, building: c.id });
      }}
    >
      <span class="px">{label}</span>
    </button>
  );
}

export function BuildingCardView(props: { era: EraId; id: string }) {
  const { session } = useApp();
  const s = session.state.value;
  const c = buildingCard(s, props.era, props.id);
  const spot = BUILDINGS[c.id];
  const selected = ui.selected.value === c.id;
  const name = t(`building.${c.id}.name`);
  const stage = c.level > 0 ? Math.min(5, c.milestone.reached) + (spot?.stageOffset ?? 0) : 0;
  if (!c.unlocked) {
    return (
      <li class="card frame-panel card-locked" data-testid={`card-${c.id}`}>
        {spot && <SpriteThumb sprite={spot.sprite} stage={0} dim />}
        <div class="card-body">
          <h3 class="card-name">
            <Icon name="lock" /> {name}
          </h3>
          <p class="card-line">
            {t('building.unlockAt', { amount: money(c.unlockAtLifetime, props.era) })}
          </p>
        </div>
      </li>
    );
  }
  return (
    <li
      class={`card frame-panel ${selected ? 'card-selected' : ''}`}
      data-testid={`card-${c.id}`}
      onClick={() => {
        ui.selected.value = selected ? null : c.id;
        if (!selected) ui.stage.value?.focus(c.id);
      }}
    >
      {spot && <SpriteThumb sprite={spot.sprite} stage={stage} />}
      <div class="card-body">
        <h3 class="card-name">{name}</h3>
        <p class="card-line">
          {c.level === 0
            ? t('building.notBuilt')
            : t('building.level', { level: num(c.level), next: num(c.milestone.next) })}
        </p>
        <div
          class="bar"
          role="progressbar"
          aria-label={t('building.milestoneBar', { next: num(c.milestone.next) })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(c.milestone.progress * 100)}
        >
          <span style={{ width: `${Math.round(c.milestone.progress * 100)}%` }} />
        </div>
        {selected && (
          <p class="card-line card-effect">
            {t(`building.${c.id}.desc`)}
            <br />
            {effectText(c.effectKind, c.effect)} → {effectText(c.effectKind, c.effectAfter)}
          </p>
        )}
        <BuyButton era={props.era} card={c} />
      </div>
    </li>
  );
}
