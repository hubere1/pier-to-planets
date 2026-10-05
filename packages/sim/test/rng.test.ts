import { describe, expect, it } from 'vitest';
import { Rng, seedRng } from '../src/rng/index.ts';

describe('Rng (docs/03 §1: Zufall aus geseedetem Rng im State)', () => {
  it('liefert bei gleichem Zustand dieselbe Folge', () => {
    const a = new Rng(seedRng(42));
    const b = new Rng(seedRng(42));
    const xs = Array.from({ length: 5 }, () => a.next());
    const ys = Array.from({ length: 5 }, () => b.next());
    expect(xs).toEqual(ys);
  });

  it('setzt nach Speichern des Zustands genau dort fort', () => {
    const a = new Rng(seedRng(7));
    a.next();
    a.next();
    const saved = a.state;
    const expected = a.next();
    expect(new Rng(saved).next()).toBe(expected);
    expect(Number.isInteger(saved)).toBe(true);
    expect(saved).toBeGreaterThanOrEqual(0);
    expect(saved).toBeLessThan(2 ** 32);
  });

  it('verteilt gleichmäßig in [0, 1)', () => {
    const r = new Rng(seedRng(1));
    let sum = 0;
    let min = 1;
    let max = 0;
    const n = 100_000;
    for (let i = 0; i < n; i++) {
      const x = r.next();
      sum += x;
      min = Math.min(min, x);
      max = Math.max(max, x);
    }
    expect(sum / n).toBeCloseTo(0.5, 2);
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThan(1);
  });

  it('zieht exponentialverteilte Werte mit Mittel 1', () => {
    const r = new Rng(seedRng(3));
    let sum = 0;
    const n = 100_000;
    for (let i = 0; i < n; i++) sum += r.exp1();
    expect(sum / n).toBeCloseTo(1, 1);
  });

  it('unterscheidet verschiedene Seeds', () => {
    expect(new Rng(seedRng(1)).next()).not.toBe(new Rng(seedRng(2)).next());
  });
});
