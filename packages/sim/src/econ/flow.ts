/**
 * Fluss mit Engpass (docs/03 §2): F = min(A, E, V), Einnahmen/s = F · Preis · Mult.
 */
import type { BuildingDef, EraDef, EraId, FlowStage } from '@ptp/content';
import { Num } from '../num/index.ts';
import { eraDef, eraState, totalStars, type GameState } from '../model/state.ts';
import {
  BOOST_FACTOR,
  MILESTONE_FACTOR,
  STAR_BONUS,
  TAP_MIN,
  TAP_SHARE,
  VISIBLE_ARRIVALS_MAX,
  milestonesReached,
} from '../rules.ts';

export interface StageRates {
  /** Ankünfte/s (λ) und Ladung je Fahrzeug – ergeben zusammen `A`. */
  arrivals: number;
  load: number;
  A: number;
  E: number;
  V: number;
}

/** Wirkung eines Gebäudes auf seiner Stufe: linear je Stufe, ×2 je Meilenstein (§3). */
export function contribution(b: BuildingDef, level: number): number {
  return b.perLevel * level * MILESTONE_FACTOR ** milestonesReached(level);
}

export function stageRates(def: EraDef, levels: Readonly<Record<string, number>>): StageRates {
  let arrivals = 0;
  let arrivalsPct = 0;
  let loadPct = 0;
  let E = 0;
  let V = 0;
  for (const b of def.buildings) {
    const c = contribution(b, levels[b.id] ?? 0);
    if (b.effect === 'vehicles') arrivals += c;
    else if (b.effect === 'vehiclesPct') arrivalsPct += c;
    else if (b.effect === 'loadPct') loadPct += c;
    else if (b.stage === 'unload') E += c;
    else if (b.stage === 'sales') V += c;
  }
  const lambda = arrivals * (1 + arrivalsPct);
  const load = def.loadBase * (1 + loadPct);
  return { arrivals: lambda, load, A: lambda * load, E, V };
}

export function flowOf(r: Pick<StageRates, 'A' | 'E' | 'V'>): number {
  return Math.min(r.A, r.E, r.V);
}

/** Engpass-Stufe = argmin(A, E, V); bei Gleichstand gewinnt die frühere Stufe der Kette. */
export function bottleneckStage(r: Pick<StageRates, 'A' | 'E' | 'V'>): FlowStage {
  if (r.A <= r.E && r.A <= r.V) return 'arrival';
  if (r.E <= r.V) return 'unload';
  return 'sales';
}

export function stageValue(r: StageRates, stage: FlowStage): number {
  return stage === 'arrival' ? r.A : stage === 'unload' ? r.E : r.V;
}

/** Sichtbare Fahrzeuge: Rate gedeckelt, Ladung gleicht aus, damit `A` exakt bleibt (D-032). */
export function visibleArrivals(r: StageRates): { rate: number; load: number } {
  const rate = Math.min(r.arrivals, VISIBLE_ARRIVALS_MAX);
  return { rate, load: rate > 0 ? r.A / rate : r.load };
}

/** Waren je Tipp ohne Kran: 5 % der Ladung, mindestens 1 (§2). */
export function tapAmount(load: number): number {
  return Math.max(TAP_MIN, TAP_SHARE * load);
}

/**
 * Mult = (1 + 0,10 · Sterne) · Werbe-Boost (§2). Weitere Gruppen (Forschung, Personal,
 * Lieferkette, Event) folgen mit ihren Systemen; der Boost gleitet über `boost.level`.
 */
export function multiplier(s: GameState, opts: { boost: boolean }): number {
  const stars = 1 + STAR_BONUS * totalStars(s);
  const boost = opts.boost ? 1 + (BOOST_FACTOR - 1) * s.boost.level : 1;
  return stars * boost;
}

export interface EraFlow extends StageRates {
  F: number;
  /** Einnahmen je Sekunde inkl. Mult. */
  income: Num;
}

/**
 * Erwartungswert der Ära (Offline, Sim-Skript, HUD). `tapsPerSecond` ergänzt `E`
 * vor dem ersten Kran um gleichmäßiges Tippen (nur Sim-Skript und Vorschau).
 */
export function eraFlow(
  s: GameState,
  era: EraId,
  opts: { boost: boolean; tapsPerSecond?: number },
): EraFlow {
  const def = eraDef(era);
  const e = eraState(s, era);
  const r = stageRates(def, e.levels);
  const taps = opts.tapsPerSecond ?? 0;
  const E = r.E > 0 ? r.E : taps * tapAmount(visibleArrivals(r).load);
  const rates = { ...r, E };
  const F = flowOf(rates);
  return { ...rates, F, income: Num.of(F * def.price).mul(multiplier(s, opts)) };
}
