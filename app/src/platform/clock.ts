/**
 * Wanduhr – die einzige Stelle mit `Date.now()` (docs/04 § Takt und Lifecycle).
 * Die Sim bekommt Zeit nur als `dt`, Tageslimits bekommen den lokalen Tag.
 */
export interface Clock {
  now(): number;
  /** Lokaler Kalendertag (Tage seit 1970 in Ortszeit) für Tageslimits und Aufträge. */
  localDay(): number;
}

const DAY_MS = 86_400_000;

export function localDayOf(ms: number, tzOffsetMin: number): number {
  return Math.floor((ms - tzOffsetMin * 60_000) / DAY_MS);
}

export const systemClock: Clock = {
  now: () => Date.now(),
  localDay: () => {
    const now = Date.now();
    return localDayOf(now, new Date(now).getTimezoneOffset());
  },
};

/** Testuhr: Zeit wird von Hand vorgestellt; Ortszeit = UTC. */
export class FakeClock implements Clock {
  constructor(public ms = 1_760_000_000_000) {}
  now(): number {
    return this.ms;
  }
  localDay(): number {
    return localDayOf(this.ms, 0);
  }
  advance(ms: number): void {
    this.ms += ms;
  }
}
