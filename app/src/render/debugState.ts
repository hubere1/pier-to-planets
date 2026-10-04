/**
 * Debug-Regler der Stilprobe (docs/07 M1). Nur Darstellung – kein Spielzustand.
 */
import { signal } from '@preact/signals';

export type Quality = 'high' | 'medium' | 'low';

export const debug = {
  open: signal(false),
  /** ui=0 blendet die Regler aus (Pixeltests ohne DOM-Überlagerung). */
  hidden: signal(false),
  hour: signal(18.2),
  /** Spielminuten pro Sekunde: 0 = Pause, 1 = Echtzeit (24 min/Tag), 60 = 1 h pro Sekunde. */
  speed: signal(1),
  quality: signal<Quality>('high'),
  lighting: signal(true),
  warehouseStage: signal(2),
  stats: signal({ fps: 0, p95: 0, cpu: 0, scale: 0, gameH: 0, sharp: false }),
};

/** URL-Parameter für reproduzierbare Screenshots: ?hour=12&speed=0&quality=low&stage=0&debug=1 */
export function applyDebugQuery(search: string): void {
  const q = new URLSearchParams(search);
  const num = (k: string) => (q.has(k) ? Number(q.get(k)) : undefined);
  const hour = num('hour');
  if (hour !== undefined && Number.isFinite(hour)) debug.hour.value = ((hour % 24) + 24) % 24;
  const speed = num('speed');
  if (speed !== undefined && Number.isFinite(speed)) debug.speed.value = speed;
  const quality = q.get('quality');
  if (quality === 'high' || quality === 'medium' || quality === 'low')
    debug.quality.value = quality;
  const stage = num('stage');
  if (stage !== undefined && [0, 1, 2].includes(stage)) debug.warehouseStage.value = stage;
  if (q.get('light') === '0') debug.lighting.value = false;
  if (q.get('debug') === '1') debug.open.value = true;
  if (q.get('ui') === '0') debug.hidden.value = true;
}
