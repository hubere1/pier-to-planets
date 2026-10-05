/**
 * Vorgefertigte Spielstände für Screenshots und UI-Goldens (`?preset=…`).
 * Laufen immer mit Speicher-Spielstand, damit echte Spielstände unberührt bleiben.
 */
import { harbor } from '@ptp/content';
import { newGame, Num, type GameState } from '@ptp/sim';

export type PresetName = 'fresh' | 'early' | 'mid' | 'full';

const LEVELS: Record<Exclude<PresetName, 'fresh'>, Record<string, number>> = {
  early: { pier: 6, crane: 3, warehouse: 11, fishMarket: 2 },
  mid: { pier: 26, crane: 30, warehouse: 27, fishMarket: 12, lighthouse: 4, shipyard: 6 },
  full: {
    pier: 210,
    crane: 210,
    warehouse: 210,
    fishMarket: 120,
    lighthouse: 60,
    shipyard: 30,
    customs: 55,
  },
};

const MONEY: Record<PresetName, number> = { fresh: 0, early: 800, mid: 120_000, full: 9e8 };

export function presetState(name: PresetName): GameState {
  const s = newGame(1);
  if (name === 'fresh') return s;
  const e = s.eras.harbor!;
  Object.assign(e.levels, LEVELS[name]);
  e.money = Num.of(MONEY[name]);
  const lifetime = name === 'full' ? 5e9 : name === 'mid' ? 2e5 : 2e3;
  e.lifetimeEarnings = Num.of(lifetime);
  e.runEarnings = Num.of(lifetime);
  e.unlocked = [
    ...harbor.buildings.filter((b) => b.unlockAtLifetime <= lifetime).map((b) => b.id),
    ...(lifetime >= harbor.goal.unlockAtLifetime ? [harbor.goal.id] : []),
  ];
  return s;
}

export function parsePreset(search: string): PresetName | null {
  const v = new URLSearchParams(search).get('preset');
  return v === 'fresh' || v === 'early' || v === 'mid' || v === 'full' ? v : null;
}
