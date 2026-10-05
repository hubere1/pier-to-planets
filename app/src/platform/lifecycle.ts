/**
 * Vorder-/Hintergrund (docs/04 § Takt und Lifecycle). Android: `@capacitor/app`,
 * Browser: `visibilitychange`.
 */
import { App } from '@capacitor/app';

export interface Lifecycle {
  /** Ruft `onPause`/`onResume` auf; liefert eine Abmeldefunktion. */
  listen(onPause: () => void, onResume: () => void): () => void;
}

export const browserLifecycle: Lifecycle = {
  listen(onPause, onResume) {
    const onVisibility = () => (document.hidden ? onPause() : onResume());
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPause);
    };
  },
};

export const capacitorLifecycle: Lifecycle = {
  listen(onPause, onResume) {
    const handle = App.addListener('appStateChange', ({ isActive }) =>
      isActive ? onResume() : onPause(),
    );
    return () => void handle.then((h) => h.remove());
  },
};
