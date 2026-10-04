/**
 * CLI: Paletten (art/palettes/<ära>.json) und generierte Maps (art/build/<ära>/…) prüfen.
 * Konvention: *.albedo.png gegen die Ära-Palette, *.normal.png gegen die 9 Normalfarben.
 * Emissive-Maps sind frei (Lichtfarben), werden aber auf Atlasgröße geprüft.
 */
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { PNG } from 'pngjs';
import { listFiles, ROOT } from './lib/files.ts';
import {
  checkAlbedo,
  checkNormal,
  MAX_ATLAS_SIZE,
  validatePalette,
  type ImageProblem,
  type Palette,
} from './lib/palette.ts';

const errors: string[] = [];
const palettes = new Map<string, Palette>();

for (const path of listFiles('art/palettes', ['.json'])) {
  const palette = JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as Palette;
  const expected = basename(path, '.json');
  if (palette.era !== expected)
    errors.push(`${path}: era "${palette.era}" ≠ Dateiname "${expected}"`);
  for (const p of validatePalette(palette)) errors.push(`${path}: ${p}`);
  palettes.set(palette.era, palette);
}

const images = listFiles('art/build', ['.png']);
for (const path of images) {
  const img = PNG.sync.read(readFileSync(join(ROOT, path)));
  const era = path.split('/')[2] ?? '';
  let problems: ImageProblem[] = [];
  if (path.endsWith('.albedo.png')) {
    const palette = palettes.get(era);
    if (!palette) {
      errors.push(`${path}: keine Palette art/palettes/${era}.json`);
      continue;
    }
    problems = checkAlbedo(img, palette);
  } else if (path.endsWith('.normal.png')) {
    problems = checkNormal(img);
  } else if (img.width > MAX_ATLAS_SIZE || img.height > MAX_ATLAS_SIZE) {
    errors.push(`${path}: ${img.width}×${img.height} > ${MAX_ATLAS_SIZE}`);
  }
  for (const p of problems) errors.push(`${path} (${p.x},${p.y}): ${p.kind} ${p.detail}`);
}

for (const e of errors) console.error(e);
if (errors.length > 0) {
  console.error(`check:palette – ${errors.length} Problem(e).`);
  process.exit(1);
}
console.log(`check:palette – ${palettes.size} Palette(n), ${images.length} Bild(er) geprüft.`);
