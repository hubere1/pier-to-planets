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
    // A = 1, E = 24, V = 1,2 → F = 1 Ware/s · 1 Taler
    expect(v.incomePerSec.toNumber()).toBeCloseTo(1, 9);
    expect(v.stars).toBe(0);
  });

  it('buildingCard nennt Grund und fehlenden Betrag statt stumm grau', () => {
    const s = newGame(1);
    s.eras.harbor!.money = Num.of(10);
    const pier = buildingCard(s, 'harbor', 'pier');
    expect(pier).toMatchObject({ level: 1, unlocked: true, canBuy: false, blocked: 'funds' });
    expect(pier.missing?.toNumber()).toBeCloseTo(
      costFor(s, 'harbor', 'pier', 1).toNumber() - 10,
      9,
    );
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

  it('buildingCard zeigt Wirkung jetzt → nach Kauf aus der Sim (Lehre 5)', () => {
    const s = newGame(1);
    s.eras.harbor!.levels.crane = 9;
    const crane = buildingCard(s, 'harbor', 'crane', 1);
    expect(crane.effectKind).toBe('goods');
    expect(crane.effect).toBeCloseTo(9 * 12, 9);
    // Stufe 10 ist ein Meilenstein: Wirkung ×2
    expect(crane.effectAfter).toBeCloseTo(10 * 12 * 2, 9);
    const yard = buildingCard(s, 'harbor', 'shipyard', 10);
    expect(yard.effectKind).toBe('loadPct');
    expect(yard.effectAfter).toBeGreaterThan(yard.effect);
  });

  it('goalProgress und sceneView', () => {
    const s = newGame(1);
    s.eras.harbor!.money = Num.of(harbor.goal.cost / 4);
    const goal = goalProgress(s, 'harbor');
    expect(goal).toMatchObject({ unlocked: false, built: false });
    expect(goal.progress).toBeCloseTo(0.25, 12);
    s.eras.harbor!.levels.warehouse = 26;
    const scene = sceneView(s, 'harbor');
    expect(scene.buildings.warehouse).toEqual({ level: 26, stage: 2, unlocked: true });
    expect(scene.vehicles[0]).toMatchObject({ tier: 'fishingBoat', phase: 'approach' });
    expect(scene.vehicles[0]!.progress).toBeCloseTo(4 / 6, 9);
    expect(scene.stockFill).toBe(0);
  });

  it('sceneView.stockFill: Lagerfüllung 0..1 für den Kistenstapel', () => {
    const s = newGame(1);
    const e = s.eras.harbor!;
    // V = 1,2 Waren/s (Lagerhalle 1) → Puffer 20 s = 24 Waren
    e.stock = 12;
    expect(sceneView(s, 'harbor').stockFill).toBeCloseTo(0.5, 9);
    e.stock = 100;
    expect(sceneView(s, 'harbor').stockFill).toBe(1);
  });
});
