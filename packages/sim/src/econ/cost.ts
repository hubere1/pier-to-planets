/**
 * Gebäudekosten (docs/03 §3): Stufe n → n+1 kostet `basis · wachstum^n`;
 * mehrere Stufen geometrisch summiert, ×Max = größtes n mit Deckung.
 */
import type { BuildingDef } from '@ptp/content';
import { Num } from '../num/index.ts';

/** Kosten für `n` Stufen ab `level`. */
export function costFor(b: BuildingDef, level: number, n: number): Num {
  if (n <= 0) return Num.ZERO;
  const first = Num.of(b.baseCost).mul(Num.of(b.growth).pow(level));
  return first.mul(Num.of(b.growth).pow(n).sub(1)).div(b.growth - 1);
}

/** Größtes n ≥ 0 mit `costFor(n) ≤ money`. */
export function maxAffordable(b: BuildingDef, level: number, money: Num): number {
  if (money.lte(0)) return 0;
  const first = Num.of(b.baseCost).mul(Num.of(b.growth).pow(level));
  const ratio = money
    .mul(b.growth - 1)
    .div(first)
    .add(1);
  let n = Math.max(0, Math.floor(ratio.log10() / Math.log10(b.growth)));
  // Rundungsfehler der Logarithmen ausgleichen.
  while (n > 0 && costFor(b, level, n).gt(money)) n--;
  while (costFor(b, level, n + 1).lte(money)) n++;
  return n;
}
