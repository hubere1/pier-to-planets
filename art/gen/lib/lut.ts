/**
 * 3D-Farb-LUTs für die Tageszeiten (docs/06 §5). 16³ als Streifen 256 × 16:
 * Blau-Scheibe b liegt bei x = b·16, darin x = Rot, y = Grün.
 * Generiert als Startpunkt; jede Datei in art/luts/<ära>/ darf von Hand umgefärbt werden.
 */
export const LUT_SIZE = 16;

/** Reihenfolge = Zeilen in luts.png und Stützpunkte im Renderer. */
export const TIME_KEYS = [
  'dawn',
  'sunrise',
  'morning',
  'noon',
  'afternoon',
  'golden',
  'blue',
  'night',
] as const;
export type TimeKey = (typeof TIME_KEYS)[number];

export interface Grade {
  /** Multiplikator je Kanal (Weißabgleich/Belichtung). */
  mult: readonly [number, number, number];
  /** Anhebung der Tiefen (Farbe der Schatten). */
  lift: readonly [number, number, number];
  saturation: number;
  contrast: number;
}

export function applyGrade(
  [r, g, b]: readonly [number, number, number],
  grade: Grade,
): [number, number, number] {
  const c = [r, g, b].map((v) => (v - 0.5) * grade.contrast + 0.5);
  const luma = 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  return c.map((v, i) => {
    const sat = luma + (v - luma) * grade.saturation;
    const lifted = sat * grade.mult[i]! + grade.lift[i]! * (1 - sat);
    return Math.min(1, Math.max(0, lifted));
  }) as [number, number, number];
}

export function buildLut(grade: Grade): Uint8Array {
  const S = LUT_SIZE;
  const data = new Uint8Array(S * S * S * 4);
  for (let b = 0; b < S; b++) {
    for (let g = 0; g < S; g++) {
      for (let r = 0; r < S; r++) {
        const out = applyGrade([r / (S - 1), g / (S - 1), b / (S - 1)], grade);
        const i = (g * S * S + b * S + r) * 4;
        data.set([...out.map((v) => Math.round(v * 255)), 255], i);
      }
    }
  }
  return data;
}
