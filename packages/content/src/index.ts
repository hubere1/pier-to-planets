/**
 * Inhalte als Daten (Single Source): Ären, Gebäude, Fahrzeuge, Waren.
 * Spec: docs/03-game-loop.md §5. Reihenfolge der Ären ist fest.
 */
import { harbor } from './eras/harbor.ts';
import type { EraDef } from './types.ts';

export * from './types.ts';
export { harbor };

export const ERA_IDS = ['harbor', 'airport', 'rocket', 'moon', 'mars', 'belt'] as const;
export type EraId = (typeof ERA_IDS)[number];

/** Bisher gebaute Ären; die übrigen folgen ab M4. */
export const ERAS: Partial<Record<EraId, EraDef>> = { harbor };
