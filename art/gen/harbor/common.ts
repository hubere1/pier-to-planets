/**
 * Gemeinsame Bausteine der Hafen-Generatoren: Palette, Lichtfarben, Fenster, Mauerwerk.
 */
import { readFileSync } from 'node:fs';
import type { Palette } from '../../../tools/lib/palette.ts';
import { hash, Raster } from '../lib/raster.ts';

export const palette = JSON.parse(
  readFileSync(new URL('../../palettes/harbor.json', import.meta.url), 'utf8'),
) as Palette;

export const mk = (w: number, h: number) => new Raster(w, h, palette);

// Emissive-Farben (Lichtfarben, nicht an die Palette gebunden – docs/06 §7).
export const WIN = '#ffc96b';
export const WIN_DIM = '#d9873a';
export const LAMP = '#ffe7a3';
export const BEAM = '#fff4c8';
export const RED = '#ff4b3a';
export const GREEN = '#5dff7c';
export const CITY = '#ffb25c';

/** Fenster mit Rahmen, Glas und optionalem Innenlicht. */
export function window(
  r: Raster,
  x: number,
  y: number,
  w: number,
  h: number,
  lit: string | false,
): void {
  r.rect(x - 1, y - 1, w + 2, h + 2, 'wood.1');
  r.rect(x, y, w, h, 'sea.1');
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (lit) r.glow(xx, yy, lit);
    }
  }
  // Sprosse und Lichtkante (oben links heller Glanz)
  if (w >= 6) r.vline(x + Math.floor(w / 2), y, h, 'wood.1');
  if (h >= 6) r.hline(x, y + Math.floor(h / 2), w, 'wood.1');
  r.set(x, y, 'sea.3');
  if (lit) r.glow(x, y, lit);
}

export function brickWall(
  r: Raster,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
): void {
  for (let yy = y; yy < y + h; yy++) {
    const course = Math.floor((yy - y) / 3);
    for (let xx = x; xx < x + w; xx++) {
      const mortarRow = (yy - y) % 3 === 2;
      const joint = (xx - x + (course % 2) * 3) % 6 === 0;
      if (mortarRow || joint) {
        r.set(xx, yy, 'brick.1');
      } else {
        const v = hash(Math.floor((xx - x + (course % 2) * 3) / 6), course, seed);
        r.set(xx, yy, v < 0.25 ? 'brick.3' : v < 0.85 ? 'brick.2' : 'brick.1');
      }
    }
  }
}
