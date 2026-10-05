/**
 * Spieler-Policies für das Balancing-Gate (docs/03 §9, D-013). Rein: nutzt nur `step`,
 * `offline` und Views – dieselben Funktionen wie das Spiel (Lehre 5).
 */
import type { EraId } from '@ptp/content';
import type { Num } from '../num/index.ts';
import { eraDef, eraState, newGame, type GameState } from '../model/state.ts';
import { step } from '../engine/step.ts';
import type { Command } from '../engine/types.ts';
import { offline } from '../offline/offline.ts';
import { bottleneck } from '../econ/bottleneck.ts';
import { eraFlow } from '../econ/flow.ts';
import { costFor } from '../econ/cost.ts';
import { prestigePreview } from '../prestige/stars.ts';
import { OFFLINE_CAP_S, OFFLINE_EFFICIENCY } from '../rules.ts';
import { Rng, seedRng } from '../rng/index.ts';

export type PolicyId = 'casual' | 'active' | 'idle' | 'ads';
export const POLICIES: readonly PolicyId[] = ['casual', 'active', 'idle', 'ads'];

export interface Policy {
  id: PolicyId;
  /** Sitzungsbeginn in Stunden nach lokaler Mitternacht. */
  sessions: readonly number[];
  sessionSeconds: number;
  /** Tipps je Sekunde in Sitzungen (vor dem Kran Entladen, danach Bonus). */
  tapsBeforeCrane: number;
  tapsAfterCrane: number;
  ads: boolean;
}

/** docs/03 §9: casual 4×3 Min, active 8 Sitzungen + tippt, idle 2, ads = casual + Werbung. */
export const POLICY: Record<PolicyId, Policy> = {
  casual: {
    id: 'casual',
    sessions: [8, 12.5, 18, 21.5],
    sessionSeconds: 180,
    tapsBeforeCrane: 2,
    tapsAfterCrane: 0,
    ads: false,
  },
  active: {
    id: 'active',
    sessions: [7.5, 9.5, 11.5, 13.5, 15.5, 17.5, 19.5, 21.5],
    sessionSeconds: 180,
    tapsBeforeCrane: 3,
    tapsAfterCrane: 2,
    ads: false,
  },
  idle: {
    id: 'idle',
    sessions: [8, 20],
    sessionSeconds: 180,
    tapsBeforeCrane: 2,
    tapsAfterCrane: 0,
    ads: false,
  },
  ads: {
    id: 'ads',
    sessions: [8, 12.5, 18, 21.5],
    sessionSeconds: 180,
    tapsBeforeCrane: 2,
    tapsAfterCrane: 0,
    ads: true,
  },
};

export interface DaySnapshot {
  day: number;
  lifetime: Num;
  stars: number;
  levels: Record<string, number>;
  incomePerSec: Num;
}

export interface RunResult {
  policy: PolicyId;
  era: EraId;
  /** Tage seit der ersten Sitzung bis zum Ziel-Gebäude; `null` = nicht erreicht. */
  goalDay: number | null;
  resets: { day: number; stars: number }[];
  days: DaySnapshot[];
  /** Fehler, die das Gate sofort brechen (NaN, negatives Geld). */
  faults: string[];
}

const DAY = 86_400;

/** Streuung der Sitzungszeiten, damit keine Schwelle zufällig genau vor der Nacht liegt. */
const JITTER_S = 45 * 60;

/**
 * Sitzungsbeginne ab der `first`-ten Sitzung des ersten Tages (Installationszeitpunkt),
 * je Sitzung um bis zu ±45 Min gestreut (geseedet, deterministisch).
 */
function sessionStarts(p: Policy, maxDays: number, first: number, seed: number): number[] {
  const rng = new Rng(seedRng(seed));
  const out: number[] = [];
  for (let d = 0; d < maxDays; d++) {
    for (const h of p.sessions) out.push(d * DAY + h * 3600 + (rng.next() * 2 - 1) * JITTER_S);
  }
  return out.slice(first % p.sessions.length);
}

/** Der Spieler kann das Ziel aus Erträgen bis zum nächsten Tag bezahlen → sparen statt bauen. */
function savingForGoal(s: GameState, era: EraId): boolean {
  const e = eraState(s, era);
  const goal = eraDef(era).goal;
  if (!e.unlocked.includes(goal.id) || e.goalBuilt) return false;
  const perDay = eraFlow(s, era, { boost: false })
    .income.mul(OFFLINE_EFFICIENCY * Math.min(DAY, 4 * OFFLINE_CAP_S))
    .add(e.money);
  return perDay.gte(goal.cost);
}

/** docs/03 §9: „kauft immer den besten Engpass-Kauf“ – den Vorschlag aus `bottleneck()`. */
export function bestPurchase(s: GameState, era: EraId): string | null {
  return bottleneck(s, era).building;
}

function apply(s: GameState, cmds: Command[]): GameState {
  return step(s, cmds, { dt: 0, mode: 'offline' }).state;
}

/** Alle Käufe einer Sitzungssekunde: Ziel, Neustart oder bester Kauf, solange Deckung. */
function shop(s: GameState, era: EraId): GameState {
  const goal = eraDef(era).goal;
  for (let guard = 0; guard < 10_000; guard++) {
    const e = eraState(s, era);
    if (!e.goalBuilt && e.unlocked.includes(goal.id) && e.money.gte(goal.cost)) {
      return apply(s, [{ type: 'buildGoal', era }]);
    }
    if (savingForGoal(s, era)) return s;
    if (!e.goalBuilt && prestigePreview(s, era).worthIt) {
      s = apply(s, [{ type: 'resetEra', era }]);
      continue;
    }
    const id = bestPurchase(s, era);
    const b = id ? eraDef(era).buildings.find((x) => x.id === id) : undefined;
    if (!id || !b || costFor(b, e.levels[id] ?? 0, 1).gt(e.money)) return s;
    s = apply(s, [{ type: 'buy', era, building: id, amount: 1 }]);
  }
  return s;
}

export function runPolicy(
  id: PolicyId,
  opts: { maxDays: number; seed?: number; firstSession?: number },
): RunResult {
  const p = POLICY[id];
  const era: EraId = 'harbor';
  const seed = opts.seed ?? 1;
  let s = newGame(seed);
  const starts = sessionStarts(p, opts.maxDays, opts.firstSession ?? 0, seed);
  const t0 = starts[0]!;
  const faults: string[] = [];
  const resets: RunResult['resets'] = [];
  const days: DaySnapshot[] = [];
  let goalDay: number | null = null;
  let clock = t0;
  let nextSnapshot = t0 + DAY;

  for (const start of starts) {
    if (start > clock) {
      s = offline(s, start - clock).state;
      s = apply(s, [{ type: 'claimOffline', boosted: p.ads, day: Math.floor(clock / DAY) }]);
      clock = start;
    }
    while (clock >= nextSnapshot) {
      days.push(snapshot(s, era, Math.round((nextSnapshot - t0) / DAY)));
      nextSnapshot += DAY;
    }
    if (p.ads) s = apply(s, [{ type: 'applyReward', kind: 'boost', day: Math.floor(clock / DAY) }]);
    for (let sec = 0; sec < p.sessionSeconds; sec++) {
      const before = eraState(s, era);
      const resetsBefore = before.resets;
      s = shop(s, era);
      const e = eraState(s, era);
      if (e.resets > resetsBefore) {
        resets.push({ day: (clock - t0) / DAY, stars: e.starsEarned - before.starsEarned });
      }
      if (e.goalBuilt && goalDay === null) goalDay = (clock - t0) / DAY;
      const crane = (e.levels.crane ?? 0) > 0;
      const taps = crane ? p.tapsAfterCrane : p.tapsBeforeCrane;
      s = step(s, [], { dt: 1, mode: 'offline', tapsPerSecond: taps }).state;
      clock += 1;
      if (!e.money.isFinite() || e.money.isNegative()) faults.push(`Geld ungültig bei t=${clock}`);
    }
    if (goalDay !== null) break;
  }
  days.push(snapshot(s, era, (clock - t0) / DAY));
  return { policy: id, era, goalDay, resets, days, faults };
}

function snapshot(s: GameState, era: EraId, day: number): DaySnapshot {
  const e = eraState(s, era);
  return {
    day,
    lifetime: e.lifetimeEarnings,
    stars: e.starsEarned,
    levels: { ...e.levels },
    incomePerSec: eraFlow(s, era, { boost: false }).income,
  };
}

export interface JourneyResult {
  firstPurchase: number | null;
  crane: number | null;
}

/**
 * Erste Minuten diskret (FR-K02, M3-Exit): tippt 3×/s auf das liegende Boot und kauft
 * den besten Kauf, sobald er bezahlbar ist.
 */
export function runJourney(seed = 1, seconds = 600): JourneyResult {
  let s = newGame(seed);
  let firstPurchase: number | null = null;
  let crane: number | null = null;
  for (let i = 0; i < seconds * 10; i++) {
    const e = eraState(s, 'harbor');
    const cmds: Command[] = [];
    const v = e.vehicles.find((x) => x.phase === 'docked');
    if (v && i % 3 === 0 && (e.levels.crane ?? 0) === 0) {
      cmds.push({ type: 'tapVehicle', era: 'harbor', vehicleId: v.id });
    }
    const id = bestPurchase(s, 'harbor');
    if (id) cmds.push({ type: 'buy', era: 'harbor', building: id, amount: 1 });
    const r = step(s, cmds, { dt: 0.1, mode: 'active' });
    for (const n of r.notices) {
      if (n.ref !== 'buy.done') continue;
      firstPurchase ??= s.time;
      if (n.args.building === 'crane') crane ??= s.time;
    }
    s = r.state;
  }
  return { firstPurchase, crane };
}

export interface Spread {
  p50: number;
  p90: number;
  max: number;
}

export interface JourneyStats {
  runs: number;
  firstPurchase: Spread;
  crane: Spread;
}

function spread(values: number[]): Spread {
  const v = [...values].sort((a, b) => a - b);
  const at = (p: number) => v[Math.min(v.length - 1, Math.floor(p * v.length))] ?? Infinity;
  return { p50: at(0.5), p90: at(0.9), max: v[v.length - 1] ?? Infinity };
}

/**
 * Einstieg über viele Installationen (D-040): Ankünfte sind Poisson-verteilt, ein einzelner
 * Seed sagt wenig. Nicht erreicht zählt als unendlich.
 */
export function journeyStats(runs = 100, seconds = 300): JourneyStats {
  const first: number[] = [];
  const crane: number[] = [];
  for (let i = 0; i < runs; i++) {
    const r = runJourney(i * 7919 + 13, seconds);
    first.push(r.firstPurchase ?? Infinity);
    crane.push(r.crane ?? Infinity);
  }
  return { runs, firstPurchase: spread(first), crane: spread(crane) };
}
