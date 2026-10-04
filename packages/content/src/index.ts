/**
 * Inhalte als Daten (Single Source): Ären, Gebäude, Fahrzeuge, Waren.
 * Spec: docs/03-game-loop.md §5. Reihenfolge der Ären ist fest.
 */
export const ERA_IDS = ['harbor', 'airport', 'rocket', 'moon', 'mars', 'belt'] as const;
export type EraId = (typeof ERA_IDS)[number];
