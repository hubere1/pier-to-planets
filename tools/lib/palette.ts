/**
 * Paletten- und Map-Prüfung (NFR-G06, docs/06 §4 + §7, docs/04 § Asset-Pipeline).
 */
export const MAX_PALETTE_COLORS = 48;
export const MAX_ATLAS_SIZE = 2048;

export interface Palette {
  era: string;
  colors: string[];
}

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface ImageProblem {
  kind: 'off-palette' | 'partial-alpha' | 'invalid-normal' | 'too-large';
  x: number;
  y: number;
  detail: string;
}

type Rgb = readonly [number, number, number];

/**
 * Die 9 erlaubten Normalfarben (docs/06 §4): flach + 8 Richtungen, um 45° gekippt.
 * Kodierung rgb = round((n · 0,5 + 0,5) · 255); flach = (128, 128, 255) wie üblich.
 */
export const NORMAL_COLORS: readonly Rgb[] = (() => {
  const enc = (v: number) => Math.round((v * 0.5 + 0.5) * 255);
  const tilt = Math.SQRT1_2;
  const colors: Rgb[] = [[128, 128, 255]];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    colors.push([enc(Math.cos(a) * tilt), enc(Math.sin(a) * tilt), enc(tilt)]);
  }
  return colors;
})();

const HEX = /^#[0-9a-f]{6}$/i;
const rgbKey = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;
const toHex = (k: number) => `#${k.toString(16).padStart(6, '0')}`;

export function validatePalette(p: Palette): string[] {
  const problems: string[] = [];
  if (!p.era) problems.push('missing-era');
  if (p.colors.length > MAX_PALETTE_COLORS) problems.push('too-many-colors');
  if (p.colors.some((c) => !HEX.test(c))) problems.push('invalid-color');
  if (new Set(p.colors.map((c) => c.toLowerCase())).size !== p.colors.length) {
    problems.push('duplicate-color');
  }
  return problems;
}

function scan(
  img: RgbaImage,
  allowed: ReadonlySet<number>,
  kind: 'off-palette' | 'invalid-normal',
  limit: number,
): ImageProblem[] {
  const out: ImageProblem[] = [];
  if (img.width > MAX_ATLAS_SIZE || img.height > MAX_ATLAS_SIZE) {
    out.push({ kind: 'too-large', x: 0, y: 0, detail: `${img.width}×${img.height}` });
  }
  const d = img.data;
  for (let i = 0; i < img.width * img.height && out.length < limit; i++) {
    const a = d[i * 4 + 3] ?? 0;
    if (a === 0) continue;
    const x = i % img.width;
    const y = Math.floor(i / img.width);
    const k = rgbKey(d[i * 4] ?? 0, d[i * 4 + 1] ?? 0, d[i * 4 + 2] ?? 0);
    if (a !== 255) out.push({ kind: 'partial-alpha', x, y, detail: `alpha ${a}` });
    else if (!allowed.has(k)) out.push({ kind, x, y, detail: toHex(k) });
  }
  return out;
}

export function checkAlbedo(img: RgbaImage, palette: Palette, limit = 20): ImageProblem[] {
  const allowed = new Set(palette.colors.map((c) => parseInt(c.slice(1), 16)));
  return scan(img, allowed, 'off-palette', limit);
}

export function checkNormal(img: RgbaImage, limit = 20): ImageProblem[] {
  const allowed = new Set(NORMAL_COLORS.map(([r, g, b]) => rgbKey(r, g, b)));
  return scan(img, allowed, 'invalid-normal', limit);
}
