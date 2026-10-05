/**
 * Migrationen alter Spielstände (AGENTS Regel 9). Eintrag `n` hebt ein Payload von
 * Schema n auf n+1. Neue Schema-Version: Eintrag ergänzen, Fixture des alten Stands
 * unter `test/fixtures/` ablegen und testen. Nie Einträge löschen.
 */
import { SAVE_SCHEMA_VERSION } from './schema.ts';

export type Migration = (payload: Record<string, unknown>) => Record<string, unknown>;

/** Schema 1 ist der erste Stand (M2); bisher keine Migrationen nötig. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export function migrate(
  payload: Record<string, unknown>,
  from: number,
  to: number = SAVE_SCHEMA_VERSION,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): Record<string, unknown> {
  let p = payload;
  for (let v = from; v < to; v++) {
    const m = migrations[v];
    if (!m) throw new Error(`Keine Migration von Schema ${v} auf ${v + 1}`);
    p = m(p);
  }
  return p;
}
