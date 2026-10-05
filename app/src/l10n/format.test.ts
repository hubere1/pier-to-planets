import { describe, expect, it } from 'vitest';
import { Num } from '@ptp/sim';
import { formatMoney, formatNum, formatRate } from './format.ts';

const NB = ' ';

describe('formatNum (docs/06 §10, Lehre 12, D-033)', () => {
  it('unter 1 Mio. voll mit Tausendertrenner, abgerundet', () => {
    expect(formatNum(0, 'de')).toBe('0');
    expect(formatNum(999, 'de')).toBe('999');
    expect(formatNum(42_380.9, 'de')).toBe('42.380');
    expect(formatNum(42_380, 'en')).toBe('42,380');
    expect(formatNum(999_999, 'de')).toBe('999.999');
  });

  it('ab 1 Mio. eine Nachkommastelle + Kurzform, nie aufgerundet', () => {
    expect(formatNum(4_200_000, 'de')).toBe(`4,2${NB}Mio.`);
    expect(formatNum(4_299_999, 'de')).toBe(`4,2${NB}Mio.`);
    expect(formatNum(999_999_999, 'de')).toBe(`999,9${NB}Mio.`);
    expect(formatNum(1e9, 'de')).toBe(`1,0${NB}Mrd.`);
    expect(formatNum(3.5e12, 'de')).toBe(`3,5${NB}Bio.`);
    expect(formatNum(4.2e15, 'de')).toBe(`4,2${NB}Qa`);
    expect(formatNum(4_200_000, 'en')).toBe(`4.2${NB}M`);
    expect(formatNum(1e9, 'en')).toBe(`1.0${NB}B`);
    expect(formatNum(7.7e12, 'en')).toBe(`7.7${NB}T`);
    expect(formatNum(4.2e15, 'en')).toBe(`4.2${NB}Qa`);
  });

  it('gleiche Kurzzeichen in beiden Sprachen ab 1e15, danach aa, ab …', () => {
    const steps: [string, string][] = [
      ['1e18', 'Qi'],
      ['1e21', 'Sx'],
      ['1e24', 'Sp'],
      ['1e27', 'Oc'],
      ['1e30', 'No'],
      ['1e33', 'Dc'],
      ['1e36', 'aa'],
      ['1e39', 'ab'],
      ['1e111', 'az'],
      ['1e114', 'ba'],
    ];
    for (const [v, suffix] of steps) {
      expect(formatNum(Num.of(v), 'de')).toBe(`1,0${NB}${suffix}`);
      expect(formatNum(Num.of(v), 'en')).toBe(`1.0${NB}${suffix}`);
    }
  });

  it('bleibt bis 1e300 lesbar und genau (NFR-Q05)', () => {
    expect(formatNum(Num.of('4.2e300'), 'de')).toBe(`4,2${NB}dk`);
    expect(formatNum(Num.of('9.99e299'), 'en')).toBe(`999.0${NB}dj`);
    for (let e = 6; e <= 300; e++) {
      const s = formatNum(Num.of(`1.5e${e}`), 'en');
      expect(s, `1.5e${e}`).toMatch(new RegExp(`^d{1,3}.d${NB}[A-Za-z]+.?$`));
    }
  });

  it('jenseits der Kurzzeichen wissenschaftlich', () => {
    expect(formatNum(Num.of('3.3e3000'), 'de')).toBe('3,3e3000');
  });

  it('Einstellung „Wissenschaftlich“', () => {
    expect(formatNum(Num.of('4.2e45'), 'de', { notation: 'scientific' })).toBe('4,2e45');
    expect(formatNum(Num.of('4.2e45'), 'en', { notation: 'scientific' })).toBe('4.2e45');
    expect(formatNum(12_345, 'de', { notation: 'scientific' })).toBe('12.345');
  });

  it('kleine Werte mit Nachkommastellen auf Wunsch', () => {
    expect(formatNum(0.55, 'de', { decimals: 1 })).toBe('0,5');
    expect(formatNum(12.75, 'en', { decimals: 1 })).toBe('12.7');
  });
});

describe('Währung und Rate', () => {
  it('geschütztes Leerzeichen vor der Einheit', () => {
    expect(formatMoney(42_380, 'de', 'Taler')).toBe(`42.380${NB}Taler`);
    expect(formatMoney(4.2e6, 'de', 'Taler')).toBe(`4,2${NB}Mio.${NB}Taler`);
  });

  it('Rate mit „/s“ ohne Leerzeichen, unter 100 mit einer Nachkommastelle', () => {
    expect(formatRate(1.25, 'de')).toBe('1,2/s');
    expect(formatRate(150, 'en')).toBe('150/s');
    expect(formatRate(4.2e6, 'de')).toBe(`4,2${NB}Mio./s`);
  });
});
