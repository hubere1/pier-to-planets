import { describe, expect, it } from 'vitest';
import { computeStageLayout } from './layout.ts';

describe('computeStageLayout (docs/06 §2)', () => {
  it.each([
    [720, 1600, 2, 800],
    [1080, 2400, 3, 800],
    [1440, 3200, 4, 800],
    [1080, 1920, 3, 640],
    [1080, 2340, 3, 780],
  ])('%i × %i px → ganzzahlig s=%i, Höhe %i Spiel-Pixel, randlos', (w, h, s, gameH) => {
    const l = computeStageLayout(w, h);
    expect(l).toMatchObject({ scale: s, gameW: 360, gameH, sharp: false, outW: w, outH: h });
    expect(l.offsetX).toBe(0);
    expect(l.offsetY).toBe(0);
  });

  it('krumme Breite: Sharp-Bilinear füllt die Breite, Pixel bleiben gleich breit', () => {
    const l = computeStageLayout(1176, 2400);
    expect(l.scale).toBe(3);
    expect(l.sharp).toBe(true);
    expect(l.gameH).toBeGreaterThanOrEqual(640);
    expect(l.outW).toBeGreaterThanOrEqual(1174);
    expect(l.outH).toBeLessThanOrEqual(2400);
  });

  it('Tablet: Höhe begrenzt auf 640, Rest zentriert statt abgeschnitten', () => {
    const l = computeStageLayout(1600, 2560);
    expect(l.gameH).toBe(640);
    expect(l.outH).toBeLessThanOrEqual(2560);
    expect(l.outW).toBeLessThanOrEqual(1600);
    expect(l.offsetX).toBe(Math.floor((1600 - l.outW) / 2));
  });

  it('sehr hohe Geräte: höchstens 800 Spiel-Pixel, Rest zentriert', () => {
    const l = computeStageLayout(1080, 2800);
    expect(l.gameH).toBe(800);
    expect(l.offsetY).toBe(Math.floor((2800 - 2400) / 2));
  });
});
