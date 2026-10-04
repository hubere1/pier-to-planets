/**
 * Erzeugt die Start-LUTs je Tageszeit nach art/luts/<ära>/<zeit>.png.
 * Vorhandene Dateien bleiben unangetastet (von Hand umgefärbte LUTs gewinnen),
 * außer mit `--force`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { buildLut, LUT_SIZE, TIME_KEYS, type Grade, type TimeKey } from '../art/gen/lib/lut.ts';
import { ROOT } from './lib/files.ts';

// Stimmung je Stützpunkt (Hafen: warm). Licht-Helligkeit kommt aus dem Licht-Pass,
// die LUT färbt nur die Stimmung (docs/06 §5).
const HARBOR: Record<TimeKey, Grade> = {
  dawn: { mult: [0.82, 0.8, 0.98], lift: [0.06, 0.04, 0.12], saturation: 0.8, contrast: 0.95 },
  sunrise: { mult: [1.06, 0.9, 0.82], lift: [0.06, 0.02, 0.06], saturation: 1.05, contrast: 1.0 },
  morning: { mult: [1.0, 0.99, 0.95], lift: [0.01, 0.02, 0.04], saturation: 1.0, contrast: 1.0 },
  noon: { mult: [1.02, 1.02, 1.0], lift: [0.0, 0.01, 0.03], saturation: 1.05, contrast: 1.04 },
  afternoon: {
    mult: [1.03, 0.98, 0.9],
    lift: [0.02, 0.01, 0.03],
    saturation: 1.05,
    contrast: 1.02,
  },
  golden: { mult: [1.06, 0.93, 0.8], lift: [0.05, 0.02, 0.05], saturation: 1.0, contrast: 1.04 },
  blue: { mult: [0.7, 0.76, 1.0], lift: [0.03, 0.04, 0.12], saturation: 0.8, contrast: 0.96 },
  night: { mult: [0.62, 0.7, 1.0], lift: [0.02, 0.03, 0.09], saturation: 0.7, contrast: 1.0 },
};

const force = process.argv.includes('--force');
const dir = join(ROOT, 'art/luts/harbor');
mkdirSync(dir, { recursive: true });
let written = 0;
for (const key of TIME_KEYS) {
  const file = join(dir, `${key}.png`);
  if (existsSync(file) && !force) continue;
  const png = new PNG({ width: LUT_SIZE * LUT_SIZE, height: LUT_SIZE });
  png.data = Buffer.from(buildLut(HARBOR[key]));
  writeFileSync(file, PNG.sync.write(png));
  written++;
}
console.log(`gen-luts – ${written} LUT(s) geschrieben nach art/luts/harbor.`);
