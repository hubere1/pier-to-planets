import { describe, expect, it } from 'vitest';
import { harbor } from '@ptp/content';
import { Num } from '../src/num/index.ts';
import { newGame, type GameState } from '../src/model/state.ts';
import { step } from '../src/engine/step.ts';
import { eraFlow } from '../src/econ/flow.ts';
import { offline, offlinePreview, countedSeconds } from '../src/offline/offline.ts';
import { prestigePreview, starsPossible, lifetimeForStars } from '../src/prestige/stars.ts';

function game(levels: Record<string, number>): GameState {
  const s = newGame(1);
  const h = s.eras.harbor!;
  h.levels = { ...h.levels, ...levels };
  h.unlocked = harbor.buildings.map((b) => b.id);
  return s;
}

const idle = { dt: 0, mode: 'active' as const };
// Sim-tsconfig kennt kein DOM/Node (D-021); im Test-Runner gibt es `performance` trotzdem.
const clock = (globalThis as unknown as { performance: { now(): number } }).performance;

describe('Offline (docs/03 §7, D-008, FR-P10)', () => {
  const s = game({ pier: 5, crane: 10, warehouse: 10 });
  const rate = eraFlow(s, 'harbor', { boost: false }).income.toNumber();

  it('zählt Abwesenheit bis 4 h, rückwärts = 0, über 30 Tage = Deckel', () => {
    expect(countedSeconds(-500)).toBe(0);
    expect(countedSeconds(3600)).toBe(3600);
    expect(countedSeconds(10 * 3600)).toBe(4 * 3600);
    expect(countedSeconds(40 * 86_400)).toBe(4 * 3600);
    expect(countedSeconds(Number.NaN)).toBe(0);
  });

  it('Ertrag = F · Preis · Mult · 50 % · min(Abwesenheit, Deckel)', () => {
    const r = offline(s, 2 * 3600);
    expect(r.state.eras.harbor!.money.toNumber()).toBeCloseTo(rate * 0.5 * 7200, 6);
    expect(r.notices[0]).toMatchObject({ ref: 'offline.summary', args: { counted: 7200 } });
    const capped = offline(s, 9 * 3600);
    expect(capped.state.eras.harbor!.money.toNumber()).toBeCloseTo(rate * 0.5 * 4 * 3600, 6);
    expect(capped.notices[0]!.args.capped).toBe(1);
  });

  it('Vorschau aus derselben Funktion wie die Gutschrift (Lehre 5)', () => {
    const p = offlinePreview(s, 5000);
    const r = offline(s, 5000);
    expect(r.state.eras.harbor!.money.eq(p.earned)).toBe(true);
    expect(r.state.lastOffline?.earned.eq(p.earned)).toBe(true);
  });

  it('< 60 s ändert nichts (App holt nahtlos nach); Uhr rückwärts bringt nichts', () => {
    expect(offline(s, 59).state).toBe(s);
    expect(offline(s, -86_400).state).toBe(s);
  });

  it('Werbe-Boost zählt offline nicht und läuft offline nicht ab (D-032)', () => {
    const boosted = step(s, [{ type: 'applyReward', kind: 'boost', day: 1 }], idle).state;
    boosted.boost.level = 1;
    const r = offline(boosted, 3600);
    expect(r.state.eras.harbor!.money.toNumber()).toBeCloseTo(rate * 0.5 * 3600, 6);
    expect(r.state.boost.remaining).toBe(1800);
  });

  it('×2 per Werbung verdoppelt genau einmal; Schließen ohne Werbung gibt nichts extra', () => {
    const once = offline(s, 3600).state;
    const single = once.eras.harbor!.money;
    const doubled = step(once, [{ type: 'claimOffline', boosted: true, day: 1 }], idle).state;
    expect(doubled.eras.harbor!.money.toNumber()).toBeCloseTo(single.toNumber() * 2, 6);
    expect(doubled.lastOffline).toBeNull();
    const again = step(doubled, [{ type: 'claimOffline', boosted: true, day: 1 }], idle).state;
    expect(again.eras.harbor!.money.eq(doubled.eras.harbor!.money)).toBe(true);
    const plain = step(once, [{ type: 'claimOffline', boosted: false, day: 1 }], idle).state;
    expect(plain.eras.harbor!.money.eq(single)).toBe(true);
  });

  it('×2 per Werbung höchstens einmal am Tag (D-034), am nächsten Tag wieder', () => {
    const first = step(
      offline(s, 3600).state,
      [{ type: 'claimOffline', boosted: true, day: 5 }],
      idle,
    );
    const second = step(
      offline(first.state, 3600).state,
      [{ type: 'claimOffline', boosted: true, day: 5 }],
      idle,
    );
    expect(second.notices).toContainEqual({
      ref: 'reward.denied',
      args: { kind: 'offlineDouble', reason: 'limit' },
    });
    expect(second.state.lastOffline).toBeNull();
    const nextDay = step(
      offline(first.state, 3600).state,
      [{ type: 'claimOffline', boosted: true, day: 6 }],
      idle,
    );
    expect(nextDay.notices.map((n) => n.ref)).toEqual(['offline.doubled']);
  });

  it('schaltet Gebäude frei und meldet es im Rückkehr-Dialog (Lehre 3)', () => {
    const g = game({ pier: 5, crane: 10, warehouse: 10 });
    g.eras.harbor!.unlocked = ['pier', 'crane', 'warehouse'];
    const r = offline(g, 4 * 3600);
    expect(r.notices.map((n) => n.ref)).toContain('building.unlocked');
  });

  it('24 h offline in < 50 ms (NFR-P)', () => {
    const t0 = clock.now();
    for (let i = 0; i < 20; i++) offline(s, 86_400);
    expect((clock.now() - t0) / 20).toBeLessThan(50);
  });
});

describe('Sterne-Prestige (docs/03 §4.1, FR-P02)', () => {
  it('SterneMöglich = floor(10 · (L / Schwelle)^0,5)', () => {
    const S = harbor.starThreshold;
    expect(starsPossible(Num.ZERO, S)).toBe(0);
    expect(starsPossible(Num.of(S), S)).toBe(10);
    expect(starsPossible(Num.of(S * 4), S)).toBe(20);
    expect(starsPossible(Num.of(S * 0.0099), S)).toBe(0);
    expect(starsPossible(Num.of(S * 0.01), S)).toBe(1);
    expect(lifetimeForStars(20, S).toNumber()).toBeCloseTo(S * 4, 3);
  });

  it('Neustart: nur Sterne-Differenz, Geld/Gebäude/Fahrzeuge zurück, Freischaltungen bleiben', () => {
    const s = game({ pier: 30, crane: 20, warehouse: 40, fishMarket: 5 });
    const h = s.eras.harbor!;
    h.lifetimeEarnings = Num.of(harbor.starThreshold);
    h.money = Num.of(12345);
    h.starsEarned = 4;
    const preview = prestigePreview(s, 'harbor');
    expect(preview.newStars).toBe(6);
    expect(preview.incomePct).toBeCloseTo(60, 9);
    expect(preview.speedup).toBeCloseTo(2 / 1.4, 9);

    const r = step(s, [{ type: 'resetEra', era: 'harbor' }], idle);
    const after = r.state.eras.harbor!;
    expect(r.notices).toContainEqual({ ref: 'era.reset', args: { era: 'harbor', stars: 6 } });
    expect(after.starsEarned).toBe(10);
    expect(after.money.isZero()).toBe(true);
    expect(after.levels).toEqual({
      pier: 1,
      crane: 0,
      warehouse: 1,
      fishMarket: 0,
      lighthouse: 0,
      shipyard: 0,
      customs: 0,
    });
    expect(after.unlocked).toEqual(h.unlocked);
    expect(after.lifetimeEarnings.eq(h.lifetimeEarnings)).toBe(true);
    expect(after.resets).toBe(1);
    expect(after.vehicles).toHaveLength(1);
  });

  it('Sterne wirken als +10 % je Stern auf die Einnahmen', () => {
    const s = game({ pier: 5, crane: 10, warehouse: 10 });
    const base = eraFlow(s, 'harbor', { boost: false }).income.toNumber();
    s.eras.harbor!.starsEarned = 7;
    expect(eraFlow(s, 'harbor', { boost: false }).income.toNumber()).toBeCloseTo(base * 1.7, 9);
  });

  it('ohne neue Sterne kein Neustart', () => {
    const r = step(newGame(1), [{ type: 'resetEra', era: 'harbor' }], idle);
    expect(r.notices[0]).toEqual({
      ref: 'reset.denied',
      args: { era: 'harbor', reason: 'noStars' },
    });
  });
});
