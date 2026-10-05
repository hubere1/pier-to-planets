/**
 * Deterministischer Zufall (docs/03 §1, AGENTS Regel 4): mulberry32 mit 32-Bit-Zustand.
 * Der Zustand liegt als Ganzzahl im GameState und wird mitgespeichert.
 */

/** Mischt einen beliebigen Seed zu einem gültigen Startzustand (splitmix32). */
export function seedRng(seed: number): number {
  let z = (seed + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

export class Rng {
  constructor(private s: number) {}

  /** Aktueller Zustand (uint32) zum Zurückschreiben in den GameState. */
  get state(): number {
    return this.s >>> 0;
  }

  /** Gleichverteilt in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Exponentialverteilt mit Mittel 1 (Wartezeit eines Poisson-Prozesses mit Rate 1). */
  exp1(): number {
    return -Math.log(1 - this.next());
  }
}
