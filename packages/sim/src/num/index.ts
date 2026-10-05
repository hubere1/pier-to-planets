/**
 * `Num`: einzige Schnittstelle für Spielwährung und große Zahlen (AGENTS Regel 5, D-005).
 * Intern break_infinity.js; nach außen unveränderlich und ohne Bibliothekstypen,
 * damit sich die Bibliothek später tauschen lässt.
 */
import Decimal from 'break_infinity.js';

export type NumLike = Num | number | string;

export class Num {
  static readonly ZERO = new Num(new Decimal(0));
  static readonly ONE = new Num(new Decimal(1));

  private constructor(private readonly d: Decimal) {}

  /** Erzeugt eine Zahl; NaN und Unendlich sind Programmfehler und werfen. */
  static of(v: NumLike): Num {
    if (v instanceof Num) return v;
    if (typeof v === 'number' && !Number.isFinite(v)) throw new RangeError(`Num.of(${v})`);
    const d = new Decimal(v);
    if (!Number.isFinite(d.mantissa) || !Number.isFinite(d.exponent)) {
      throw new RangeError(`Num.of(${String(v)})`);
    }
    return new Num(d);
  }

  /** Tolerantes Lesen aus Spielständen: alles Ungültige → `undefined`. */
  static parse(v: unknown): Num | undefined {
    if (typeof v !== 'string' && typeof v !== 'number') return undefined;
    if (typeof v === 'string' && !/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(v.trim())) return undefined;
    try {
      return Num.of(typeof v === 'string' ? v.trim() : v);
    } catch {
      return undefined;
    }
  }

  private static raw(v: NumLike): Decimal | number | string {
    return v instanceof Num ? v.d : v;
  }

  static max(a: Num, b: Num): Num {
    return a.gte(b) ? a : b;
  }

  static min(a: Num, b: Num): Num {
    return a.lte(b) ? a : b;
  }

  add(v: NumLike): Num {
    return new Num(this.d.add(Num.raw(v)));
  }
  sub(v: NumLike): Num {
    return new Num(this.d.sub(Num.raw(v)));
  }
  mul(v: NumLike): Num {
    return new Num(this.d.mul(Num.raw(v)));
  }
  div(v: NumLike): Num {
    return new Num(this.d.div(Num.raw(v)));
  }
  pow(exp: number): Num {
    return new Num(this.d.pow(exp));
  }
  floor(): Num {
    return new Num(this.d.floor());
  }

  cmp(v: NumLike): -1 | 0 | 1 {
    return this.d.cmp(Num.raw(v));
  }
  eq(v: NumLike): boolean {
    return this.d.eq(Num.raw(v));
  }
  lt(v: NumLike): boolean {
    return this.d.lt(Num.raw(v));
  }
  lte(v: NumLike): boolean {
    return this.d.lte(Num.raw(v));
  }
  gt(v: NumLike): boolean {
    return this.d.gt(Num.raw(v));
  }
  gte(v: NumLike): boolean {
    return this.d.gte(Num.raw(v));
  }

  isZero(): boolean {
    return this.d.mantissa === 0;
  }
  isNegative(): boolean {
    return this.d.mantissa < 0;
  }
  isFinite(): boolean {
    return Number.isFinite(this.d.mantissa) && Number.isFinite(this.d.exponent);
  }

  /** log10 als double; für 0 → -Infinity. */
  log10(): number {
    return this.d.log10();
  }

  /** Als double (über 1e308 → Infinity); nur für Anteile und Anzeige-Logik. */
  toNumber(): number {
    return this.d.toNumber();
  }

  /** Normalisierte Mantisse [1, 10) und ganzzahliger Exponent; 0 → {0, 0}. */
  parts(): { mantissa: number; exponent: number } {
    if (this.d.mantissa === 0) return { mantissa: 0, exponent: 0 };
    return { mantissa: this.d.mantissa, exponent: this.d.exponent };
  }

  /** Verlustfreie Textform für Spielstände: `<mantisse>e<exponent>`. */
  serialize(): string {
    if (this.d.mantissa === 0) return '0';
    return `${this.d.mantissa}e${this.d.exponent}`;
  }

  toString(): string {
    return this.serialize();
  }
}
