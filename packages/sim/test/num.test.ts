import { describe, expect, it } from 'vitest';
import { Num } from '../src/num/index.ts';

describe('Num (D-005, NFR-Q05)', () => {
  it('rechnet Grundarten und vergleicht', () => {
    const a = Num.of(1500);
    const b = Num.of('2.5e3');
    expect(a.add(b).toNumber()).toBe(4000);
    expect(b.sub(a).toNumber()).toBe(1000);
    expect(a.mul(2).toNumber()).toBe(3000);
    expect(b.div(Num.of(5)).toNumber()).toBe(500);
    expect(a.lt(b)).toBe(true);
    expect(b.gte(Num.of(2500))).toBe(true);
    expect(Num.max(a, b).eq(b)).toBe(true);
    expect(Num.min(a, b).eq(a)).toBe(true);
  });

  it('ist unveränderlich', () => {
    const a = Num.of(7);
    a.add(3);
    expect(a.toNumber()).toBe(7);
  });

  it('bleibt bis 1e300 exakt genug (relativer Fehler < 1e-12)', () => {
    const big = Num.of('4.2e300');
    const back = big.mul(1e10).div(1e10);
    expect(Math.abs(back.div(big).toNumber() - 1)).toBeLessThan(1e-12);
    expect(big.log10()).toBeCloseTo(300.6232, 3);
  });

  it('geht über den double-Bereich hinaus (1e9e15 laut D-005)', () => {
    const huge = Num.of('1e400').mul(Num.of('1e400'));
    expect(huge.log10()).toBeCloseTo(800, 9);
    expect(huge.isFinite()).toBe(true);
    expect(huge.gt(Num.of('1e300'))).toBe(true);
  });

  it('liefert Mantisse und Exponent für die Formatierung', () => {
    expect(Num.of(4200).parts()).toEqual({ mantissa: 4.2, exponent: 3 });
    expect(Num.of(0).parts()).toEqual({ mantissa: 0, exponent: 0 });
    const p = Num.of('9.87e123').parts();
    expect(p.exponent).toBe(123);
    expect(p.mantissa).toBeCloseTo(9.87, 12);
  });

  it('serialisiert verlustfrei als String und liest tolerant', () => {
    for (const v of ['0', '1', '123.456', '4.2e300', '1e1000', '-7.5']) {
      const n = Num.of(v);
      const s = n.serialize();
      expect(typeof s).toBe('string');
      expect(Num.parse(s)?.eq(n)).toBe(true);
    }
    expect(Num.parse('Unsinn')).toBeUndefined();
    expect(Num.parse(undefined)).toBeUndefined();
    expect(Num.parse(42)?.toNumber()).toBe(42);
    expect(Num.parse('NaN')).toBeUndefined();
    expect(Num.parse('Infinity')).toBeUndefined();
  });

  it('weist NaN und Unendlich beim Erzeugen ab', () => {
    expect(() => Num.of(Number.NaN)).toThrow();
    expect(() => Num.of(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('rundet ab, potenziert, kennt Null und Vorzeichen', () => {
    expect(Num.of(12.9).floor().toNumber()).toBe(12);
    expect(Num.of(1.15).pow(10).toNumber()).toBeCloseTo(4.0455577, 6);
    expect(Num.ZERO.isZero()).toBe(true);
    expect(Num.of(-3).isNegative()).toBe(true);
    expect(Num.ONE.isNegative()).toBe(false);
  });
});
