/**
 * Tag-Nacht-Wechsel (docs/06 §5, D-017): rein kosmetisch, 24 Spielminuten = 1 Tag.
 * 8 Stützpunkte, dazwischen weich gemischt (Lehre 8: nichts springt).
 * Reine Funktionen – der Renderer setzt das Ergebnis nur in Shader-Uniforms um.
 */
export type Rgb = readonly [number, number, number];

export const DAY_LENGTH_S = 24 * 60;

interface Key {
  name: 'dawn' | 'sunrise' | 'morning' | 'noon' | 'afternoon' | 'golden' | 'blue' | 'night';
  hour: number;
  skyTop: Rgb;
  skyHorizon: Rgb;
  /** Farbe des Sonnen-/Mondhofs am Himmel. */
  glow: Rgb;
  /** Farbe und Stärke des gerichteten Lichts (Sonne bzw. Mond). */
  key: Rgb;
  ambient: Rgb;
  water: Rgb;
  /** 0 = Lichter aus, 1 = volle Nacht. */
  night: number;
  stars: number;
}

const hex = (h: string): Rgb => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const s = (r: number, g: number, b: number): Rgb => [r, g, b];

/** Reihenfolge = Zeilen in luts.png (art/gen/lib/lut.ts TIME_KEYS). */
export const KEYS: readonly Key[] = [
  {
    name: 'dawn',
    hour: 5.0,
    skyTop: hex('#1c2347'),
    skyHorizon: hex('#9a7a9e'),
    glow: hex('#e2a0a0'),
    key: s(0.35, 0.3, 0.45),
    ambient: s(0.32, 0.32, 0.48),
    water: hex('#1d2a4a'),
    night: 0.85,
    stars: 0.7,
  },
  {
    name: 'sunrise',
    hour: 6.5,
    skyTop: hex('#3d5c95'),
    skyHorizon: hex('#f2a66b'),
    glow: hex('#ffd38a'),
    key: s(1.0, 0.72, 0.5),
    ambient: s(0.45, 0.42, 0.5),
    water: hex('#2b4a72'),
    night: 0.15,
    stars: 0,
  },
  {
    name: 'morning',
    hour: 9.0,
    skyTop: hex('#4f86c6'),
    skyHorizon: hex('#b9dcef'),
    glow: hex('#fff3cf'),
    key: s(1.0, 0.95, 0.85),
    ambient: s(0.55, 0.57, 0.65),
    water: hex('#2f5f8a'),
    night: 0,
    stars: 0,
  },
  {
    name: 'noon',
    hour: 12.5,
    skyTop: hex('#3f7cc4'),
    skyHorizon: hex('#a9d6f0'),
    glow: hex('#ffffff'),
    key: s(1.05, 1.02, 0.95),
    ambient: s(0.6, 0.62, 0.7),
    water: hex('#2d6390'),
    night: 0,
    stars: 0,
  },
  {
    name: 'afternoon',
    hour: 15.5,
    skyTop: hex('#4877b8'),
    skyHorizon: hex('#c4d9e6'),
    glow: hex('#fff0c8'),
    key: s(1.02, 0.94, 0.8),
    ambient: s(0.56, 0.56, 0.62),
    water: hex('#2d5b84'),
    night: 0,
    stars: 0,
  },
  {
    name: 'golden',
    hour: 18.5,
    skyTop: hex('#4a5d9a'),
    skyHorizon: hex('#f5b06a'),
    glow: hex('#ffcf7a'),
    key: s(1.1, 0.72, 0.42),
    ambient: s(0.5, 0.42, 0.45),
    water: hex('#3a4f78'),
    night: 0.25,
    stars: 0,
  },
  {
    name: 'blue',
    hour: 20.0,
    skyTop: hex('#1b2758'),
    skyHorizon: hex('#5d6fa8'),
    glow: hex('#8a93c8'),
    key: s(0.3, 0.32, 0.5),
    ambient: s(0.3, 0.32, 0.5),
    water: hex('#1b2a52'),
    night: 0.8,
    stars: 0.3,
  },
  {
    name: 'night',
    hour: 22.0,
    skyTop: hex('#070b1c'),
    skyHorizon: hex('#1a2446'),
    glow: hex('#9fb0d8'),
    key: s(0.32, 0.38, 0.58),
    ambient: s(0.16, 0.18, 0.32),
    water: hex('#0c1530'),
    night: 1,
    stars: 1,
  },
];

export interface DayState {
  hour: number;
  lutA: number;
  lutB: number;
  lutMix: number;
  skyTop: Rgb;
  skyHorizon: Rgb;
  glow: Rgb;
  keyColor: Rgb;
  ambient: Rgb;
  water: Rgb;
  night: number;
  stars: number;
  /** Richtung zum Hauptlicht im Normalenraum (+y = oben), normiert. */
  keyDir: Rgb;
  /** Sonne/Mond am Himmel: x 0..1 (links→rechts), Höhe -1..1 (0 = Horizont). */
  sun: { x: number; elevation: number };
  moon: { x: number; elevation: number };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
  mix(a[2], b[2], t),
];
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Bahn eines Gestirns zwischen Auf- und Untergang (Stunden, über Mitternacht erlaubt). */
function arc(hour: number, rise: number, set: number) {
  const len = (set - rise + 24) % 24;
  const t = ((hour - rise + 24) % 24) / len;
  if (t > 1) return { x: t < 1 + (24 - len) / len / 2 ? 1.1 : -0.1, elevation: -1 };
  // Auf rechts (über der Klippe), Untergang links über der Stadt.
  return { x: 0.92 - 0.84 * t, elevation: Math.sin(Math.PI * t) };
}

export function dayState(hourIn: number): DayState {
  const hour = ((hourIn % 24) + 24) % 24;
  let i = KEYS.length - 1;
  for (let k = 0; k < KEYS.length; k++) if (KEYS[k]!.hour <= hour) i = k;
  const a = KEYS[i]!;
  const j = (i + 1) % KEYS.length;
  const b = KEYS[j]!;
  const span = (b.hour - a.hour + 24) % 24;
  const t = smooth(((hour - a.hour + 24) % 24) / span);

  const sun = arc(hour, 6.0, 20.0);
  const moon = arc(hour, 19.5, 6.5);
  // Hauptlicht: Sonne, solange sie über dem Horizont steht, sonst Mond.
  const body = sun.elevation > 0.02 ? sun : moon;
  const side = (body.x - 0.5) * 2;
  const elev = Math.max(0.15, body.elevation);
  const dir: Rgb = [side * 0.8, elev, 0.65];
  const len = Math.hypot(...dir);

  return {
    hour,
    lutA: i,
    lutB: j,
    lutMix: t,
    skyTop: mixRgb(a.skyTop, b.skyTop, t),
    skyHorizon: mixRgb(a.skyHorizon, b.skyHorizon, t),
    glow: mixRgb(a.glow, b.glow, t),
    keyColor: mixRgb(a.key, b.key, t),
    ambient: mixRgb(a.ambient, b.ambient, t),
    water: mixRgb(a.water, b.water, t),
    night: mix(a.night, b.night, t),
    stars: mix(a.stars, b.stars, t),
    keyDir: [dir[0] / len, dir[1] / len, dir[2] / len],
    sun,
    moon,
  };
}
