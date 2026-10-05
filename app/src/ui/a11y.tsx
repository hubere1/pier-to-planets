/**
 * Barrierefreiheit (docs/05, NFR-Q04): Live-Region fasst die Szene zusammen, und das Entladen
 * hat einen echten Knopf als Gegenstück zum Tippen auf das Boot.
 */
import { bottleneck, sceneView } from '@ptp/sim';
import { t } from '../l10n/index.ts';
import { useApp } from './state.ts';

export function LiveRegion() {
  const { session } = useApp();
  const s = session.state.value;
  const view = sceneView(s, s.activeEra);
  const docked = view.vehicles.filter((v) => v.phase === 'docked').length;
  const b = bottleneck(s, s.activeEra).building;
  return (
    <p class="sr-only" aria-live="polite" data-testid="live">
      {t('live.summary', {
        n: docked,
        bottleneck: b ? t(`building.${b}.name`) : t('live.none'),
      })}
    </p>
  );
}

export function UnloadButton() {
  const { session } = useApp();
  const s = session.state.value;
  const e = s.eras[s.activeEra];
  const docked = e?.vehicles.some((v) => v.phase === 'docked') ?? false;
  const crane = (e?.levels['crane'] ?? 0) > 0;
  // Ohne Kran sichtbar (Kern-Mechanik), mit Kran nur für Screenreader (Bonus-Tippen).
  return (
    <button
      type="button"
      class={`unload ${crane ? 'sr-only' : 'frame-secondary'} ${docked ? '' : 'unload-idle'}`}
      data-testid="unload"
      aria-disabled={!docked}
      onClick={() => {
        if (docked) session.dispatch({ type: 'unload', era: s.activeEra });
      }}
    >
      <span class="px">{t(docked ? 'unload.action' : 'unload.waiting')}</span>
    </button>
  );
}
