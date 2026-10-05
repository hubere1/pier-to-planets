/**
 * Prestige-Dialog (docs/05): Vollbild-Sheet mit Vorschau aus `prestigePreview()`, was
 * zurückgesetzt wird und was bleibt. Bestätigen per Gedrückt-Halten (1 s), kein Doppel-Dialog.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { prestigePreview } from '@ptp/sim';
import { num, t } from '../../l10n/index.ts';
import { Icon } from '../components/Icon.tsx';
import { ui, useApp } from '../state.ts';

const HOLD_MS = 1000;

export function PrestigeDialog() {
  const { session, platform } = useApp();
  const era = session.state.value.activeEra;
  const p = prestigePreview(session.state.value, era);
  const [held, setHeld] = useState(0);
  const timer = useRef<number | null>(null);
  const started = useRef(0);
  const close = () => (ui.dialog.value = null);

  const stop = () => {
    if (timer.current !== null) cancelAnimationFrame(timer.current);
    timer.current = null;
    setHeld(0);
  };
  const tick = () => {
    const f = Math.min(1, (platform.clock.now() - started.current) / HOLD_MS);
    setHeld(f);
    if (f >= 1) {
      timer.current = null;
      session.dispatch({ type: 'resetEra', era });
      close();
      return;
    }
    timer.current = requestAnimationFrame(tick);
  };
  const start = () => {
    if (p.newStars < 1 || timer.current !== null) return;
    started.current = platform.clock.now();
    timer.current = requestAnimationFrame(tick);
  };
  useEffect(() => stop, []);

  return (
    <div class="dialog-backdrop" role="presentation">
      <section
        class="dialog dialog-full frame-high"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prestige-title"
        data-testid="prestige-dialog"
      >
        <button type="button" class="dialog-close" aria-label={t('dialog.close')} onClick={close}>
          <Icon name="close" />
        </button>
        <h2 id="prestige-title" class="px-title">
          {t('prestige.title')}
        </h2>
        <p class="prestige-gain">
          <Icon name="star" scale={2} />
          <span class="px-big">
            {t('prestige.gain', { stars: num(p.newStars), pct: num(p.incomePct) })}
          </span>
        </p>
        <p>{t('prestige.speedup', { x: num(p.speedup, { decimals: 1 }) })}</p>
        <div class="prestige-lists">
          <div>
            <h3>{t('prestige.resets')}</h3>
            <ul>
              <li>{t('prestige.resets.money')}</li>
              <li>{t('prestige.resets.buildings')}</li>
            </ul>
          </div>
          <div>
            <h3>{t('prestige.keeps')}</h3>
            <ul>
              <li>{t('prestige.keeps.stars')}</li>
              <li>{t('prestige.keeps.unlocks')}</li>
              <li>{t('prestige.keeps.goal')}</li>
            </ul>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-hold frame-primary"
          data-testid="prestige-hold"
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start();
          }}
          onKeyUp={stop}
          aria-describedby="prestige-hint"
        >
          <span class="hold-fill" style={{ width: `${Math.round(held * 100)}%` }} />
          <span class="px">{t('prestige.hold')}</span>
        </button>
        <p id="prestige-hint" class="muted">
          {t('prestige.holdHint')}
        </p>
        <button type="button" class="btn frame-secondary" onClick={close}>
          <span class="px">{t('dialog.cancel')}</span>
        </button>
      </section>
    </div>
  );
}
