/**
 * Bühnen-Layout (docs/06 §2, D-002): 360 Spiel-Pixel breit, 640–800 hoch.
 * Ganzzahliger Faktor s = floor(Gerätebreite / 360). Bleibt ein Rest, wird per
 * Sharp-Bilinear (nearest auf s, dann bilinear) auf die volle Breite skaliert.
 * Alle Angaben in Gerätepixeln.
 */
export const GAME_W = 360;
export const GAME_H_MIN = 640;
export const GAME_H_MAX = 800;

export interface StageLayout {
  scale: number;
  gameW: number;
  gameH: number;
  outW: number;
  outH: number;
  offsetX: number;
  offsetY: number;
  /** true = Rest-Skalierung per Sharp-Bilinear nötig. */
  sharp: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function computeStageLayout(deviceW: number, deviceH: number): StageLayout {
  let f = Math.max(1, deviceW / GAME_W);
  const gameH = clamp(Math.floor(deviceH / f), GAME_H_MIN, GAME_H_MAX);
  if (gameH * f > deviceH) f = Math.max(1, deviceH / gameH);
  // Fast-ganzzahlige Faktoren (Rundungsrauschen) als ganzzahlig behandeln.
  if (Math.abs(f - Math.round(f)) < 1e-6) f = Math.round(f);
  const outW = Math.round(GAME_W * f);
  const outH = Math.round(gameH * f);
  return {
    scale: Math.max(1, Math.floor(f)),
    gameW: GAME_W,
    gameH,
    outW,
    outH,
    offsetX: Math.floor((deviceW - outW) / 2),
    offsetY: Math.floor((deviceH - outH) / 2),
    sharp: f !== Math.floor(f),
  };
}
