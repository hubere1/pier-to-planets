import { describe, expect, it } from 'vitest';
import { harbor, type BuildingDef } from '@ptp/content';
import { Num } from '../src/num/index.ts';
import { costFor, maxAffordable } from '../src/econ/cost.ts';
import { bottleneckStage, contribution, stageRates, visibleArrivals } from '../src/econ/flow.ts';
import { bottleneck } from '../src/econ/bottleneck.ts';
import { milestonesReached, nextMilestone, previousMilestone } from '../src/rules.ts';
import { newGame } from '../src/model/state.ts';

const b: BuildingDef = {
  id: 'x',
  stage: 'sales',
  effect: 'goods',
  perLevel: 2,
  baseCost: 10,
  growth: 1.15,
  startLevel: 0,
  unlockAtLifetime: 0,
};

describe('Kosten (docs/03 §3, FR-K04)', () => {
  it('Stufe n → n+1 kostet basis · wachstum^n', () => {
    expect(costFor(b, 0, 1).toNumber()).toBeCloseTo(10, 9);
    expect(costFor(b, 3, 1).toNumber()).toBeCloseTo(10 * 1.15 ** 3, 9);
  });

  it('summiert mehrere Stufen geometrisch', () => {
    let sum = 0;
    for (let i = 5; i < 15; i++) sum += 10 * 1.15 ** i;
    expect(costFor(b, 5, 10).toNumber()).toBeCloseTo(sum, 6);
    expect(costFor(b, 5, 0).isZero()).toBe(true);
  });

  it('×Max ist das größte n mit Deckung', () => {
    for (const money of [0, 9.99, 10, 21.5, 1e4, 1e30]) {
      const m = Num.of(money);
      const n = maxAffordable(b, 7, m);
      expect(costFor(b, 7, n).lte(m)).toBe(true);
      expect(costFor(b, 7, n + 1).gt(m)).toBe(true);
    }
  });

  it('bleibt bei riesigen Beträgen endlich', () => {
    const n = maxAffordable(b, 0, Num.of('1e300'));
    expect(n).toBeGreaterThan(4000);
    expect(costFor(b, 0, n).isFinite()).toBe(true);
  });
});

describe('Meilensteine (docs/03 §3)', () => {
  it('10/25/50/100/200/300 …', () => {
    const at = [0, 9, 10, 24, 25, 50, 99, 100, 199, 200, 299, 300, 1000];
    expect(at.map(milestonesReached)).toEqual([0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6, 13]);
    expect([0, 10, 30, 100, 250].map(nextMilestone)).toEqual([10, 25, 50, 200, 300]);
    expect([0, 12, 30, 100, 250].map(previousMilestone)).toEqual([0, 10, 25, 100, 200]);
  });

  it('verdoppelt die Wirkung je Meilenstein', () => {
    expect(contribution(b, 9)).toBe(18);
    expect(contribution(b, 10)).toBe(40);
    expect(contribution(b, 25)).toBe(200);
  });
});

describe('Fluss mit Engpass (docs/03 §2)', () => {
  it('A = λ · Ladung, F = min(A, E, V)', () => {
    const r = stageRates(harbor, { pier: 2, crane: 1, warehouse: 1 });
    expect(r.arrivals).toBeCloseTo(0.1, 12);
    expect(r.load).toBe(20);
    expect(r.A).toBeCloseTo(2, 12);
    expect(r.E).toBeCloseTo(1.5, 12);
    expect(r.V).toBeCloseTo(1.2, 12);
    expect(bottleneckStage(r)).toBe('sales');
  });

  it('Leuchtturm hebt λ, Werft die Ladung', () => {
    const r = stageRates(harbor, { pier: 1, lighthouse: 5, shipyard: 10 });
    expect(r.arrivals).toBeCloseTo(0.05 * 1.5, 12);
    expect(r.load).toBeCloseTo(20 * (1 + 0.1 * 10 * 2), 12);
  });

  it('deckelt sichtbare Ankünfte, ohne A zu ändern (D-032)', () => {
    const r = stageRates(harbor, { pier: 40 });
    const v = visibleArrivals(r);
    expect(v.rate).toBe(0.25);
    expect(v.rate * v.load).toBeCloseTo(r.A, 9);
  });
});

describe('bottleneck() (FR-K05)', () => {
  it('nennt am Start den Kran, weil ohne Kran nur Tippen entlädt', () => {
    const bn = bottleneck(newGame(1), 'harbor');
    expect(bn.stage).toBe('unload');
    expect(bn.building).toBe('crane');
    expect(bn.gainPct).toBeNull();
  });

  it('nennt die Lagerhalle, wenn der Absatz begrenzt, mit Wirkungsvorschau', () => {
    const s = newGame(1);
    s.eras.harbor!.levels = { ...s.eras.harbor!.levels, pier: 4, crane: 3 };
    const bn = bottleneck(s, 'harbor');
    expect(bn.stage).toBe('sales');
    expect(bn.building).toBe('warehouse');
    // V 1,2 → 2,4; A = 4, E = 4,5 → F 1,2 → 2,4 = +100 %
    expect(bn.gainPct).toBeCloseTo(100, 6);
    expect(bn.gainPerSec.toNumber()).toBeCloseTo(1.2, 6);
  });
});
