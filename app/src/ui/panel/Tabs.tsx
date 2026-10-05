/**
 * Panel-Inhalte: Bauen (Gebäude der Ära, oben das Ziel-Gebäude), Ziele (Ära-Ziel +
 * Neustart-Vorschau), Ären (Karte; weitere Ären ab M4). docs/05 § Screens.
 */
import { goalProgress, hud, prestigePreview } from '@ptp/sim';
import { ERAS, type EraId } from '@ptp/content';
import { money, num, rate, t } from '../../l10n/index.ts';
import { Icon } from '../components/Icon.tsx';
import { SpriteThumb } from '../components/SpriteThumb.tsx';
import { ui, useApp } from '../state.ts';
import { BuildingCardView } from './BuildingCard.tsx';

export function GoalCard(props: { era: EraId; compact?: boolean }) {
  const { session } = useApp();
  const g = goalProgress(session.state.value, props.era);
  const name = t(`building.${g.id}.name`);
  const pct = Math.round(g.progress * 100);
  return (
    <section class="card frame-high goal-card" data-testid="goal-card" data-coach="goal">
      <SpriteThumb sprite="harbor.spaceportPier" stage={0} dim={!g.built} />
      <div class="card-body">
        <h3 class="card-name">
          <Icon name="goal" /> {name}
        </h3>
        {g.built ? (
          <p class="card-line positive">{t('goal.built')}</p>
        ) : (
          <>
            <p class="card-line">
              {g.unlocked
                ? t('goal.cost', { amount: money(g.cost, props.era) })
                : t('goal.locked', { amount: money(ERAS[props.era]!.goal.unlockAtLifetime) })}
            </p>
            <div
              class="bar bar-goal"
              role="progressbar"
              aria-label={t('goal.bar')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <span style={{ width: `${pct}%` }} />
            </div>
            {!props.compact && g.unlocked && (
              <button
                type="button"
                class={`btn ${g.missing.isZero() ? 'frame-primary' : 'frame-secondary btn-missing'}`}
                aria-disabled={!g.missing.isZero()}
                data-testid="goal-build"
                onClick={() => {
                  if (g.missing.isZero()) session.dispatch({ type: 'buildGoal', era: props.era });
                }}
              >
                <span class="px">
                  {g.missing.isZero()
                    ? t('goal.build', { amount: money(g.cost, props.era) })
                    : t('buy.missing', { amount: money(g.missing, props.era) })}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export function PrestigeCard(props: { era: EraId }) {
  const { session } = useApp();
  const p = prestigePreview(session.state.value, props.era);
  return (
    <section class="card frame-panel" data-testid="prestige-card">
      <div class="card-body">
        <h3 class="card-name">
          <Icon name="star" /> {t('prestige.title')}
        </h3>
        <p class="card-line">
          {p.newStars > 0
            ? t('prestige.preview', { stars: num(p.newStars), pct: num(p.incomePct) })
            : t('prestige.none', { amount: money(p.nextStarAt, props.era) })}
        </p>
        {p.worthIt && <p class="card-line positive">{t('prestige.worthIt')}</p>}
        <button
          type="button"
          class={`btn ${p.newStars > 0 ? 'frame-secondary' : 'frame-secondary btn-missing'}`}
          aria-disabled={p.newStars < 1}
          data-testid="prestige-open"
          onClick={() => {
            if (p.newStars > 0) ui.dialog.value = 'prestige';
          }}
        >
          <span class="px">
            {p.newStars > 0
              ? t('prestige.button', { stars: num(p.newStars) })
              : t('prestige.noStars')}
          </span>
        </button>
      </div>
    </section>
  );
}

export function BuildTab() {
  const { session } = useApp();
  const era = session.state.value.activeEra;
  return (
    <div class="tab-body">
      <GoalCard era={era} compact />
      <ul class="cards">
        {ERAS[era]!.buildings.map((b) => (
          <BuildingCardView key={b.id} era={era} id={b.id} />
        ))}
      </ul>
    </div>
  );
}

export function GoalsTab() {
  const { session } = useApp();
  const era = session.state.value.activeEra;
  return (
    <div class="tab-body">
      <h2 class="tab-title">{t('goals.eraGoal')}</h2>
      <GoalCard era={era} />
      <PrestigeCard era={era} />
    </div>
  );
}

export function ErasTab() {
  const { session } = useApp();
  const s = session.state.value;
  const h = hud(s);
  const built = s.eras.harbor?.goalBuilt ?? false;
  return (
    <div class="tab-body">
      <h2 class="tab-title">{t('eras.title')}</h2>
      <ul class="cards">
        <li class="card frame-high">
          <SpriteThumb sprite="harbor.lighthouse" stage={1} />
          <div class="card-body">
            <h3 class="card-name">{t('era.harbor')}</h3>
            <p class="card-line">{t('eras.current', { rate: rate(h.incomePerSec) })}</p>
          </div>
        </li>
        <li class="card frame-panel card-locked">
          <div class="card-body">
            <h3 class="card-name">
              <Icon name="lock" /> {t('era.airport')}
            </h3>
            <p class="card-line">{built ? t('eras.airportSoon') : t('eras.airportLocked')}</p>
          </div>
        </li>
      </ul>
      <PrestigeCard era={s.activeEra} />
    </div>
  );
}
