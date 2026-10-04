import { describe, expect, it } from 'vitest';
import { dayState, KEYS } from './daynight.ts';
import { TIME_KEYS } from '../../../art/gen/lib/lut.ts';

const flat = (s: ReturnType<typeof dayState>) => [
  ...s.skyTop,
  ...s.skyHorizon,
  ...s.keyColor,
  ...s.ambient,
  ...s.water,
  s.night,
  s.stars,
];

describe('dayState (docs/06 §5)', () => {
  it('Stützpunkte passen in Reihenfolge zu den LUT-Zeilen', () => {
    expect(KEYS.map((k) => k.name)).toEqual([...TIME_KEYS]);
  });

  it('trifft an jedem Stützpunkt genau dessen LUT', () => {
    KEYS.forEach((k, i) => {
      const s = dayState(k.hour);
      expect(s.lutA).toBe(i);
      expect(s.lutMix).toBeCloseTo(0, 6);
    });
  });

  it('ändert sich nirgends sprunghaft (Lehre 8), auch nicht über Mitternacht', () => {
    for (let m = 0; m < 24 * 60; m++) {
      const a = flat(dayState(m / 60));
      const b = flat(dayState((m + 1) / 60));
      a.forEach((v, i) => expect(Math.abs(v - b[i]!)).toBeLessThan(0.05));
    }
  });

  it('Mittags steht die Sonne hoch, nachts ist es dunkel mit Sternen', () => {
    const noon = dayState(13);
    expect(noon.sun.elevation).toBeGreaterThan(0.9);
    expect(noon.night).toBe(0);
    const night = dayState(0);
    expect(night.sun.elevation).toBeLessThan(0);
    expect(night.night).toBeGreaterThan(0.9);
    expect(night.stars).toBeGreaterThan(0.9);
  });

  it('Lichtrichtung ist normiert und kommt nie von unten', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const d = dayState(h).keyDir;
      expect(Math.hypot(...d)).toBeCloseTo(1, 6);
      expect(d[1]).toBeGreaterThan(0);
    }
  });
});
