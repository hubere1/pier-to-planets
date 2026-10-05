/**
 * Rückkehr-Dialog (docs/05, docs/03 §7): Abwesenheit, Ertrag je Ära, Deckel-Hinweis.
 * Ertrag ist bereits gutgeschrieben (`offline()`); „Einsammeln“ schließt nur.
 * „×2 mit Werbung“ folgt mit der Werbung in M8.
 */
import { OFFLINE_CAP_S, OFFLINE_EFFICIENCY } from '@ptp/sim';
import type { EraId } from '@ptp/content';
import { duration, money, t } from '../../l10n/index.ts';
import { Icon } from '../components/Icon.tsx';
import { useApp } from '../state.ts';

export function ReturnDialog() {
  const { session } = useApp();
  const lo = session.state.value.lastOffline;
  if (!lo) return null;
  const capped = lo.seconds > lo.counted + 1;
  return (
    <div class="dialog-backdrop" role="presentation">
      <section
        class="dialog frame-high"
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-title"
        data-testid="return-dialog"
      >
        <h2 id="return-title" class="px-title">
          {t('return.title', { time: duration(lo.seconds) })}
        </h2>
        <ul class="return-list">
          {(Object.entries(lo.byEra) as [EraId, NonNullable<(typeof lo.byEra)[EraId]>][]).map(
            ([era, amount]) => (
              <li key={era}>
                <Icon name="coin" />
                <span>{t(`era.${era}`)}</span>
                <strong class="px-num">+{money(amount, era)}</strong>
              </li>
            ),
          )}
        </ul>
        <p class="muted">
          <Icon name="clock" />{' '}
          {capped
            ? t('return.capped', { cap: duration(OFFLINE_CAP_S) })
            : t('return.efficiency', { pct: OFFLINE_EFFICIENCY * 100 })}
        </p>
        <button
          type="button"
          class="btn frame-primary"
          data-testid="return-collect"
          autoFocus
          onClick={() =>
            session.dispatch({ type: 'claimOffline', boosted: false, day: session.day() })
          }
        >
          <span class="px">{t('return.collect')}</span>
        </button>
      </section>
    </div>
  );
}
