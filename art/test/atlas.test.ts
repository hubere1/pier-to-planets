import { describe, expect, it } from 'vitest';
import { packShelves } from '../gen/lib/atlas.ts';

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
type Box = { x: number; y: number; w: number; h: number };

describe('packShelves', () => {
  const sizes = Array.from({ length: 60 }, (_, i) => ({
    w: 4 + ((i * 37) % 90),
    h: 3 + ((i * 53) % 70),
  }));

  it('legt alle Rechtecke überlappungsfrei mit 1 px Abstand ab', () => {
    const { boxes } = packShelves(sizes, 512, 1);
    expect(boxes).toHaveLength(sizes.length);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        expect(overlaps({ ...a, w: a.w + 1, h: a.h + 1 }, b)).toBe(false);
      }
    }
  });

  it('behält die Reihenfolge der Eingabe bei und bleibt in der Breite', () => {
    const { boxes, width, height } = packShelves(sizes, 256, 1);
    boxes.forEach((b, i) => {
      expect([b.w, b.h]).toEqual([sizes[i]!.w, sizes[i]!.h]);
      expect(b.x + b.w).toBeLessThanOrEqual(width);
      expect(b.y + b.h).toBeLessThanOrEqual(height);
    });
    expect(width).toBeLessThanOrEqual(256);
  });

  it('lehnt zu breite Rechtecke ab', () => {
    expect(() => packShelves([{ w: 300, h: 2 }], 256, 1)).toThrow();
  });
});
