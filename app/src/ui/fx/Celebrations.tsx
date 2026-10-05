/**
 * Feier-Ebene (docs/05 § Feedback und „Saft“): Banner/Toasts aus der Warteschlange,
 * Vollbild-Feier beim Ziel-Gebäude, fliegende Münzen und „+42“ vom Fahrzeug ins HUD.
 * Bei „Animationen reduzieren“ fliegt nichts; Texte bleiben gleich lange stehen (Lehre 9).
 */
import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { t } from '../../l10n/index.ts';
import { Icon } from '../components/Icon.tsx';
import { ui, useApp } from '../state.ts';

interface Flyer {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  text: string;
  coin: boolean;
}

const MAX_COINS = 12;
const flyers = signal<Flyer[]>([]);
let nextId = 1;

/** Startet „+N“ (und Münzen) an einer Bildschirmposition; Ziel ist das Geld im HUD. */
export function flyCoins(from: { x: number; y: number }, text: string, reduced: boolean): void {
  const hud = document.querySelector('[data-coin-target]')?.getBoundingClientRect();
  const to = hud ? { x: hud.left + 8, y: hud.top + hud.height / 2 } : { x: 24, y: 24 };
  const list = flyers.value.filter((f) => f.id > nextId - 40);
  const coins = list.filter((f) => f.coin).length;
  const add: Flyer[] = [{ id: nextId++, x: from.x, y: from.y, dx: 0, dy: -24, text, coin: false }];
  // Viele Münzen sammeln sich zu wenigen (höchstens 12 gleichzeitig, docs/05 § Szene).
  if (!reduced && coins < MAX_COINS) {
    add.push({
      id: nextId++,
      x: from.x,
      y: from.y,
      dx: to.x - from.x,
      dy: to.y - from.y,
      text: '',
      coin: true,
    });
  }
  flyers.value = [...list, ...add];
}

function removeFlyer(id: number) {
  flyers.value = flyers.value.filter((f) => f.id !== id);
}

export function Celebrations() {
  const { session } = useApp();
  // Neu zeichnen, wenn die Warteschlange weiterrückt.
  void ui.messagesTick.value;
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const before = ui.messages.current;
      const blocked = ui.dialog.value !== null || session.state.value.lastOffline !== null;
      ui.messages.tick(dt, blocked);
      if (ui.messages.current !== before) ui.messagesTick.value++;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const m = ui.messages.current;
  return (
    <>
      <div class="flyers" aria-hidden="true">
        {flyers.value.map((f) => (
          <span
            key={f.id}
            class={f.coin ? 'flyer flyer-coin' : 'flyer flyer-text px-num'}
            style={{ left: `${f.x}px`, top: `${f.y}px`, '--dx': `${f.dx}px`, '--dy': `${f.dy}px` }}
            onAnimationEnd={() => removeFlyer(f.id)}
          >
            {f.coin ? <Icon name="coin" /> : f.text}
          </span>
        ))}
      </div>
      {m && m.kind !== 'fullscreen' && (
        <div
          class={`message message-${m.kind} frame-high`}
          role="status"
          aria-live="polite"
          data-testid="message"
        >
          {m.icon && <Icon name={m.icon as 'star'} />}
          <span class="px">{t(m.key, m.params)}</span>
        </div>
      )}
      {m && m.kind === 'fullscreen' && (
        <div class="dialog-backdrop celebrate" role="presentation">
          <section
            class="dialog frame-high celebrate-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="celebrate-title"
            data-testid="celebration"
          >
            <div class="fireworks" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} style={{ '--i': i }} />
              ))}
            </div>
            <h2 id="celebrate-title" class="px-title">
              {t(`${m.key}.title`, m.params)}
            </h2>
            <p>{t(`${m.key}.text`, m.params)}</p>
            <button
              type="button"
              class="btn frame-primary"
              autoFocus
              onClick={() => {
                ui.messages.dismiss();
                ui.messagesTick.value++;
              }}
            >
              <span class="px">{t('celebrate.continue')}</span>
            </button>
          </section>
        </div>
      )}
    </>
  );
}
