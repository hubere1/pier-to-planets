/**
 * Offline-Ertrag (docs/03 §7, D-008): F aller Ären · Mult ohne Boost · Effizienz ·
 * min(Abwesenheit, Deckel). Uhr rückwärts = 0, Sprung > 30 Tage = Deckel.
 * Abwesenheit < 60 s holt die App nahtlos mit aktiven Schritten nach.
 */
import type { EraId } from '@ptp/content';
import { Num } from '../num/index.ts';
import { cloneState, eraState, type GameState } from '../model/state.ts';
import { eraFlow, visibleArrivals } from '../econ/flow.ts';
import { checkUnlocks, earn } from '../engine/step.ts';
import type { Notice, StepResult } from '../engine/types.ts';
import { OFFLINE_CAP_S, OFFLINE_EFFICIENCY, OFFLINE_MAX_JUMP_S, OFFLINE_MIN_S } from '../rules.ts';

export interface OfflinePreview {
  /** Gewertete Sekunden nach Deckel. */
  counted: number;
  capped: boolean;
  cap: number;
  efficiency: number;
  earned: Num;
  byEra: Partial<Record<EraId, Num>>;
}

/** Gewertete Abwesenheit: negativ → 0, über 30 Tage → Deckel (Uhr verstellt). */
export function countedSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  if (seconds > OFFLINE_MAX_JUMP_S) return OFFLINE_CAP_S;
  return Math.min(seconds, OFFLINE_CAP_S);
}

export function offlinePreview(s: GameState, seconds: number): OfflinePreview {
  const counted = countedSeconds(seconds);
  const byEra: Partial<Record<EraId, Num>> = {};
  let earned = Num.ZERO;
  for (const era of Object.keys(s.eras) as EraId[]) {
    const amount = eraFlow(s, era, { boost: false }).income.mul(OFFLINE_EFFICIENCY * counted);
    byEra[era] = amount;
    earned = earned.add(amount);
  }
  return {
    counted,
    capped: seconds > OFFLINE_CAP_S,
    cap: OFFLINE_CAP_S,
    efficiency: OFFLINE_EFFICIENCY,
    earned,
    byEra,
  };
}

export function offline(prev: GameState, seconds: number): StepResult<GameState> {
  if (!(seconds >= OFFLINE_MIN_S)) return { state: prev, notices: [] };
  const s = cloneState(prev);
  const notices: Notice[] = [];
  const p = offlinePreview(s, seconds);
  for (const era of Object.keys(s.eras) as EraId[]) {
    const e = eraState(s, era);
    const f = eraFlow(s, era, { boost: false });
    const load = visibleArrivals(f).load;
    if (load > 0) e.served += (f.F / load) * OFFLINE_EFFICIENCY * p.counted;
    earn(e, p.byEra[era] ?? Num.ZERO);
    checkUnlocks(s, era, notices);
  }
  s.time += Math.min(seconds, OFFLINE_MAX_JUMP_S);
  s.lastOffline = {
    earned: p.earned,
    byEra: p.byEra,
    seconds,
    counted: p.counted,
    doubled: false,
  };
  notices.unshift({
    ref: 'offline.summary',
    args: {
      earned: p.earned.serialize(),
      seconds,
      counted: p.counted,
      capped: p.capped ? 1 : 0,
    },
  });
  return { state: s, notices };
}
