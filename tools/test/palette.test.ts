import { describe, expect, it } from 'vitest';
import { checkAlbedo, checkNormal, NORMAL_COLORS, validatePalette } from '../lib/palette.ts';

const img = (w: number, h: number, rgba: number[][]) => ({
  width: w,
  height: h,
  data: Uint8Array.from(rgba.flat()),
});

describe('validatePalette (NFR-G06)', () => {
  it('akzeptiert bis 48 eindeutige Hex-Farben', () => {
    const colors = Array.from({ length: 48 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`);
    expect(validatePalette({ era: 'harbor', colors })).toEqual([]);
  });
  it('lehnt mehr als 48 Farben, Duplikate und Unsinn ab', () => {
    const colors = Array.from({ length: 49 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`);
    expect(validatePalette({ era: 'harbor', colors })).toContain('too-many-colors');
    expect(validatePalette({ era: 'h', colors: ['#000000', '#000000'] })).toContain(
      'duplicate-color',
    );
    expect(validatePalette({ era: 'h', colors: ['red'] })).toContain('invalid-color');
  });
});

describe('checkAlbedo', () => {
  const palette = { era: 'harbor', colors: ['#112233', '#ffffff'] };
  it('akzeptiert Palettenfarben und volle Transparenz', () => {
    const r = checkAlbedo(
      img(2, 1, [
        [0x11, 0x22, 0x33, 255],
        [9, 9, 9, 0],
      ]),
      palette,
    );
    expect(r).toEqual([]);
  });
  it('meldet fremde Farben und Halbtransparenz', () => {
    const r = checkAlbedo(
      img(2, 1, [
        [1, 2, 3, 255],
        [255, 255, 255, 128],
      ]),
      palette,
    );
    expect(r.map((x) => x.kind)).toEqual(['off-palette', 'partial-alpha']);
  });
  it('meldet zu große Atlanten', () => {
    const r = checkAlbedo({ width: 4096, height: 1, data: new Uint8Array(4096 * 4) }, palette);
    expect(r.map((x) => x.kind)).toContain('too-large');
  });
});

describe('checkNormal (06 §4: 8 Richtungen + flach)', () => {
  it('kennt genau 9 Normalfarben, flach = (128,128,255)', () => {
    expect(NORMAL_COLORS).toHaveLength(9);
    expect(NORMAL_COLORS).toContainEqual([128, 128, 255]);
  });
  it('meldet nicht gerundete Normalen', () => {
    const flat = [128, 128, 255];
    const r = checkNormal(
      img(2, 1, [
        [...flat, 255],
        [100, 128, 255, 255],
      ]),
    );
    expect(r.map((x) => x.kind)).toEqual(['invalid-normal']);
  });
});
