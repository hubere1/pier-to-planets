import { render } from 'preact';
import { App } from './ui/App.tsx';
import { applyDebugQuery } from './render/debugState.ts';
import { createPlatform } from './platform/index.ts';
import { GameSession } from './loop/session.ts';
import { parsePreset, presetState } from './debug/presets.ts';
import { initSettings } from './ui/settings.ts';
import './ui/tokens.css';
import './ui/ui.css';

async function boot(): Promise<void> {
  const search = window.location.search;
  applyDebugQuery(search);
  const preset = parsePreset(search);
  // Vorgaben für Screenshots/Tests laufen mit Speicher-Spielstand (echter Stand bleibt unberührt).
  const ephemeral = preset !== null || new URLSearchParams(search).get('mem') === '1';
  let platform = createPlatform({ memorySave: ephemeral });
  let session: GameSession;
  try {
    session = await GameSession.start({
      clock: platform.clock,
      store: platform.store,
      appVersion: __APP_VERSION__,
      initial: preset ? presetState(preset) : undefined,
    });
  } catch {
    // Speicher nicht verfügbar (z. B. blockiertes IndexedDB): spielen ohne Speichern statt Absturz.
    platform = createPlatform({ memorySave: true });
    session = await GameSession.start({
      clock: platform.clock,
      store: platform.store,
      appVersion: __APP_VERSION__,
    });
  }
  await initSettings({
    persist: !ephemeral,
    hasSave: session.load.source !== 'none' || (preset !== null && preset !== 'fresh'),
  });
  const root = document.getElementById('app');
  if (root) render(<App ctx={{ session, platform }} />, root);
}

void boot();
