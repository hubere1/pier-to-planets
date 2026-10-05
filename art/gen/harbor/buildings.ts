/**
 * Hafengebäude und -fahrzeuge für M3 (docs/03 §3, §5; docs/06 §3 „Ausbaustufen als Module“).
 * Jedes Gebäude hat 6 Ausbaustufen: Stufe 1–9, dann je Meilenstein 10/25/50/100/200 ein neues
 * Modul. Stufe k enthält alle Module bis k – Wachstum bleibt sichtbar und konsistent.
 */
import { hash, N, type ColorRef, type NormalIndex, type Raster } from '../lib/raster.ts';
import type { Points, SpriteDef, SpriteStage } from '../lib/sprite.ts';
import { brickWall, GREEN, LAMP, mk, RED, WIN, WIN_DIM, window } from './common.ts';

export const STAGES = 6;
const stages = (f: (k: number) => SpriteStage): SpriteStage[] =>
  Array.from({ length: STAGES }, (_, k) => f(k));

/** Gestreifte Markise (Rostrot/Creme), vorne leicht abfallend. */
function awning(r: Raster, x: number, y: number, w: number, a: ColorRef, b: ColorRef): void {
  for (let xx = x; xx < x + w; xx++) {
    const c = Math.floor((xx - x) / 4) % 2 === 0 ? a : b;
    r.vline(xx, y, 5, c, N.up);
    r.set(xx, y + 5, (xx - x) % 4 < 2 ? r.darker(c) : c);
  }
  r.hline(x, y - 1, w, r.darker(a), N.up);
}

function flag(r: Raster, x: number, top: number, h: number, c: ColorRef): Points {
  r.vline(x, top, h, 'stone.3', N.right);
  r.set(x, top - 1, 'brass.2');
  r.rect(x + 1, top + 1, 7, 4, c);
  r.hline(x + 1, top + 3, 7, r.darker(c));
  return { flag: [x + 4, top + 2] };
}

function lamp(r: Raster, x: number, y: number): void {
  r.rect(x, y, 3, 4, 'brass.1');
  r.set(x + 1, y + 1, 'brass.3', N.flat, LAMP);
  r.set(x + 1, y + 2, 'brass.3', N.flat, LAMP);
}

/** Holzkiste mit Diagonalstreben. */
function crate(r: Raster, x: number, y: number, s: number, c: ColorRef = 'wood.3'): void {
  r.rect(x, y, s, s, c);
  r.hline(x, y, s, r.lighter(c), N.up);
  for (let k = 1; k < s - 1; k++) {
    r.set(x + k, y + k, r.darker(c));
    r.set(x + s - 1 - k, y + k, r.darker(c));
  }
  r.vline(x, y, s, r.darker(c));
  r.vline(x + s - 1, y, s, r.darker(c));
}

// ── Kran (Entladen) ─────────────────────────────────────────────────────────
// Steht auf dem Steg; der Ausleger reicht nach rechts über Liegeplatz 1.
function craneStage(k: number): SpriteStage {
  const W = 72;
  const H = 120;
  const frames = [0, 1].map((f) => {
    const r = mk(W, H);
    const bx = 12;
    const height = [56, 74, 88, 92, 96, 100][k]!;
    const top = H - height;
    const steel: ColorRef = k >= 3 ? 'brass.2' : 'corange.1';
    if (k === 0) {
      // Holzderrick: A-Mast, schräger Baum, Seil mit Haken
      for (let y = top; y < H; y++) {
        const spread = Math.round(((y - top) / height) * 8);
        r.set(bx - spread, y, 'wood.2', N.left);
        r.set(bx + spread, y, 'wood.3', N.right);
      }
      for (let y = top + 10; y < H; y += 10) {
        const s = Math.round(((y - top) / height) * 8);
        r.hline(bx - s, y, 2 * s + 1, 'wood.1');
      }
      for (let i = 0; i < 40; i++) r.set(bx + i, top + 4 + Math.round(i * 0.35), 'wood.3', N.up);
      const hx = bx + 38;
      const hy = top + 18 + (f ? 14 : 0);
      r.vline(hx, top + 18, hy - top - 18, 'tar.2');
      r.rect(hx - 1, hy, 3, 2, 'stone.1');
      r.rect(bx - 6, H - 3, 13, 3, 'stone.1', N.up);
      r.outline();
      return r;
    }
    // Stahl-Gittermast
    const legs = k >= 3 ? 10 : 3;
    for (let y = top; y < H; y++) {
      r.vline(bx - legs, y, 1, steel, N.left);
      r.vline(bx + legs, y, 1, steel, N.right);
    }
    for (let y = top + 4; y < H - 4; y += 8) {
      for (let i = 0; i <= 2 * legs; i++) {
        r.set(bx - legs + i, y + Math.round((i / (2 * legs)) * 7), r.darker(steel));
      }
      r.hline(bx - legs, y, 2 * legs + 1, steel);
    }
    if (k >= 3) {
      // Portal: Füße auf Schienen
      r.rect(bx - legs - 2, H - 4, 4, 4, 'tar.2');
      r.rect(bx + legs - 1, H - 4, 4, 4, 'tar.2');
    } else {
      r.rect(bx - 6, H - 4, 13, 4, 'stone.1', N.up);
    }
    // Ausleger mit Fachwerk
    const jy = top + 2;
    const jl = k >= 2 ? 58 : 46;
    r.hline(bx - legs, jy, jl + legs, steel, N.up);
    r.hline(bx - legs, jy + 5, jl + legs, r.darker(steel));
    for (let i = 0; i < jl; i += 5) {
      for (let d = 0; d < 5; d++) r.set(bx + i + d, jy + d, r.darker(steel));
    }
    if (k >= 2) {
      // Gegenausleger mit Gewicht
      r.hline(bx - legs - 10, jy + 2, 10, steel, N.up);
      r.rect(bx - legs - 10, jy + 3, 6, 6, 'stone.1');
    }
    // Kabine mit Fenster
    const cy = jy + 6;
    r.rect(bx - 4, cy, 9, 8, 'cream.0');
    r.vline(bx + 4, cy, 8, 'cream.0', N.right);
    window(r, bx - 2, cy + 2, 4, 3, k >= 2 ? WIN : false);
    // Laufkatze + Haken (Bild 1: Haken unten = Entladen)
    const tx = bx + jl - 8;
    r.rect(tx - 2, jy + 5, 5, 2, 'tar.2');
    const hy = jy + 20 + (f ? 18 : 0);
    r.vline(tx, jy + 7, hy - jy - 7, 'tar.2');
    r.rect(tx - 1, hy, 3, 3, 'brass.1');
    if (k >= 4) {
      // zweite Laufkatze und Flutlicht
      const t2 = bx + jl - 24;
      r.rect(t2 - 2, jy + 5, 5, 2, 'tar.2');
      r.vline(t2, jy + 7, 10 + (f ? 0 : 10), 'tar.2');
      r.rect(t2 - 1, jy + 17 + (f ? 0 : 10), 3, 3, 'brass.1');
      r.rect(bx + 6, jy - 4, 4, 3, 'stone.3');
      r.set(bx + 7, jy - 3, 'cream.1', N.flat, LAMP);
      r.set(bx + 8, jy - 3, 'cream.1', N.flat, LAMP);
    }
    r.set(bx, top - 1, 'brick.3', N.flat, RED);
    if (k >= 3) r.set(bx + jl - 1, jy - 1, 'brick.3', N.flat, RED);
    if (k >= 5) flag(r, bx, top - 12, 11, 'cblue.1');
    r.outline();
    r.removeOrphans();
    return r;
  });
  const height = [56, 74, 88, 92, 96, 100][k]!;
  const jy = H - height + 2;
  return {
    frames,
    points: {
      hook: [12 + (k >= 2 ? 58 : 46) - 8, jy + 30],
      tip: [12, H - height - 1],
      flood: [20, jy - 2],
    },
  };
}

export function crane(): SpriteDef {
  return { id: 'harbor.crane', anchor: [12, 120], shadow: true, stages: stages(craneStage) };
}

// ── Fischmarkt (Absatz) ─────────────────────────────────────────────────────
function fishMarketStage(k: number): SpriteStage {
  const W = 60;
  const H = 64;
  const r = mk(W, H);
  const points: Points = {};
  // Markthalle ab Stufe 2 (Meilenstein 25): Holzständer + Ziegeldach
  if (k >= 2) {
    const roofY = H - 40;
    r.poly(
      [
        [2, roofY + 6],
        [30, roofY - 8],
        [58, roofY + 6],
      ],
      'brick.1',
      N.up,
    );
    for (let y = roofY - 6; y < roofY + 6; y += 2)
      for (let x = 4; x < 56; x++)
        if (r.colorAt(x, y) && (x + y) % 6 === 0) r.set(x, y, 'brick.2', N.up);
    for (const px of [4, 30, 55]) r.cylinder(px, roofY + 6, 2, 34, 'wood.2');
    r.hline(2, roofY + 6, 56, 'wood.1');
    if (k >= 4) {
      // Uhr im Giebel
      r.ellipse(30, roofY - 1, 4, 4, 'cream.1');
      r.set(30, roofY - 2, 'tar.1');
      r.set(30, roofY - 1, 'tar.1');
      r.set(31, roofY - 1, 'tar.1');
    }
    if (k >= 3) {
      lamp(r, 8, roofY + 8);
      lamp(r, 49, roofY + 8);
      points['lampL'] = [9, roofY + 10];
      points['lampR'] = [50, roofY + 10];
    }
  }
  // Stände mit Markise und Theke
  const stalls = k >= 1 ? 2 : 1;
  for (let s = 0; s < stalls; s++) {
    const x = s === 0 ? 6 : 32;
    const w = 22;
    r.vline(x, H - 26, 26, 'wood.1');
    r.vline(x + w - 1, H - 26, 26, 'wood.1');
    awning(r, x - 1, H - 30, w + 2, s === 0 ? 'brick.2' : 'cblue.1', 'cream.0');
    r.rect(x, H - 11, w, 8, 'wood.3');
    r.hline(x, H - 11, w, 'wood.4', N.up);
    for (let i = 0; i < w - 2; i += 3) {
      const fish: ColorRef = hash(i, s, 3) < 0.5 ? 'sea.4' : 'stone.3';
      r.hline(x + 1 + i, H - 12, 2, fish, N.up);
      r.set(x + 1 + i, H - 13, 'sea.5');
    }
    r.rect(x, H - 3, w, 3, 'wood.1');
  }
  // Schild über dem ersten Stand (Fisch-Piktogramm, keine Schrift – l10n)
  if (k >= 1) {
    r.rect(12, H - 38, 12, 6, 'cream.0');
    r.hline(14, H - 35, 6, 'sea.2');
    r.set(20, H - 36, 'sea.2');
    r.set(20, H - 34, 'sea.2');
    r.set(15, H - 36, 'cream.1');
  }
  // Eiskisten (Stufe 3) und Fässer
  if (k >= 3) {
    crate(r, 0, H - 8, 6, 'cream.0');
    crate(r, 54, H - 8, 6, 'cream.0');
  }
  if (k >= 5) Object.assign(points, flag(r, 30, 0, 18, 'brick.2'));
  r.outline();
  r.removeOrphans();
  return { frames: [r], points };
}

export function fishMarket(): SpriteDef {
  return {
    id: 'harbor.fishMarket',
    anchor: [30, 64],
    shadow: true,
    stages: stages(fishMarketStage),
  };
}

// ── Zollhaus (Absatz) ───────────────────────────────────────────────────────
function customsStage(k: number): SpriteStage {
  const W = 56;
  const H = 84;
  const r = mk(W, H);
  const points: Points = {};
  const x0 = k >= 3 ? 4 : 12;
  const fw = k >= 3 ? 48 : 32;
  const floors = k >= 1 ? 2 : 1;
  const wallH = floors === 2 ? 44 : 24;
  const top = H - wallH;
  // Sandstein-Fassade mit Quaderung
  for (let y = top; y < H; y++) {
    for (let x = x0; x < x0 + fw; x++) {
      const joint =
        (y - top) % 6 === 5 || (x - x0 + (Math.floor((y - top) / 6) % 2) * 5) % 10 === 0;
      r.set(x, y, joint ? 'sand.0' : hash(x >> 2, y >> 2, 4) < 0.2 ? 'sand.2' : 'sand.1');
    }
  }
  r.rect(x0, H - 4, fw, 4, 'stone.1');
  // Dach: Ziegel, ab Stufe 4 Kupfer (Patina)
  const roof: ColorRef = k >= 4 ? 'teal.1' : 'sea.2';
  r.poly(
    [
      [x0 - 3, top],
      [x0 + fw / 2, top - 14],
      [x0 + fw + 3, top],
    ],
    roof,
    N.up,
  );
  r.hline(x0 - 3, top, fw + 6, r.darker(roof));
  // Tür + Fenster
  const cx = x0 + fw / 2;
  r.rect(cx - 4, H - 16, 8, 12, 'wood.1');
  r.rect(cx - 3, H - 15, 6, 11, 'wood.2');
  r.set(cx + 1, H - 9, 'brass.2');
  r.rect(cx - 6, H - 18, 12, 2, 'stone.3', N.up);
  window(r, x0 + 3, H - 16, 4, 6, WIN_DIM);
  window(r, x0 + fw - 7, H - 16, 4, 6, k >= 2 ? WIN : false);
  if (floors === 2) {
    r.hline(x0 - 1, H - 25, fw + 2, 'stone.3', N.up);
    for (let i = 0; i < (k >= 3 ? 5 : 3); i++) {
      window(r, x0 + 4 + i * 9, H - 38, 4, 7, (i + k) % 2 ? WIN : false);
    }
  }
  if (k >= 2) {
    // Uhr im Giebel
    r.ellipse(cx, top - 5, 3.5, 3.5, 'cream.1');
    r.set(cx, top - 6, 'tar.1');
    r.set(cx, top - 5, 'tar.1');
    r.set(cx + 1, top - 5, 'tar.1');
  }
  if (k >= 4) {
    // Laterne auf dem First
    r.rect(cx - 2, top - 20, 4, 6, 'teal.1');
    r.set(cx - 1, top - 18, 'brass.3', N.flat, LAMP);
    r.set(cx, top - 18, 'brass.3', N.flat, LAMP);
    points['lamp'] = [cx, top - 17];
  }
  // Fahnenmast (Zoll): ab Stufe 0, ab Stufe 5 zweiter Mast
  Object.assign(points, flag(r, x0 - 4 < 0 ? 0 : x0 - 4, H - 50, 46, 'cblue.1'));
  if (k >= 5) flag(r, x0 + fw + 1 > W - 9 ? W - 9 : x0 + fw + 1, H - 50, 46, 'brick.2');
  r.outline();
  r.removeOrphans();
  points['window'] = [x0 + fw - 5, H - 13];
  return { frames: [r], points };
}

export function customs(): SpriteDef {
  return { id: 'harbor.customs', anchor: [28, 84], shadow: true, stages: stages(customsStage) };
}

// ── Werft (Fahrzeugstufe) ───────────────────────────────────────────────────
function shipyardStage(k: number): SpriteStage {
  const W = 100;
  const H = 92;
  const r = mk(W, H);
  const points: Points = {};
  // Helling (schräge Rampe)
  for (let x = 0; x < W; x++) {
    const y = H - 4 - Math.round((x / W) * 6);
    r.rect(x, y, 1, H - y, x % 6 === 0 ? 'wood.1' : 'wood.2', N.up);
  }
  // Schiff im Bau: Spanten (0), Beplankung (1), lackiert (3)
  const hx = 14;
  const hw = 66;
  const hy = H - 30;
  for (let x = hx; x < hx + hw; x++) {
    const t = (x - hx) / hw;
    const depth = Math.round(18 * Math.sin(Math.PI * Math.min(1, t * 1.1)));
    if (depth <= 0) continue;
    const planked = k >= 1 && t < (k >= 2 ? 1 : 0.6);
    for (let y = hy; y < hy + depth; y++) {
      if (planked) {
        const c: ColorRef =
          k >= 3 ? (y - hy < 3 ? 'cream.0' : 'cblue.0') : (y - hy) % 3 === 0 ? 'wood.2' : 'wood.3';
        r.set(x, y, c, t > 0.8 ? N.right : N.flat);
      } else if ((x - hx) % 5 === 0) {
        r.set(x, y, 'wood.3');
      }
    }
    if (!planked && (x - hx) % 5 !== 0) r.set(x, hy, 'wood.2');
  }
  r.hline(hx, hy + 17, hw - 6, 'wood.1');
  // Stützen unter dem Rumpf
  for (let x = hx + 6; x < hx + hw - 6; x += 12) r.vline(x, hy + 18, H - hy - 22, 'wood.1');
  // Schuppen links (Werkstatt)
  r.rect(0, H - 34, 14, 30, 'wood.2');
  r.poly(
    [
      [-1, H - 34],
      [7, H - 42],
      [15, H - 34],
    ],
    'brick.1',
    N.up,
  );
  window(r, 4, H - 26, 5, 4, WIN_DIM);
  // Überdachung der Helling (Stufe 2)
  if (k >= 2) {
    r.hline(14, H - 64, 80, 'stone.2', N.up);
    r.hline(14, H - 63, 80, 'stone.1');
    for (const px of [16, 52, 92]) r.cylinder(px, H - 62, 2, 56, 'stone.2');
  }
  // Portalkran über der Helling (Stufe 3)
  if (k >= 3) {
    const gx = 46 + (k >= 4 ? 0 : 0);
    r.vline(gx - 20, H - 84, 78, 'brass.2', N.left);
    r.vline(gx + 26, H - 84, 78, 'brass.2', N.right);
    r.hline(gx - 22, H - 86, 52, 'brass.2', N.up);
    r.hline(gx - 22, H - 82, 52, 'brass.1');
    for (let i = 0; i < 48; i += 4)
      for (let d = 0; d < 4; d++) r.set(gx - 20 + i + d, H - 85 + d, 'brass.1');
    r.rect(gx, H - 81, 6, 4, 'tar.2');
    r.vline(gx + 3, H - 77, 12, 'tar.2');
    r.set(gx - 20, H - 87, 'brick.3', N.flat, RED);
    r.set(gx + 26, H - 87, 'brick.3', N.flat, RED);
  }
  // Flutlichter und Schweißfunken (Stufe 4)
  if (k >= 4) {
    lamp(r, 18, H - 60);
    lamp(r, 88, H - 60);
    points['lampL'] = [19, H - 58];
    points['lampR'] = [89, H - 58];
    r.set(60, hy + 4, 'cream.1', N.flat, '#bfe8ff');
    r.set(61, hy + 3, 'cream.1', N.flat, '#bfe8ff');
    points['weld'] = [60, hy + 4];
  }
  if (k >= 5) Object.assign(points, flag(r, 3, H - 60, 26, 'cgreen.1'));
  // Schornstein der Werkstatt
  r.rect(9, H - 46, 3, 6, 'brick.1');
  points['chimney'] = [10, H - 48];
  r.outline();
  r.removeOrphans();
  return { frames: [r], points };
}

export function shipyard(): SpriteDef {
  return { id: 'harbor.shipyard', anchor: [50, 92], shadow: true, stages: stages(shipyardStage) };
}

// ── Raumhafen-Anleger (Ziel-Gebäude) ────────────────────────────────────────
export function spaceportPier(): SpriteDef {
  const W = 96;
  const H = 150;
  const r = mk(W, H);
  const deck = H - 22;
  // Plattform auf Pfeilern im Wasser
  r.rect(4, deck, 88, 6, 'stone.2', N.up);
  r.hline(4, deck, 88, 'stone.4', N.up);
  for (let x = 6; x < 92; x += 4) r.set(x, deck + 2, 'brass.2');
  for (const px of [8, 30, 60, 84]) r.cylinder(px, deck + 6, 5, 16, 'stone.1');
  // Startturm (Gitter) links, Rakete rechts daneben
  const tx = 24;
  for (let y = 20; y < deck; y++) {
    r.set(tx, y, 'stone.3', N.left);
    r.set(tx + 10, y, 'stone.3', N.right);
    if ((y - 20) % 8 === 0) r.hline(tx, y, 11, 'stone.2');
    if ((y - 20) % 8 < 8) r.set(tx + ((y - 20) % 8) + 1, y, 'stone.1');
  }
  r.hline(tx, 20, 26, 'stone.3', N.up);
  for (const ly of [24, 60, 96]) {
    r.set(tx + 5, ly, 'brick.3', N.flat, RED);
  }
  // Rakete: weißer Rumpf, rote Spitze, Leitwerke
  const rx = 48;
  for (let y = 26; y < deck - 4; y++) {
    const t = y - 26;
    const w = t < 14 ? Math.max(1, Math.round(t * 0.6)) : 9;
    for (let x = rx - Math.floor(w / 2); x <= rx + Math.floor(w / 2); x++) {
      const u = (x - rx + w / 2) / w;
      const n: NormalIndex = u < 0.3 ? N.left : u > 0.7 ? N.right : N.flat;
      const c: ColorRef = t < 14 ? 'brick.2' : (y - 26) % 30 === 0 ? 'stone.3' : 'cream.1';
      r.set(x, y, c, n);
    }
  }
  r.rect(rx - 4, 70, 9, 2, 'cblue.1');
  r.poly(
    [
      [rx - 4, deck - 16],
      [rx - 9, deck - 4],
      [rx - 4, deck - 4],
    ],
    'brick.2',
  );
  r.poly(
    [
      [rx + 5, deck - 16],
      [rx + 10, deck - 4],
      [rx + 5, deck - 4],
    ],
    'brick.2',
  );
  window(r, rx - 1, 50, 2, 2, WIN);
  // Hangar rechts mit Kuppel
  r.rect(66, deck - 24, 24, 24, 'cream.0');
  r.ellipse(78, deck - 24, 12, 8, 'stone.3', N.up);
  for (let x = 66; x < 90; x++)
    for (let y = deck - 32; y < deck - 24; y++) if (r.colorAt(x, y) && y > deck - 24) r.clear(x, y);
  for (let i = 0; i < 3; i++) window(r, 69 + i * 7, deck - 16, 3, 4, WIN);
  // Positionslichter an der Plattform
  r.set(4, deck - 1, 'brick.3', N.flat, RED);
  r.set(91, deck - 1, 'cgreen.1', N.flat, GREEN);
  r.outline();
  r.removeOrphans();
  return {
    id: 'harbor.spaceportPier',
    anchor: [48, H],
    reflect: true,
    shadow: true,
    stages: [
      { frames: [r], points: { tower: [tx + 5, 24], hangar: [78, deck - 14], rocket: [rx, 40] } },
    ],
  };
}

// ── Fahrzeuge: Kutter, Frachter ─────────────────────────────────────────────
export function cutter(): SpriteDef {
  const W = 72;
  const H = 40;
  const r = mk(W, H);
  r.poly(
    [
      [2, 24],
      [62, 24],
      [70, 17],
      [71, 21],
      [63, H],
      [10, H],
      [2, 32],
    ],
    'cblue.0',
  );
  for (let y = 24; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = r.colorAt(x, y);
      if (!c) continue;
      if (y === 27) r.set(x, y, 'cream.0');
      else if (y >= H - 3) r.set(x, y, 'brick.1');
      if (x > 61) r.set(x, y, r.colorAt(x, y)!, N.right);
    }
  }
  r.hline(2, 23, 61, 'cblue.1', N.up);
  // Steuerhaus achtern
  r.rect(8, 10, 18, 14, 'cream.0');
  r.vline(25, 10, 14, 'cream.0', N.right);
  r.rect(7, 8, 20, 2, 'tar.1', N.up);
  window(r, 10, 13, 4, 3, WIN);
  window(r, 16, 13, 4, 3, WIN);
  window(r, 21, 13, 3, 3, WIN_DIM);
  r.set(7, 7, 'brick.3', N.flat, RED);
  r.set(26, 7, 'cgreen.1', N.flat, GREEN);
  // Zwei Masten mit Auslegern und Netzen
  for (const [mx, len] of [
    [38, 20],
    [54, 14],
  ] as const) {
    r.vline(mx, 2, 22, 'wood.1');
    for (let k = 0; k < len; k++) r.set(mx - Math.floor(k * 0.3), 4 + k, 'wood.2');
    for (let y = 8; y < 22; y++)
      for (let x = mx - 10; x < mx; x++)
        if ((x + y) % 2 === 0 && hash(x, y, 71) < 0.7 && y > 8 + (mx - x) * 0.8)
          r.set(x, y, 'stone.3');
  }
  r.set(38, 1, 'cream.1', N.flat, LAMP);
  // Fischkisten an Deck
  crate(r, 42, 18, 5, 'cream.0');
  crate(r, 48, 18, 5, 'wood.3');
  r.outline();
  r.removeOrphans();
  return {
    id: 'harbor.cutter',
    anchor: [36, H],
    reflect: true,
    shadow: true,
    stages: [{ frames: [r], points: { mast: [38, 1], navRed: [7, 7], navGreen: [26, 7] } }],
  };
}

export function freighter(): SpriteDef {
  const W = 124;
  const H = 52;
  const r = mk(W, H);
  r.poly(
    [
      [0, 32],
      [116, 32],
      [124, 24],
      [120, H],
      [6, H],
      [0, 40],
    ],
    'brick.1',
  );
  for (let y = 32; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!r.colorAt(x, y)) continue;
      if (y >= H - 5) r.set(x, y, 'tar.2');
      else if (y === 34) r.set(x, y, 'cream.0');
      if (x > 115) r.set(x, y, r.colorAt(x, y)!, N.right);
    }
  }
  r.hline(0, 31, 118, 'stone.2', N.up);
  // Aufbau achtern
  r.rect(4, 12, 22, 19, 'cream.0');
  r.vline(25, 12, 19, 'cream.0', N.right);
  r.hline(2, 11, 26, 'stone.3', N.up);
  for (let x = 6; x < 25; x += 3) window(r, x, 14, 2, 2, WIN);
  for (let x = 6; x < 25; x += 5) window(r, x, 21, 2, 2, hash(x, 1, 5) < 0.6 ? WIN_DIM : false);
  r.rect(10, 3, 7, 8, 'tar.2');
  r.hline(10, 5, 7, 'brick.2');
  r.set(2, 12, 'brick.3', N.flat, RED);
  r.set(27, 12, 'cgreen.1', N.flat, GREEN);
  // Ladebäume und Kistenstapel in zwei Luken
  for (const lx of [36, 74]) {
    r.vline(lx, 6, 25, 'stone.3', N.right);
    for (let k = 0; k < 22; k++) r.set(lx + k, 7 + Math.floor(k * 0.4), 'stone.2');
    crate(r, lx + 4, 23, 8);
    crate(r, lx + 13, 23, 8, 'corange.0');
    crate(r, lx + 22, 23, 8, 'cgreen.0');
    crate(r, lx + 9, 15, 8, 'cblue.0');
  }
  r.vline(112, 16, 15, 'tar.1');
  r.set(112, 15, 'cream.1', N.flat, LAMP);
  r.outline();
  r.removeOrphans();
  return {
    id: 'harbor.freighter',
    anchor: [62, H],
    reflect: true,
    shadow: true,
    stages: [
      {
        frames: [r],
        points: { funnel: [13, 2], bowLight: [112, 15], navRed: [2, 12], navGreen: [27, 12] },
      },
    ],
  };
}

// ── Baustelle: Gerüst, Schild, Funken ───────────────────────────────────────
const SCAFFOLD_SIZES: readonly [number, number][] = [
  [48, 64],
  [72, 92],
  [100, 124],
];

function scaffoldStage([w, h]: readonly [number, number]): SpriteStage {
  const r = mk(w, h);
  for (let x = 1; x < w; x += 15) r.vline(x, 2, h - 2, 'wood.3', N.right);
  r.vline(w - 2, 2, h - 2, 'wood.3', N.right);
  for (let y = h - 3; y > 4; y -= 14) {
    r.hline(0, y, w, 'wood.4', N.up);
    r.hline(0, y + 1, w, 'wood.2');
  }
  for (let x = 1; x + 15 <= w; x += 15) {
    for (let k = 0; k < 14; k++) r.set(x + k, h - 4 - k, 'wood.2');
  }
  r.outline();
  return { frames: [r] };
}

export function scaffold(): SpriteDef {
  return { id: 'harbor.scaffold', anchor: [0, 0], stages: SCAFFOLD_SIZES.map(scaffoldStage) };
}

export const scaffoldSizes = SCAFFOLD_SIZES;

/** Schild am Bauplatz: Stufe 0 = Bauplatz (Hammer), Stufe 1 = gesperrt (Schloss). */
export function sign(): SpriteDef {
  const mkSign = (locked: boolean) => {
    const r = mk(14, 20);
    r.vline(6, 9, 11, 'wood.1');
    r.rect(0, 0, 14, 10, locked ? 'stone.2' : 'brass.2');
    r.hline(0, 0, 14, locked ? 'stone.3' : 'brass.3', N.up);
    if (locked) {
      r.rect(4, 4, 6, 5, 'tar.1');
      r.vline(5, 2, 2, 'tar.1');
      r.vline(8, 2, 2, 'tar.1');
      r.hline(5, 1, 4, 'tar.1');
      r.set(7, 6, 'brass.2');
    } else {
      for (let k = 0; k < 6; k++) r.set(4 + k, 7 - k, 'wood.1');
      r.rect(8, 2, 3, 2, 'stone.1');
    }
    r.outline();
    return { frames: [r] };
  };
  return {
    id: 'harbor.sign',
    anchor: [7, 20],
    shadow: true,
    stages: [mkSign(false), mkSign(true)],
  };
}

export function spark(): SpriteDef {
  const frames = [0, 1, 2].map((f) => {
    const r = mk(5, 5);
    if (f === 0) {
      r.set(2, 2, 'cream.1', N.flat, LAMP);
    } else if (f === 1) {
      r.set(2, 2, 'brass.3', N.flat, LAMP);
      r.set(1, 2, 'brass.2', N.flat, WIN);
      r.set(3, 2, 'brass.2', N.flat, WIN);
      r.set(2, 1, 'brass.2', N.flat, WIN);
      r.set(2, 3, 'brass.2', N.flat, WIN);
    } else {
      r.set(0, 0, 'brass.2', N.flat, WIN_DIM);
      r.set(4, 0, 'brass.2', N.flat, WIN_DIM);
      r.set(0, 4, 'brass.2', N.flat, WIN_DIM);
      r.set(4, 4, 'brass.2', N.flat, WIN_DIM);
    }
    return r;
  });
  return { id: 'harbor.spark', anchor: [2, 2], stages: [{ frames }] };
}

/** Kistenstapel neben der Lagerhalle: Füllstand des Lagers in 5 Stufen. */
export function stockPile(): SpriteDef {
  const st = [0, 1, 2, 3, 4].map((n) => {
    const r = mk(34, 26);
    const spots: [number, number, ColorRef][] = [
      [0, 16, 'wood.3'],
      [11, 16, 'corange.0'],
      [22, 16, 'wood.3'],
      [5, 6, 'cblue.0'],
      [16, 6, 'wood.3'],
    ];
    for (let i = 0; i < Math.max(1, n + 1) && i < spots.length; i++) {
      const [x, y, c] = spots[i]!;
      crate(r, x, y, 10, c);
    }
    r.outline();
    return { frames: [r] };
  });
  return { id: 'harbor.stock', anchor: [17, 26], shadow: true, stages: st };
}

/** Brick-Hilfe für Anbauten (Lagerhalle Stufe 4). */
export function brickAnnex(r: Raster, x: number, y: number, w: number, h: number): void {
  brickWall(r, x, y, w, h, 19);
  r.poly(
    [
      [x - 1, y],
      [x + w, y - 6],
      [x + w, y],
    ],
    'tar.2',
    N.upLeft,
  );
}

/** Porträt der Hafenmeisterin (Tutorial-Coach, docs/05 § Tutorial), 32 × 32. */
export function harbormaster(): SpriteDef {
  const r = mk(32, 32);
  // Hintergrund-Kreis (Meer) und Schultern in Uniform
  r.ellipse(16, 16, 15.5, 15.5, 'sea.2');
  r.ellipse(16, 34, 13, 9, 'cblue.0');
  r.rect(13, 25, 6, 3, 'cream.0');
  r.set(16, 28, 'brass.2');
  r.set(16, 30, 'brass.2');
  // Hals, Gesicht
  r.rect(14, 22, 4, 4, 'sand.1');
  r.ellipse(16, 16, 6.5, 7.5, 'sand.2', N.flat);
  for (let y = 10; y < 24; y++) if (r.colorAt(21, y) === 'sand.2') r.set(21, y, 'sand.1', N.right);
  // Haare (Zopf) und Mütze mit Messing-Anker
  r.rect(9, 12, 3, 9, 'wood.1');
  r.rect(20, 12, 3, 7, 'wood.1');
  r.rect(7, 18, 3, 6, 'wood.1');
  r.rect(8, 7, 16, 5, 'cblue.0', N.up);
  r.hline(7, 11, 18, 'tar.1');
  r.hline(8, 6, 16, 'cblue.1', N.up);
  r.set(16, 8, 'brass.3');
  r.set(16, 9, 'brass.2');
  // Augen, Mund, Wangen
  r.set(13, 16, 'tar.1');
  r.set(19, 16, 'tar.1');
  r.hline(14, 20, 4, 'brick.2');
  r.set(12, 18, 'brick.3');
  r.set(20, 18, 'brick.3');
  r.outline();
  return { id: 'harbor.portrait.harbormaster', anchor: [0, 0], stages: [{ frames: [r] }] };
}
