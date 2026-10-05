import { describe, expect, it } from 'vitest';
import { Num } from '../src/num/index.ts';
import { newGame, type GameState } from '../src/model/state.ts';
import { step } from '../src/engine/step.ts';
import type { Command, Notice } from '../src/engine/types.ts';
import { eraFlow } from '../src/econ/flow.ts';
import { costFor } from '../src/econ/cost.ts';
import { harbor } from '@ptp/content';
import { DT, REWARD_LIMITS } from '../src/rules.ts';

const active = { dt: DT, mode: 'active' as const };

function run(s: GameState, seconds: number, cmdsAt?: (s: GameState) => Command[]): GameState {
  let cur = s;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    cur = step(cur, cmdsAt?.(cur) ?? [], active).state;
  }
  return cur;
}

function withLevels(levels: Record<string, number>, seed = 1): GameState {
  const s = newGame(seed);
  const h = s.eras.harbor!;
  h.levels = { ...h.levels, ...levels };
  h.unlocked = [...harbor.buildings.map((b) => b.id), harbor.goal.id];
  return s;
}

const harborOf = (s: GameState) => s.eras.harbor!;
const refs = (n: Notice[]) => n.map((x) => x.ref);

describe('step() Grundvertrag (docs/04)', () => {
  it('Commands verbrauchen keine Zeit (Lehre 2)', () => {
    const s = newGame(1);
    const r = step(s, [{ type: 'setBuyAmount', amount: 10 }], { dt: 0, mode: 'active' });
    expect(r.state.time).toBe(0);
    expect(r.state.buyAmount).toBe(10);
  });

  it('verändert den Eingangszustand nicht', () => {
    const s = newGame(1);
    const before = JSON.stringify(s);
    run(s, 30);
    step(s, [{ type: 'buy', era: 'harbor', building: 'pier' }], active);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('ist deterministisch: gleicher Seed + Commands → gleicher Zustand (NFR-Q07)', () => {
    const play = () =>
      run(newGame(99), 600, (s) => {
        const v = harborOf(s).vehicles.find((x) => x.phase === 'docked');
        const cmds: Command[] = [{ type: 'buy', era: 'harbor', building: 'pier' }];
        if (v) cmds.push({ type: 'tapVehicle', era: 'harbor', vehicleId: v.id });
        return cmds;
      });
    expect(JSON.stringify(play())).toBe(JSON.stringify(play()));
  });

  it('Seed bestimmt die Ankünfte', () => {
    const a = run(withLevels({ pier: 3, crane: 5, warehouse: 5 }, 1), 300);
    const b = run(withLevels({ pier: 3, crane: 5, warehouse: 5 }, 2), 300);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

describe('Schleife und Tippen (FR-K01, FR-K02, FR-K03)', () => {
  it('Tippen entlädt ohne Kran 5 % der Ladung, mindestens 1 Ware', () => {
    let s = run(newGame(1), 2.5);
    const v = harborOf(s).vehicles[0]!;
    expect(v.phase).toBe('docked');
    const r = step(s, [{ type: 'tapVehicle', era: 'harbor', vehicleId: v.id }], {
      dt: 0,
      mode: 'active',
    });
    s = r.state;
    expect(harborOf(s).vehicles[0]!.cargo).toBe(19);
    expect(harborOf(s).stock).toBe(1);
    expect(refs(r.notices)).toEqual(['tap.unloaded']);
  });

  it('ohne Tippen und ohne Kran entsteht kein Ertrag', () => {
    const s = run(newGame(1), 120);
    expect(harborOf(s).money.isZero()).toBe(true);
  });

  it('erster Kauf (Steg) in ≤ 60 s durch Tippen (FR-K02)', () => {
    let bought = -1;
    run(newGame(5), 60, (s) => {
      const cmds: Command[] = [];
      const v = harborOf(s).vehicles.find((x) => x.phase === 'docked');
      // 3 Tipps pro Sekunde
      if (v && Math.round(s.time * 10) % 3 === 0) {
        cmds.push({ type: 'tapVehicle', era: 'harbor', vehicleId: v.id });
      }
      if (bought < 0 && harborOf(s).money.gte(costFor(harbor.buildings[0]!, 1, 1))) {
        cmds.push({ type: 'buy', era: 'harbor', building: 'pier' });
        bought = s.time;
      }
      return cmds;
    });
    expect(bought).toBeGreaterThan(0);
    expect(bought).toBeLessThanOrEqual(60);
  });

  it('mit Kran entlädt die Sim selbst, Tippen gibt +1 % Bonus, höchstens 10-mal je Fahrzeug', () => {
    let s = withLevels({ pier: 1, crane: 1, warehouse: 1 });
    s = run(s, 2.5);
    const v = harborOf(s).vehicles[0]!;
    expect(v.phase).toBe('docked');
    const moneyBefore = harborOf(s).money.toNumber();
    const taps: Command[] = Array.from({ length: 12 }, () => ({
      type: 'tapVehicle' as const,
      era: 'harbor' as const,
      vehicleId: v.id,
    }));
    const r = step(s, taps, { dt: 0, mode: 'active' });
    expect(refs(r.notices).filter((x) => x === 'tap.bonus')).toHaveLength(10);
    expect(refs(r.notices).filter((x) => x === 'tap.denied')).toHaveLength(2);
    expect(harborOf(r.state).money.toNumber() - moneyBefore).toBeCloseTo(10 * 0.01 * 20, 9);
    const later = run(r.state, 30);
    expect(harborOf(later).served).toBeGreaterThanOrEqual(1);
  });

  it('A11y-Knopf „Entladen“ wirkt wie ein Tipp auf das erste liegende Fahrzeug', () => {
    const s = run(newGame(1), 2.5);
    const r = step(s, [{ type: 'unload', era: 'harbor' }], { dt: 0, mode: 'active' });
    expect(harborOf(r.state).stock).toBe(1);
    const none = step(newGame(1), [{ type: 'unload', era: 'harbor' }], { dt: 0, mode: 'active' });
    expect(none.notices[0]).toEqual({
      ref: 'tap.denied',
      args: { era: 'harbor', reason: 'noVehicle' },
    });
  });
});

describe('Kaufen (FR-K04, FR-K07)', () => {
  it('ohne Deckung: Ablehnung mit fehlendem Betrag', () => {
    const r = step(newGame(1), [{ type: 'buy', era: 'harbor', building: 'pier' }], active);
    expect(r.notices[0]!.ref).toBe('buy.denied');
    expect(r.notices[0]!.args.reason).toBe('funds');
    const price = costFor(harbor.buildings[0]!, 1, 1).toNumber();
    expect(Num.parse(r.notices[0]!.args.missing)?.toNumber()).toBeCloseTo(price, 9);
    expect(r.state.eras.harbor!.levels.pier).toBe(1);
  });

  it('gesperrtes Gebäude nennt den Grund', () => {
    const s = newGame(1);
    harborOf(s).money = Num.of(1e9);
    const r = step(s, [{ type: 'buy', era: 'harbor', building: 'customs' }], active);
    expect(r.notices[0]!.args.reason).toBe('locked');
  });

  it('×10 zieht die geometrische Summe ab und meldet Meilensteine', () => {
    const s = newGame(1);
    harborOf(s).money = Num.of(1e6);
    const cost = costFor(harbor.buildings[2]!, 1, 10);
    const r = step(s, [{ type: 'buy', era: 'harbor', building: 'warehouse', amount: 10 }], {
      dt: 0,
      mode: 'active',
    });
    expect(harborOf(r.state).levels.warehouse).toBe(11);
    expect(harborOf(r.state).money.toNumber()).toBeCloseTo(1e6 - cost.toNumber(), 6);
    expect(r.notices).toContainEqual({
      ref: 'milestone.reached',
      args: { era: 'harbor', building: 'warehouse', milestone: 1 },
    });
  });

  it('×Max kauft so viel wie möglich, nie ins Minus', () => {
    const s = newGame(1);
    harborOf(s).money = Num.of(5000);
    const r = step(s, [{ type: 'buy', era: 'harbor', building: 'pier', amount: 'max' }], {
      dt: 0,
      mode: 'active',
    });
    const h = harborOf(r.state);
    expect(h.levels.pier).toBeGreaterThan(20);
    expect(h.money.isNegative()).toBe(false);
    expect(h.money.lt(costFor(harbor.buildings[0]!, h.levels.pier!, 1))).toBe(true);
  });

  it('schaltet Gebäude über Lebenseinnahmen frei und meldet es', () => {
    const s = withLevels({ pier: 10, crane: 10, warehouse: 10 });
    harborOf(s).unlocked = ['pier', 'crane', 'warehouse'];
    harborOf(s).lifetimeEarnings = Num.of(499);
    harborOf(s).stock = 100;
    const r = step(s, [], active);
    expect(r.notices).toContainEqual({
      ref: 'building.unlocked',
      args: { era: 'harbor', building: 'fishMarket' },
    });
  });
});

describe('Diskret ≙ Erwartungswert (docs/03 §2: 1 h aktiv = Rate ±2 %)', () => {
  // Poisson-Rauschen einer Stunde liegt bei ~3 % (900 Ankünfte); gemittelt über 10 Seeds
  // bleibt die Aussage „Mittel = Rate“ prüfbar (D-032).
  const cases: [string, Record<string, number>][] = [
    ['Ankunft begrenzt', { pier: 5, crane: 10, warehouse: 30 }],
    ['Entladen begrenzt', { pier: 20, crane: 1, warehouse: 30 }],
    ['Absatz begrenzt', { pier: 20, crane: 10, warehouse: 3 }],
    ['viele Ankünfte (gedeckelte Darstellung)', { pier: 60, crane: 30, warehouse: 30 }],
  ];
  for (const [name, levels] of cases) {
    it(name, () => {
      let sum = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const s0 = withLevels(levels, seed);
        const expected = eraFlow(s0, 'harbor', { boost: false }).income.toNumber() * 3600;
        const warm = run(s0, 120);
        const start = harborOf(warm).runEarnings.toNumber();
        const end = harborOf(run(warm, 3600)).runEarnings.toNumber();
        sum += (end - start) / expected;
      }
      expect(sum / 10).toBeGreaterThan(0.98);
      expect(sum / 10).toBeLessThan(1.02);
    });
  }
});

describe('Ziel-Gebäude (docs/03 §4.2)', () => {
  it('erst gesperrt, dann bezahlbar, dann gebaut', () => {
    const s = newGame(1);
    let r = step(s, [{ type: 'buildGoal', era: 'harbor' }], active);
    expect(r.notices[0]!.args.reason).toBe('locked');
    const h = harborOf(s);
    h.unlocked.push(harbor.goal.id);
    h.money = Num.of(harbor.goal.cost);
    r = step(s, [{ type: 'buildGoal', era: 'harbor' }], { dt: 0, mode: 'active' });
    expect(refs(r.notices)).toEqual(['goal.built']);
    expect(harborOf(r.state).goalBuilt).toBe(true);
    expect(harborOf(r.state).money.isZero()).toBe(true);
  });
});

describe('Werbe-Boost (docs/03 §10, Lehre 8)', () => {
  it('gleitet in 2 s ein und aus, nie sprunghaft', () => {
    let s = withLevels({ pier: 5, crane: 10, warehouse: 10 });
    s = step(s, [{ type: 'applyReward', kind: 'boost', day: 1 }], active).state;
    let last = s.boost.level;
    for (let i = 0; i < 30; i++) {
      s = step(s, [], active).state;
      expect(Math.abs(s.boost.level - last)).toBeLessThanOrEqual(0.05 + 1e-12);
      last = s.boost.level;
    }
    expect(s.boost.level).toBe(1);
    expect(s.boost.remaining).toBeCloseTo(1800 - 3.1, 6);
  });

  it('höchstens 6 je Tag, neuer Tag setzt zurück, Restzeit nie über 4 h', () => {
    let s = newGame(1);
    const boost = (day: number): Command => ({ type: 'applyReward', kind: 'boost', day });
    let r = step(
      s,
      Array.from({ length: 8 }, () => boost(3)),
      { dt: 0, mode: 'active' },
    );
    s = r.state;
    expect(s.boost.remaining).toBe(3 * 3600);
    expect(s.rewards.used.boost).toBe(REWARD_LIMITS.boost);
    expect(r.notices.filter((n) => n.ref === 'reward.denied').map((n) => n.args.reason)).toEqual([
      'limit',
      'limit',
    ]);
    r = step(s, [boost(4), boost(4), boost(4)], { dt: 0, mode: 'active' });
    expect(r.state.boost.remaining).toBe(4 * 3600);
    expect(r.notices.map((n) => n.args.reason ?? 'ok')).toEqual(['ok', 'ok', 'full']);
  });
});
