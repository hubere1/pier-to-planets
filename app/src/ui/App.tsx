/**
 * App-Gerüst (docs/05 § Layout-Zonen): Szene (PixiJS) unten, darüber das DOM-Overlay mit
 * HUD, Panel, Dialogen, Coach und Feier-Ebene. Verdrahtet Notices der Sitzung mit Tutorial,
 * Feier-Ebene und Haptik; die UI sendet nur Commands (AGENTS Regel 7).
 */
import { useEffect, useRef } from 'preact/hooks';
import { bottleneck, buildingCard, Num, type Notice } from '@ptp/sim';
import { computeStageLayout } from '../render/layout.ts';
import { startStage } from '../render/stage.ts';
import { debug } from '../render/debugState.ts';
import { haptic } from '../platform/haptics.ts';
import { num, t } from '../l10n/index.ts';
import { DebugPanel } from './DebugPanel.tsx';
import { Celebrations, flyCoins } from './fx/Celebrations.tsx';
import { Hud } from './hud/Hud.tsx';
import { Panel } from './panel/Panel.tsx';
import { PrestigeDialog } from './dialogs/PrestigeDialog.tsx';
import { ReturnDialog } from './dialogs/ReturnDialog.tsx';
import { SettingsSheet } from './dialogs/SettingsSheet.tsx';
import { settings, updateSettings } from './settings.ts';
import { AppContext, ui, type AppCtx } from './state.ts';
import { Coach } from './tutorial/Coach.tsx';
import { nextStep, type TutorialInput } from './tutorial/tutorial.ts';
import { LiveRegion, UnloadButton } from './a11y.tsx';

/** Höchste Meilenstein-Nummer mit eigenem Text (10/25/50/100/200). */
const NAMED_MILESTONES = 5;

function advanceTutorial(input: TutorialInput): void {
  const next = nextStep(ui.tutorial.value, input);
  if (next === ui.tutorial.value) return;
  ui.tutorial.value = next;
  updateSettings({ tutorial: next });
}

function onNotices(ctx: AppCtx, notices: readonly Notice[]): void {
  const q = ui.messages;
  const vibrate = settings.value.haptics;
  const reduced = settings.value.reducedMotion || debug.reducedMotion.value;
  for (const n of notices) {
    const a = n.args;
    const building = String(a['building'] ?? '');
    switch (n.ref) {
      case 'buy.done':
        if (vibrate) haptic('light');
        break;
      case 'milestone.reached': {
        const m = Number(a['milestone']);
        q.push({
          kind: 'banner',
          icon: 'up',
          key: m <= NAMED_MILESTONES ? `milestone.${building}.${m}` : 'milestone.generic',
          params: { name: t(`building.${building}.name`), m },
        });
        if (vibrate) haptic('medium');
        break;
      }
      case 'vehicle.newTier':
        q.push({
          kind: 'toast',
          key: 'toast.newVehicle',
          params: { name: t(`vehicle.${String(a['vehicle'])}`) },
        });
        break;
      case 'building.unlocked':
        q.push({
          kind: 'toast',
          icon: 'build',
          key: 'toast.unlocked',
          params: { name: t(`building.${building}.name`) },
        });
        break;
      case 'goal.unlocked':
        q.push({
          kind: 'toast',
          icon: 'goal',
          key: 'toast.goalUnlocked',
          params: { name: t(`building.${String(a['goal'])}.name`) },
        });
        break;
      case 'goal.built':
        q.push({
          kind: 'fullscreen',
          key: 'celebrate.goal',
          params: { name: t(`building.${String(a['goal'])}.name`) },
        });
        if (vibrate) haptic('heavy');
        break;
      case 'era.reset':
        q.push({
          kind: 'banner',
          icon: 'star',
          key: 'banner.reset',
          params: { stars: num(Number(a['stars'])) },
        });
        break;
      case 'tap.denied':
        // Tippen bei vollem Lager: Grund nennen statt stumm nichts tun (Lehre 4).
        if (a['reason'] === 'stockFull')
          q.push({ kind: 'toast', icon: 'warn', key: 'toast.stockFull' });
        break;
      case 'save.failed':
        q.push({ kind: 'banner', icon: 'warn', key: 'banner.saveFailed' });
        break;
      case 'tap.unloaded':
      case 'tap.bonus': {
        const r = ui.stage.value?.screenRect({ kind: 'vehicle', id: Number(a['vehicleId']) });
        const text =
          n.ref === 'tap.unloaded'
            ? t('fx.unloaded', { n: num(Number(a['amount'])) })
            : `+${num(Num.parse(a['earned']) ?? 0)}`;
        if (r) flyCoins({ x: r.x + r.w / 2, y: r.y }, text, reduced);
        break;
      }
    }
  }
  ui.messagesTick.value++;
  advanceTutorial({ notices });
}

export function App(props: { ctx: AppCtx }) {
  const { ctx } = props;
  const { session, platform } = ctx;
  const host = useRef<HTMLDivElement>(null);

  // Spiel-Pixel in CSS-Pixeln (`--gp`) und Pixel-Schriftstufe bei großer Systemschrift.
  useEffect(() => {
    const apply = () => {
      const dpr = window.devicePixelRatio || 1;
      const layout = computeStageLayout(window.innerWidth * dpr, window.innerHeight * dpr);
      const gp = layout.outW / layout.gameW / dpr;
      const root = document.documentElement;
      root.style.setProperty('--gp', `${gp}px`);
      const fontScale = parseFloat(getComputedStyle(root).fontSize) / 16;
      root.style.setProperty('--pk', fontScale >= 1.3 ? '2' : '1');
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    if (host.current) {
      void startStage(host.current, {
        session,
        onHit(hit) {
          if (hit.kind === 'vehicle') {
            session.dispatch({
              type: 'tapVehicle',
              era: session.state.value.activeEra,
              vehicleId: hit.id,
            });
          } else {
            ui.selected.value = hit.id;
            ui.tab.value = 'build';
            if (ui.height.value === 'peek') ui.height.value = 'half';
            ui.stage.value?.focus(hit.id);
            requestAnimationFrame(() =>
              document
                .querySelector(`[data-testid="card-${hit.id}"]`)
                ?.scrollIntoView({ block: 'nearest' }),
            );
          }
        },
      }).then((handle) => {
        if (cancelled) handle.stop();
        else {
          ui.stage.value = handle;
          stop = handle.stop;
        }
      });
    }
    const offNotices = session.onNotices((n) => onNotices(ctx, n));
    const offLifecycle = platform.lifecycle.listen(
      () => {
        ui.stage.value?.setRunning(false);
        void session.pause();
      },
      () => {
        session.resume();
        ui.stage.value?.setRunning(true);
      },
    );
    return () => {
      cancelled = true;
      offNotices();
      offLifecycle();
      stop?.();
      ui.stage.value = null;
    };
  }, []);

  // Tutorial: Fortschritt aus Einstellungen; Kauf-Schritt, sobald der Engpass-Kauf bezahlbar ist.
  useEffect(() => {
    ui.tutorial.value = settings.value.tutorial;
    return session.state.subscribe((s) => {
      if (ui.tutorial.value !== 'keepTapping') return;
      const b = bottleneck(s, s.activeEra).building;
      if (b) advanceTutorial({ notices: [], affordable: buildingCard(s, s.activeEra, b).canBuy });
    });
  }, []);
  useEffect(
    () =>
      ui.tab.subscribe((tab) => {
        if (ui.height.value !== 'peek') advanceTutorial({ notices: [], tabOpened: tab });
      }),
    [],
  );
  useEffect(
    () =>
      ui.height.subscribe((h) => {
        if (h !== 'peek') advanceTutorial({ notices: [], tabOpened: ui.tab.value });
      }),
    [],
  );

  // Szene so ausrichten, dass Liegeplätze über Peek-Panel und Navigation liegen.
  useEffect(() => {
    const measure = () => {
      const nav = document.querySelector('.nav');
      const peek = document.querySelector('[data-testid="peek"]');
      if (!nav || !peek) return;
      const bottom = window.innerHeight - peek.getBoundingClientRect().top;
      if (ui.height.value === 'peek') ui.stage.value?.setInsets(Math.round(bottom));
    };
    measure();
    const ro = new ResizeObserver(measure);
    const nav = document.querySelector('.nav');
    if (nav) ro.observe(nav);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ui.stage.value]);

  // Bildrate: 30 fps bei Vollbild-Panel oder Einstellung (docs/04, docs/05).
  const full = ui.height.value === 'full' || ui.dialog.value !== null;
  useEffect(() => {
    ui.stage.value?.setMaxFps(full || settings.value.fps === 30 ? 30 : 60);
  }, [full, settings.value.fps, ui.stage.value]);

  const dialog = ui.dialog.value;
  const returning = session.state.value.lastOffline !== null;
  return (
    <AppContext.Provider value={ctx}>
      <main class="game">
        <h1 class="sr-only">{t('app.title')}</h1>
        <div
          ref={host}
          class="scene"
          role="img"
          aria-label={t('scene.label')}
          data-testid="scene"
        />
        {!debug.hidden.value && (
          <>
            <Hud />
            <UnloadButton />
            <Panel />
            <Celebrations />
            {ui.tutorial.value !== 'done' && !returning && (
              <Coach
                onAck={() => advanceTutorial({ notices: [], ack: true })}
                onSkip={() => advanceTutorial({ notices: [], skip: true })}
              />
            )}
            {returning && <ReturnDialog />}
            {!returning && dialog === 'prestige' && <PrestigeDialog />}
            {!returning && dialog === 'settings' && <SettingsSheet />}
            <LiveRegion />
          </>
        )}
        {session.load.newerVersion && (
          <p class="newer-version frame-high" role="alert">
            {t('save.newerVersion')}
          </p>
        )}
        <DebugPanel />
      </main>
    </AppContext.Provider>
  );
}
