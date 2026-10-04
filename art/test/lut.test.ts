import { describe, expect, it } from 'vitest';
import { applyGrade, buildLut, LUT_SIZE } from '../gen/lib/lut.ts';

const identity = { mult: [1, 1, 1], lift: [0, 0, 0], saturation: 1, contrast: 1 } as const;

describe('LUT', () => {
  it('neutrale Abstufung lässt Farben unverändert', () => {
    expect(applyGrade([0.2, 0.5, 0.9], identity).map((v) => v.toFixed(3))).toEqual([
      '0.200',
      '0.500',
      '0.900',
    ]);
  });

  it('legt Rot entlang x, Grün entlang y und Blau in Scheiben ab', () => {
    const lut = buildLut(identity);
    const at = (x: number, y: number) => [...lut.slice((y * 256 + x) * 4, (y * 256 + x) * 4 + 3)];
    expect(lut.length).toBe(LUT_SIZE ** 3 * 4);
    expect(at(15, 0)).toEqual([255, 0, 0]);
    expect(at(0, 15)).toEqual([0, 255, 0]);
    expect(at(15 * 16, 0)).toEqual([0, 0, 255]);
    expect(at(255, 15)).toEqual([255, 255, 255]);
  });

  it('bleibt im Wertebereich', () => {
    const hot = { mult: [3, 3, 3], lift: [1, 1, 1], saturation: 3, contrast: 3 } as const;
    for (const v of applyGrade([0.9, 0.1, 0.5], hot)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
