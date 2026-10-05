/**
 * Abgeleitete Views – Single Source für die UI (docs/04 § Views, Lehre 5).
 * Die UI rechnet nichts nach; Kosten, Gründe und Vorschauen kommen von hier.
 */
import type { EraId } from '@ptp/content';
import { Num } from '../num/index.ts';
import {
  eraDef,
  eraState,
  totalStars,
  type BuyAmount,
  type GameState,
  type VehiclePhase,
} from '../model/state.ts';
import { costFor as costForLevels, maxAffordable } from '../econ/cost.ts';
import { contribution, eraFlow } from '../econ/flow.ts';
import {
  APPROACH_S,
  LEAVE_S,
  milestonesReached,
  nextMilestone,
  previousMilestone,
} from '../rules.ts';

export { bottleneck } from '../econ/bottleneck.ts';
export { prestigePreview } from '../prestige/stars.ts';
export { offlinePreview } from '../offline/offline.ts';

export interface HudView {
  era: EraId;
  money: Num;
  /** Einnahmen/s der aktiven Ära im Erwartungswert, inkl. Boost. */
  incomePerSec: Num;
  stars: number;
  boostRemaining: number;
  /** 0..1, gleitet (Anzeige „×2“ blendet mit). */
  boostLevel: number;
}

export function hud(s: GameState): HudView {
  const e = eraState(s, s.activeEra);
  return {
    era: s.activeEra,
    money: e.money,
    incomePerSec: eraFlow(s, s.activeEra, { boost: true }).income,
    stars: totalStars(s),
    boostRemaining: s.boost.remaining,
    boostLevel: s.boost.level,
  };
}

/** Kosten von `n` Stufen ab der aktuellen Stufe (FR-K04). */
export function costFor(s: GameState, era: EraId, id: string, n: number): Num {
  const b = eraDef(era).buildings.find((x) => x.id === id);
  if (!b) throw new Error(`Unbekanntes Gebäude ${era}.${id}`);
  return costForLevels(b, eraState(s, era).levels[id] ?? 0, n);
}

export type BuyBlock = 'locked' | 'funds';

export interface BuildingCard {
  id: string;
  level: number;
  unlocked: boolean;
  /** Lebenseinnahmen, ab denen das Gebäude frei wird (Silhouette mit Bedingung). */
  unlockAtLifetime: number;
  /** Stufen, die der aktuelle Kaufmengen-Schalter kaufen würde (≥ 1). */
  amount: number;
  cost: Num;
  canBuy: boolean;
  /** Grund, wenn nicht kaufbar (Lehre 4: nie stumm grau). */
  blocked: BuyBlock | null;
  /** Fehlender Betrag bei `funds`. */
  missing: Num | null;
  /** Fortschritt zum nächsten Meilenstein (docs/03 §3: Balken zeigt Meilenstein). */
  milestone: { reached: number; from: number; next: number; progress: number };
  /** Aktuelle Wirkung auf der eigenen Stufe der Kette (Rohwert ohne Mult). */
  effect: number;
}

export function buildingCard(
  s: GameState,
  era: EraId,
  id: string,
  buyAmount: BuyAmount = s.buyAmount,
): BuildingCard {
  const b = eraDef(era).buildings.find((x) => x.id === id);
  if (!b) throw new Error(`Unbekanntes Gebäude ${era}.${id}`);
  const e = eraState(s, era);
  const level = e.levels[id] ?? 0;
  const unlocked = e.unlocked.includes(id);
  const max = maxAffordable(b, level, e.money);
  const amount = buyAmount === 'max' ? Math.max(1, max) : buyAmount;
  const cost = costForLevels(b, level, amount);
  const affordable = cost.lte(e.money);
  const blocked: BuyBlock | null = !unlocked ? 'locked' : affordable ? null : 'funds';
  const from = previousMilestone(level);
  const next = nextMilestone(level);
  return {
    id,
    level,
    unlocked,
    unlockAtLifetime: b.unlockAtLifetime,
    amount,
    cost,
    canBuy: blocked === null,
    blocked,
    missing: blocked === 'funds' ? cost.sub(e.money) : null,
    milestone: {
      reached: milestonesReached(level),
      from,
      next,
      progress: (level - from) / (next - from),
    },
    effect: contribution(b, level),
  };
}

export interface GoalProgress {
  id: string;
  cost: Num;
  unlocked: boolean;
  built: boolean;
  /** 0..1 Anteil des aktuellen Geldes an den Kosten. */
  progress: number;
  missing: Num;
}

export function goalProgress(s: GameState, era: EraId): GoalProgress {
  const goal = eraDef(era).goal;
  const e = eraState(s, era);
  const cost = Num.of(goal.cost);
  return {
    id: goal.id,
    cost,
    unlocked: e.unlocked.includes(goal.id),
    built: e.goalBuilt,
    progress: e.goalBuilt ? 1 : Math.min(1, e.money.div(cost).toNumber()),
    missing: Num.max(Num.ZERO, cost.sub(e.money)),
  };
}

export interface SceneVehicle {
  id: number;
  tier: string;
  phase: VehiclePhase;
  /** Fortschritt der Phase 0..1 (Anfahrt, Abfahrt) bzw. Entladefortschritt (liegend). */
  progress: number;
  cargo: number;
  turnedAway: boolean;
}

export interface SceneView {
  /** Ausbaustufe je Gebäude = erreichte Meilensteine; der Renderer begrenzt auf seine Grafiken. */
  buildings: Record<string, { level: number; stage: number; unlocked: boolean }>;
  goal: { unlocked: boolean; built: boolean };
  vehicles: SceneVehicle[];
  /** Lagerfüllung in Waren (für Kisten-Stapel). */
  stock: number;
}

export function sceneView(s: GameState, era: EraId): SceneView {
  const def = eraDef(era);
  const e = eraState(s, era);
  const buildings: SceneView['buildings'] = {};
  for (const b of def.buildings) {
    const level = e.levels[b.id] ?? 0;
    buildings[b.id] = {
      level,
      stage: milestonesReached(level),
      unlocked: e.unlocked.includes(b.id),
    };
  }
  return {
    buildings,
    goal: { unlocked: e.unlocked.includes(def.goal.id), built: e.goalBuilt },
    vehicles: e.vehicles.map((v) => ({
      id: v.id,
      tier: def.vehicles[v.tier]?.id ?? def.vehicles[0]!.id,
      phase: v.phase,
      progress:
        v.phase === 'docked' || v.phase === 'waiting'
          ? v.load > 0
            ? 1 - v.cargo / v.load
            : 1
          : Math.min(1, v.t / (v.phase === 'approach' ? APPROACH_S : LEAVE_S)),
      cargo: v.cargo,
      turnedAway: v.turnedAway,
    })),
    stock: e.stock,
  };
}
