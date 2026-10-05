/**
 * Plattform-Auswahl (docs/04 § Plattform-Interfaces): Android über Capacitor, sonst Browser.
 */
import { Capacitor } from '@capacitor/core';
import { CapacitorFiles } from './capacitorFiles.ts';
import { systemClock, type Clock } from './clock.ts';
import { IndexedDbFiles } from './indexedDbFiles.ts';
import { browserLifecycle, capacitorLifecycle, type Lifecycle } from './lifecycle.ts';
import { FileSaveStore, type SaveStore } from './saveStore.ts';
import { MemoryFiles } from './files.ts';

export interface Platform {
  clock: Clock;
  store: SaveStore;
  lifecycle: Lifecycle;
  native: boolean;
}

export function createPlatform(opts: { memorySave?: boolean } = {}): Platform {
  const native = Capacitor.isNativePlatform();
  const files = opts.memorySave
    ? new MemoryFiles()
    : native
      ? new CapacitorFiles()
      : new IndexedDbFiles();
  return {
    clock: systemClock,
    store: new FileSaveStore(files),
    lifecycle: native ? capacitorLifecycle : browserLifecycle,
    native,
  };
}
