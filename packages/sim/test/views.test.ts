import { describe, expect, it } from 'vitest';
import { harbor } from '@ptp/content';
import {
  Num,
  buildingCard,
  costFor,
  goalProgress,
  hud,
  newGame,
  sceneView,
  step,
} from '../src/index.ts';

describe('Views (docs/04 § Views, Lehre 4 + 5)', () => {
  it('hud zeigt Geld, Einnahmen/s und Sterne der aktiven Ära', () => {
    const s = newGame(1);
    s.eras.harbor!.levels.crane = 2;
    const v = hud(s);
    expect(v.era).toBe('harbor');
    expect(v.money.isZero()).toBe(true);
    // A = 1, E = 3, V = 1,2 → F = 1 Ware/s · 1 Taler
    expect(v.incomePerSec.toNumber()).toBeCloseTo(1, 9);
    expect(v.stars).toBe(0);
  });

  it('buildingCard nennt Grund und fehlenden Betrag statt stumm grau', () => {
    const s = newGame(1);
    s.eras.harbor!.money = Num.of(10);
    const pier = buildingCard(s, 'harbor', 'pier');
    expect(pier).toMatchObject({ level: 1, unlocked: true, canBuy: false, blocked: 'funds' });
    expect(pier.missing?.toNumber()).toBeCloseTo(6.5, 9);
    const market = buildingCard(s, 'harbor', 'fishMarket');
    expect(market).toMatchObject({ blocked: 'locked', unlockAtLifetime: 500 });
  });

  it('Kosten in der Karte = costFor = tatsächlich abgezogener Betrag', () => {
    const s = newGame(1);
    s.eras.harbor!.money = Num.of(1e5);
    const card = buildingCard(s, 'harbor', 'warehouse', 10);
    expect(card.cost.eq(costFor(s, 'harbor', 'warehouse', 10))).toBe(true);
    const after = step(s, [{ type: 'buy', era: 'harbor', building: 'warehouse', amount: 10 }], {
      dt: 0,
      mode: 'active',
    }).state;
    expect(after.eras.harbor!.money.eq(Num.of(1e5).sub(card.cost))).toBe(true);
  });

  it('×Max zeigt die größte bezahlbare Menge, mindestens 1', () => {
    const s = newGame(1);
    s.eras.harbor!.money = Num.of(1000);
    const card = buildingCard(s, 'harbor', 'pier', 'max');
    expect(card.amount).toBeGreaterThan(1);
    expect(card.canBuy).toBe(true);
    s.eras.harbor!.money = Num.ZERO;
    expect(buildingCard(s, 'harbor', 'pier', 'max')).toMatchObject({ amount: 1, canBuy: false });
  });

  it('Fortschrittsbalken zeigt den nächsten Meilenstein', () => {
    const s = newGame(1);
    s.eras.harbor!.levels.warehouse = 17;
    expect(buildingCard(s, 'harbor', 'warehouse').milestone).toEqual({
      reached: 1,
      from: 10,
      next: 25,
      progress: 7 / 15,
    });
  });

  it('goalProgress und sceneView', () => {
    const s = newGame(1);
    s.eras.harbor!.money = Num.of(harbor.goal.cost / 4);
    expect(goalProgress(s, 'harbor')).toMatchObject({
      unlocked: false,
      built: false,
      progress: 0.25,
    });
    s.eras.harbor!.levels.warehouse = 26;
    const scene = sceneView(s, 'harbor');
    expect(scene.buildings.warehouse).toEqual({ level: 26, stage: 2, unlocked: true });
    expect(scene.vehicles[0]).toMatchObject({ tier: 'fishingBoat', phase: 'approach' });
    expect(scene.vehicles[0]!.progress).toBeCloseTo(4 / 6, 9);
  });
});
