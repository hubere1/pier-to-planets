/**
 * Coach-Mark (docs/05 § Tutorial): pixeliger Rahmen um das Ziel (Szene oder UI) und eine
 * Sprechblase der Hafenmeisterin. Höchstens 2 kurze Sätze, überspringbar ab Schritt 2.
 */
import { useEffect, useState } from 'preact/hooks';
import { bottleneck } from '@ptp/sim';
import { t } from '../../l10n/index.ts';
import type { ScreenRect } from '../../render/stage.ts';
import { SpriteThumb } from '../components/SpriteThumb.tsx';
import { ui, useApp } from '../state.ts';
import { canSkip, SILENT, type TutorialStep } from './tutorial.ts';

/** Ziel des Coach-Rahmens je Schritt: Szene (Fahrzeug) oder UI-Element (`data-coach`). */
const TARGET: Partial<Record<TutorialStep, string>> = {
  tapBoat: 'scene:boat',
  firstBuy: 'peek-buy',
  bottleneck: 'peek',
  buyAmount: 'buyAmount',
  goal: 'tab-goals',
};

/** Schritte mit „Weiter“-Knopf (keine Handlung nötig). */
const ACK: ReadonlySet<TutorialStep> = new Set([
  'bottleneck',
  'buyAmount',
  'milestone',
  'lighthouse',
]);

function rectOfTarget(target: string | undefined): ScreenRect | null {
  if (!target) return null;
  if (target === 'scene:boat') {
    const stage = ui.stage.value;
    const id = stage?.firstDocked();
    return stage && id !== null && id !== undefined
      ? stage.screenRect({ kind: 'vehicle', id })
      : null;
  }
  const el =
    document.querySelector(`[data-coach="${target}"]`) ??
    document.querySelector(`[data-testid="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

export function Coach(props: { onAck(): void; onSkip(): void }) {
  const { session } = useApp();
  const step = ui.tutorial.value;
  const [rect, setRect] = useState<ScreenRect | null>(null);
  const target = TARGET[step];

  // Der Rahmen folgt dem Ziel (Boot schaukelt, Panel ändert die Höhe).
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setRect(rectOfTarget(target));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [target]);

  if (SILENT.has(step) || ui.dialog.value || session.state.value.lastOffline) return null;
  const s = session.state.value;
  const suggestion = bottleneck(s, s.activeEra).building;
  const name = suggestion ? t(`building.${suggestion}.name`) : '';
  const pad = 4;
  const bubbleTop = rect && rect.y > window.innerHeight * 0.5;
  return (
    <div class="coach" data-testid="coach" data-step={step}>
      {rect && (
        <div
          class="coach-frame frame-coach"
          aria-hidden="true"
          style={{
            left: `${rect.x - pad}px`,
            top: `${rect.y - pad}px`,
            width: `${rect.w + 2 * pad}px`,
            height: `${rect.h + 2 * pad}px`,
          }}
        />
      )}
      <div
        class={`coach-bubble frame-bubble ${bubbleTop ? 'coach-top' : 'coach-bottom'}`}
        role="status"
        aria-live="polite"
      >
        <SpriteThumb sprite="harbor.portrait.harbormaster" stage={0} size={32} />
        <div class="coach-text">
          <p>{t(`tutorial.${step}`, { name })}</p>
          <div class="coach-actions">
            {ACK.has(step) && (
              <button type="button" class="btn-small frame-primary" onClick={props.onAck}>
                {t('tutorial.next')}
              </button>
            )}
            {canSkip(step) && (
              <button type="button" class="btn-small frame-secondary" onClick={props.onSkip}>
                {t('tutorial.skip')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
