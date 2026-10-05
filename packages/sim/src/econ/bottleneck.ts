/**
 * Engpass und Wirkungsvorschau (docs/03 §2, FR-K05): welches Gebäude begrenzt gerade,
 * und wie viel mehr bringt eine Stufe davon.
 */
import type { EraId, FlowStage } from '@ptp/content';
import { Num } from '../num/index.ts';
import { eraDef, eraState, type GameState } from '../model/state.ts';
import { costFor } from './cost.ts';
import {
  bottleneckStage,
  flowOf,
  multiplier,
  stageRates,
  stageValue,
  type StageRates,
} from './flow.ts';

export interface PurchaseOption {
  building: string;
  stage: FlowStage;
  cost: Num;
  /** Fluss nach dem Kauf einer Stufe (Waren/s). */
  flowAfter: number;
  /** Zuwachs der eigenen Stufe der Kette (Waren/s). */
  stageGain: number;
}

export interface Bottleneck {
  stage: FlowStage;
  /** Gebäude mit dem besten Stufen-Zuwachs je Taler in der Engpass-Stufe; `null` = keins frei. */
  building: string | null;
  rates: StageRates;
  flow: number;
  /** Mehr Einnahmen/s durch eine Stufe dieses Gebäudes (inkl. Mult, ohne Boost). */
  gainPerSec: Num;
  /** Zuwachs in Prozent; `null`, wenn der Fluss noch 0 ist. */
  gainPct: number | null;
}

/** Wirkung einer Stufe für jedes freigeschaltete Gebäude der Ära. */
export function purchaseOptions(s: GameState, era: EraId): PurchaseOption[] {
  const def = eraDef(era);
  const e = eraState(s, era);
  const now = stageRates(def, e.levels);
  const out: PurchaseOption[] = [];
  for (const b of def.buildings) {
    if (!e.unlocked.includes(b.id)) continue;
    const level = e.levels[b.id] ?? 0;
    const after = stageRates(def, { ...e.levels, [b.id]: level + 1 });
    out.push({
      building: b.id,
      stage: b.stage,
      cost: costFor(b, level, 1),
      flowAfter: flowOf(after),
      stageGain: stageValue(after, b.stage) - stageValue(now, b.stage),
    });
  }
  return out;
}

export function bottleneck(s: GameState, era: EraId): Bottleneck {
  const def = eraDef(era);
  const e = eraState(s, era);
  const rates = stageRates(def, e.levels);
  const flow = flowOf(rates);
  const stage = bottleneckStage(rates);
  let best: PurchaseOption | null = null;
  let bestRatio = -1;
  for (const o of purchaseOptions(s, era)) {
    if (o.stage !== stage) continue;
    const ratio = o.stageGain / o.cost.toNumber();
    if (ratio > bestRatio) {
      best = o;
      bestRatio = ratio;
    }
  }
  const gainFlow = best ? best.flowAfter - flow : 0;
  return {
    stage,
    building: best?.building ?? null,
    rates,
    flow,
    gainPerSec: Num.of(gainFlow * def.price).mul(multiplier(s, { boost: false })),
    gainPct: flow > 0 ? (gainFlow / flow) * 100 : null,
  };
}
