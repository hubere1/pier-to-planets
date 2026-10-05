/**
 * Sterne-Prestige (docs/03 §4.1): SterneMöglich = floor(10 · (Lebenseinnahmen / Schwelle)^0,5);
 * ein Neustart bringt `SterneMöglich − bereits erhaltene`, jeder Stern +10 % in allen Ären.
 */
import type { EraId } from '@ptp/content';
import { Num } from '../num/index.ts';
import { eraDef, eraState, totalStars, type GameState } from '../model/state.ts';
import { STAR_BONUS, STAR_EXPONENT, STAR_FACTOR } from '../rules.ts';

export function starsPossible(lifetime: Num, threshold: number): number {
  if (lifetime.lte(0)) return 0;
  const log = STAR_EXPONENT * (lifetime.log10() - Math.log10(threshold));
  // Kleiner Sicherheitsabstand gegen Rundung genau auf der Grenze (z. B. 10 · 1^0,5).
  return Math.max(0, Math.floor(STAR_FACTOR * 10 ** log + 1e-9));
}

export interface PrestigePreview {
  /** Sterne, die ein Neustart jetzt bringt. */
  newStars: number;
  starsAfter: number;
  /** Zusätzliche Einnahmen in Prozent (alle Ären). */
  incomePct: number;
  /** Faktor, um den der nächste Durchlauf schneller läuft (Mult nachher / vorher). */
  speedup: number;
  /** Hinweis „Neustart lohnt sich“ (§4.1, D-031). */
  worthIt: boolean;
  /** Lebenseinnahmen, ab denen der nächste Stern kommt. */
  nextStarAt: Num;
}

/** Ab so vielen neuen Sternen zeigt die Sim den Hinweis: max(Grundwert, Anteil · Sterne). */
export const RESET_HINT_MIN = 1;
export const RESET_HINT_SHARE = 0.5;

export function prestigePreview(s: GameState, era: EraId): PrestigePreview {
  const def = eraDef(era);
  const e = eraState(s, era);
  const possible = starsPossible(e.lifetimeEarnings, def.starThreshold);
  const newStars = Math.max(0, possible - e.starsEarned);
  const before = totalStars(s);
  const starsAfter = before + newStars;
  const speedup = (1 + STAR_BONUS * starsAfter) / (1 + STAR_BONUS * before);
  return {
    newStars,
    starsAfter,
    incomePct: newStars * STAR_BONUS * 100,
    speedup,
    worthIt: newStars >= Math.max(RESET_HINT_MIN, RESET_HINT_SHARE * before),
    nextStarAt: lifetimeForStars(Math.max(possible, e.starsEarned) + 1, def.starThreshold),
  };
}

/** Umkehrung der Sterne-Formel: Lebenseinnahmen für `stars` Sterne. */
export function lifetimeForStars(stars: number, threshold: number): Num {
  return Num.of(threshold).mul((stars / STAR_FACTOR) ** (1 / STAR_EXPONENT));
}
