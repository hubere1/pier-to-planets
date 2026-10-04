import { describe, expect, it } from 'vitest';
import { N, Raster } from '../gen/lib/raster.ts';
import { NORMAL_COLORS } from '../../tools/lib/palette.ts';

const palette = {
  era: 't',
  ramps: { wood: ['#100000', '#200000', '#300000'], tar: ['#010101'] },
};

describe('Raster', () => {
  it('schreibt Albedo, Normale und Emissive an dieselbe Stelle', () => {
    const r = new Raster(4, 4, palette);
    r.set(1, 2, 'wood.2', N.up, '#ffcc00');
    const out = r.toImages();
    const i = (2 * 4 + 1) * 4;
    expect([...out.albedo.data.slice(i, i + 4)]).toEqual([0x30, 0, 0, 255]);
    expect([...out.normal.data.slice(i, i + 3)]).toEqual([...NORMAL_COLORS[N.up]!]);
    expect([...out.emissive.data.slice(i, i + 4)]).toEqual([0xff, 0xcc, 0, 255]);
  });

  it('lässt leere Pixel in allen Maps transparent', () => {
    const out = new Raster(2, 1, palette).toImages();
    expect(out.albedo.data[3]).toBe(0);
    expect(out.normal.data[3]).toBe(0);
    expect(out.emissive.data[3]).toBe(0);
  });

  it('lehnt Farben außerhalb der Palette ab', () => {
    const r = new Raster(2, 2, palette);
    expect(() => r.set(0, 0, 'wood.9')).toThrow();
    expect(() => r.set(0, 0, 'gold.0')).toThrow();
  });

  it('ignoriert Pixel außerhalb der Fläche', () => {
    const r = new Raster(2, 2, palette);
    r.rect(-5, -5, 20, 20, 'wood.0');
    expect(r.filled()).toBe(4);
  });

  it('färbt die Außenkontur in die dunklere Rampenfarbe', () => {
    const r = new Raster(5, 5, palette);
    r.rect(1, 1, 3, 3, 'wood.2');
    r.outline();
    expect(r.colorAt(1, 1)).toBe('wood.1');
    expect(r.colorAt(2, 2)).toBe('wood.2');
  });

  it('nutzt für die dunkelste Rampenfarbe Teer als Kontur', () => {
    const r = new Raster(3, 3, palette);
    r.rect(0, 0, 3, 3, 'wood.0');
    r.outline();
    expect(r.colorAt(0, 0)).toBe('tar.0');
  });

  it('entfernt Waisen-Pixel', () => {
    const r = new Raster(5, 5, palette);
    r.set(0, 0, 'wood.0');
    r.rect(2, 2, 2, 2, 'wood.1');
    r.removeOrphans();
    expect(r.colorAt(0, 0)).toBeUndefined();
    expect(r.filled()).toBe(4);
  });

  it('füllt Polygone pixelgenau', () => {
    const r = new Raster(10, 10, palette);
    r.poly(
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ],
      'wood.1',
    );
    expect(r.filled()).toBe(16);
  });

  it('ist deterministisch (gleiche Eingabe → gleiche Bytes)', () => {
    const draw = () => {
      const r = new Raster(16, 16, palette);
      r.noiseRect(0, 0, 16, 16, ['wood.0', 'wood.1', 'wood.2'], 7);
      return Buffer.from(r.toImages().albedo.data).toString('hex');
    };
    expect(draw()).toBe(draw());
  });
});

describe('Raster Emissive-Deckung', () => {
  it('deckt nicht leuchtende Pixel schwarz ab, damit dahinterliegende Lichter verdeckt sind', () => {
    const r = new Raster(2, 1, palette);
    r.set(0, 0, 'wood.1');
    expect([...r.toImages().emissive.data.slice(0, 4)]).toEqual([0, 0, 0, 255]);
  });
});
