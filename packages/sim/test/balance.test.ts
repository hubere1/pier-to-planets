import { describe, expect, it } from 'vitest';
import { bestPurchase, journeyStats, runJourney, runPolicy } from '../src/balance/policies.ts';
import { bottleneck } from '../src/econ/bottleneck.ts';
import { newGame, step, DT } from '../src/index.ts';

const clock = (globalThis as unknown as { performance: { now(): number } }).performance;

describe('Balancing-Policies (docs/03 §9)', () => {
  it('casual kauft den Engpass-Vorschlag der Sim', () => {
    const s = newGame(1);
    expect(bestPurchase(s, 'harbor')).toBe(bottleneck(s, 'harbor').building);
  });

  it('ein Lauf ist deterministisch und ohne Fehler', () => {
    const a = runPolicy('casual', { maxDays: 3, seed: 4, firstSession: 2 });
    const b = runPolicy('casual', { maxDays: 3, seed: 4, firstSession: 2 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.faults).toEqual([]);
    expect(a.goalDay).not.toBeNull();
  });

  it('Einstieg: erster Kauf ≤ 60 s, Kran ≤ 5 Min (FR-K02)', () => {
    const j = runJourney(1, 300);
    expect(j.firstPurchase).not.toBeNull();
    expect(j.firstPurchase!).toBeLessThanOrEqual(60);
    expect(j.crane!).toBeLessThanOrEqual(300);
  });

  it('Einstieg über 100 Installationen: auch bei Pech mit den Ankünften erster Kauf ≤ 60 s (D-040)', () => {
    const j = journeyStats(100, 300);
    expect(j.firstPurchase.p90).toBeLessThanOrEqual(60);
    expect(j.firstPurchase.max).toBeLessThanOrEqual(60);
    expect(j.crane.max).toBeLessThanOrEqual(300);
  });
});

describe('Performance (docs/02 NFR-P)', () => {
  it('ein Sim-Schritt dauert < 1 ms, auch mit vollem Hafen', () => {
    let s = newGame(1);
    const h = s.eras.harbor!;
    h.levels = { ...h.levels, pier: 200, crane: 150, warehouse: 150, fishMarket: 100 };
    h.unlocked = Object.keys(h.levels);
    for (let i = 0; i < 600; i++) s = step(s, [], { dt: DT, mode: 'active' }).state;
    const n = 5000;
    const t0 = clock.now();
    for (let i = 0; i < n; i++) s = step(s, [], { dt: DT, mode: 'active' }).state;
    expect((clock.now() - t0) / n).toBeLessThan(1);
  });
});
