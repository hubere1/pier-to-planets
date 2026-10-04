import { useEffect, useRef } from 'preact/hooks';
import { startStage } from '../render/stage.ts';
import { t } from '../l10n/index.ts';
import { DebugPanel } from './DebugPanel.tsx';

export function App() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    if (host.current) {
      void startStage(host.current).then((s) => {
        if (cancelled) s();
        else stop = s;
      });
    }
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return (
    <main class="game">
      <h1 class="sr-only">{t('app.title')}</h1>
      <div ref={host} class="scene" role="img" aria-label={t('scene.label')} data-testid="scene" />
      <DebugPanel />
    </main>
  );
}
