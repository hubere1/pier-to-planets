/**
 * Generatoren Ära 1 „Hafen“ (docs/06 §3, §6; Stilprobe M1).
 * Alle Objekte aus Geometrie: Albedo nur Palettenfarben, Normalen aus derselben Form,
 * Emissive für Fenster, Lampen und Positionslichter.
 */
import { hash, N, type ColorRef, type NormalIndex, type Raster } from '../lib/raster.ts';
import type { SpriteDef } from '../lib/sprite.ts';
import {
  brickAnnex,
  crane,
  cutter,
  customs,
  fishMarket,
  freighter,
  harbormaster,
  scaffold,
  shipyard,
  sign,
  spaceportPier,
  spark,
  STAGES,
  stockPile,
} from './buildings.ts';
import {
  BEAM,
  brickWall,
  CITY,
  GREEN,
  LAMP,
  mk,
  palette,
  RED,
  WIN,
  WIN_DIM,
  window,
} from './common.ts';

// ── Steg (6 Ausbaustufen: Geländer 10, Laternen 25, Rettungsringe 50, Unterstand 100, Fahnen 200) ─
function pierStage(k: number) {
  const W = 186;
  const H = 64;
  const deck = H - 40;
  const r = mk(W, H);
  r.noiseRect(0, deck, W, 3, ['wood.4', 'wood.4', 'wood.5', 'wood.3'], 11, N.up);
  r.rect(0, deck + 3, W, 4, 'wood.3');
  for (let x = 0; x < W; x += 7) r.vline(x, deck + 3, 4, 'wood.2');
  r.hline(0, deck + 6, W, 'wood.2');
  for (let x = 3; x < W - 4; x += 20) {
    r.cylinder(x, deck + 7, 4, H - deck - 7, 'wood.2');
    r.hline(x, deck + 9, 4, 'wood.1');
    r.hline(x, H - 3, 4, 'teal.1');
    r.hline(x, H - 2, 4, 'teal.0');
    r.hline(x, H - 1, 4, 'teal.0');
    if (x + 24 < W) {
      for (let i = 0; i < 16; i++) r.set(x + 4 + i, deck + 8 + Math.floor(i * 0.45), 'wood.1');
    }
  }
  // Poller auf dem Deck
  const bollards = k >= 3 ? [24, 60, 96, 132, 168] : [24, 96, 168];
  for (const bx of bollards) {
    r.rect(bx, deck - 3, 4, 3, 'tar.2');
    r.hline(bx - 1, deck - 4, 6, 'tar.2', N.up);
  }
  const points: Record<string, readonly [number, number]> = {};
  if (k >= 1) {
    // Geländer zur Wasserseite
    r.hline(0, deck - 8, W, 'wood.3', N.up);
    for (let x = 2; x < W; x += 10) r.vline(x, deck - 7, 7, 'wood.2');
  }
  if (k >= 2) {
    // Laternen
    for (const [i, lx] of [44, 116].entries()) {
      r.vline(lx + 1, deck - 20, 20, 'tar.1');
      r.rect(lx, deck - 24, 3, 4, 'brass.1');
      r.set(lx + 1, deck - 23, 'brass.3', N.flat, LAMP);
      r.set(lx + 1, deck - 22, 'brass.3', N.flat, LAMP);
      points[`lamp${i}`] = [lx + 1, deck - 22];
    }
  }
  if (k >= 3) {
    // Rettungsringe am Geländer
    for (const rx of [30, 102, 150]) {
      r.ellipse(rx, deck - 4, 2.6, 2.6, 'brick.3');
      r.set(rx, deck - 4, 'wood.4');
      r.set(rx - 2, deck - 4, 'cream.1');
      r.set(rx + 2, deck - 4, 'cream.1');
    }
  }
  if (k >= 4) {
    // Unterstand am Stegkopf
    r.rect(150, deck - 26, 30, 2, 'brick.1', N.up);
    r.vline(151, deck - 24, 24, 'wood.2');
    r.vline(178, deck - 24, 24, 'wood.2');
    r.rect(155, deck - 12, 20, 4, 'wood.3');
    window(r, 160, deck - 20, 8, 4, WIN_DIM);
    points['shelter'] = [164, deck - 18];
  }
  if (k >= 5) {
    for (const fx of [8, 182]) {
      r.vline(fx, deck - 34, 34, 'stone.3', N.right);
      r.rect(fx - 8, deck - 33, 8, 5, fx < 100 ? 'cblue.1' : 'brick.2');
      points[fx < 100 ? 'flagL' : 'flagR'] = [fx - 4, deck - 31];
    }
  }
  r.outline();
  r.removeOrphans();
  return { frames: [r], points };
}

function pier(): SpriteDef {
  return {
    id: 'harbor.pier',
    anchor: [0, 64],
    reflect: true,
    shadow: false,
    stages: Array.from({ length: STAGES }, (_, k) => pierStage(k)),
  };
}

// ── Kaimauer ────────────────────────────────────────────────────────────────
// Reicht nach links bis unter die Werft (Kamera-Schwenk, D-029); Muster bleibt an X = QUAY_PAD verankert.
const QUAY_PAD = 166;

function quay(): SpriteDef {
  const W = 206 + QUAY_PAD;
  const H = 46;
  const r = mk(W, H);
  r.noiseRect(0, 0, W, 7, ['stone.2', 'stone.3', 'stone.2', 'stone.1', 'sand.1'], 21, N.up);
  r.hline(0, 7, W, 'stone.4', N.up);
  for (let y = 8; y < H; y++) {
    const course = Math.floor((y - 8) / 6);
    for (let x = 0; x < W; x++) {
      const qx = x - QUAY_PAD;
      const mortar = (y - 8) % 6 === 5 || (qx + (course % 2) * 7) % 14 === 0;
      const v = hash(Math.floor((qx + (course % 2) * 7) / 14), course, 5);
      const block: ColorRef = v < 0.3 ? 'stone.1' : v < 0.8 ? 'stone.2' : 'stone.3';
      r.set(x, y, mortar ? 'stone.0' : block);
    }
  }
  // Algen und Nässe an der Wasserlinie (gedithert, keine Verläufe – docs/06 §3)
  for (let y = H - 9; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = (y - (H - 9)) / 9;
      if (hash(x, y, 9) < t * 1.2) r.set(x, y, t > 0.6 ? 'teal.0' : 'leaf.0');
    }
  }
  // Festmacher-Ringe
  for (const rx of [40 + QUAY_PAD, 120 + QUAY_PAD, 186 + QUAY_PAD]) {
    r.set(rx, 16, 'brass.1');
    r.set(rx - 1, 17, 'brass.0');
    r.set(rx + 1, 17, 'brass.0');
    r.set(rx, 18, 'brass.0');
  }
  r.outline();
  return {
    id: 'harbor.quay',
    anchor: [0, H],
    reflect: true,
    shadow: false,
    stages: [{ frames: [r] }],
  };
}

// ── Lagerhalle (6 Ausbaustufen: 2. Stockwerk 10, Rolltor 25, Dachkran 50, Anbau 100, Fahne 200) ─
function warehouseStage(stage: number) {
  const W = 100;
  const H = 120;
  const r = mk(W, H);
  const x0 = 16;
  const fw = 68;
  const storeys = stage === 0 ? 1 : 2;
  const wallH = storeys === 1 ? 38 : 66;
  const top = H - wallH;
  brickWall(r, x0, top, fw, wallH, 3 + stage);
  // Sockel
  r.rect(x0, H - 4, fw, 4, 'stone.1');
  r.hline(x0, H - 4, fw, 'stone.2', N.up);
  // Gesims zwischen den Stockwerken
  if (storeys === 2) {
    r.hline(x0 - 1, H - 38, fw + 2, 'stone.3', N.up);
    r.hline(x0 - 1, H - 37, fw + 2, 'stone.1');
  }
  // Giebel (Teil der Fassade) + Dachkanten
  const gableH = 20;
  const cx = x0 + fw / 2;
  r.poly(
    [
      [x0, top],
      [cx, top - gableH],
      [x0 + fw, top],
    ],
    'brick.2',
  );
  brickWallClip(r, x0, top - gableH, fw, gableH, 7);
  for (let k = 0; k <= fw / 2 + 4; k++) {
    const yy = top - Math.round((k / (fw / 2)) * gableH);
    const lx = x0 - 4 + k;
    const rx = x0 + fw + 4 - k;
    for (let t = 0; t < 3; t++) {
      if (lx <= cx) r.set(lx, yy + t + 1, t === 0 ? 'stone.1' : 'tar.1', N.upLeft);
      if (rx >= cx) r.set(rx, yy + t + 1, t === 0 ? 'stone.1' : 'tar.1', N.upRight);
    }
  }
  // Rundfenster im Giebel
  r.ellipse(cx, top - 8, 3.5, 3.5, 'wood.1');
  r.ellipse(cx, top - 8, 2.5, 2.5, 'sea.1');
  for (let yy = top - 11; yy <= top - 5; yy++) {
    for (let xx = cx - 3; xx <= cx + 3; xx++)
      if (r.colorAt(xx, yy) === 'sea.1') r.glow(xx, yy, WIN_DIM);
  }
  // Schornstein rechts auf dem Dach
  const chX = x0 + fw - 16;
  const chTop = top - 15;
  r.rect(chX, chTop, 6, 10, 'brick.1');
  r.hline(chX - 1, chTop - 1, 8, 'stone.2', N.up);
  r.vline(chX + 5, chTop, 10, 'brick.0', N.right);

  // Erdgeschoss: Tor
  const doorW = stage >= 2 ? 26 : 18;
  const doorH = stage >= 2 ? 26 : 24;
  const dx = Math.round(cx - doorW / 2);
  const dy = H - 4 - doorH;
  if (stage >= 2) {
    r.rect(dx - 1, dy - 3, doorW + 2, doorH + 3, 'stone.0');
    for (let yy = dy; yy < dy + doorH; yy++)
      r.hline(dx, yy, doorW, (yy - dy) % 3 === 2 ? 'stone.1' : 'stone.2');
    for (let xx = dx - 1; xx < dx + doorW + 1; xx++) {
      r.set(xx, dy - 3, Math.floor(xx / 2) % 2 ? 'brass.2' : 'tar.1');
    }
  } else {
    r.rect(dx - 1, dy - 1, doorW + 2, doorH + 1, 'wood.0');
    r.rect(dx, dy, doorW, doorH, 'wood.2');
    for (let xx = dx + 2; xx < dx + doorW; xx += 3) r.vline(xx, dy, doorH, 'wood.1');
    r.vline(dx + doorW / 2, dy, doorH, 'wood.0');
    for (let k = 0; k < doorW / 2; k++) {
      r.set(dx + k, dy + Math.round((k / (doorW / 2)) * (doorH - 2)), 'wood.3');
      r.set(dx + doorW - 1 - k, dy + Math.round((k / (doorW / 2)) * (doorH - 2)), 'wood.3');
    }
  }
  // Erdgeschoss: Fenster links/rechts
  window(r, x0 + 6, H - 30, 7, 9, WIN);
  window(r, x0 + fw - 13, H - 30, 7, 9, stage >= 1 ? WIN : false);

  if (storeys === 2) {
    // Obergeschoss: Ladeluke mit Kranbalken + Fenster
    window(r, x0 + 6, H - 60, 7, 11, WIN_DIM);
    window(r, x0 + fw - 13, H - 60, 7, 11, WIN);
    r.rect(cx - 6, H - 62, 12, 18, 'wood.0');
    r.rect(cx - 5, H - 61, 10, 17, 'wood.2');
    r.vline(cx, H - 61, 17, 'wood.1');
    r.rect(cx - 2, top - 2, 4, 3, 'wood.3', N.up);
    r.hline(cx - 2, top + 1, 10, 'wood.2');
    r.vline(cx + 7, top + 2, 10, 'stone.0');
    r.set(cx + 7, top + 12, 'brass.1');
  }

  const points: Record<string, readonly [number, number]> = { chimney: [chX + 3, chTop - 2] };
  if (stage >= 4) {
    // Anbau links (Meilenstein 100)
    brickAnnex(r, 1, H - 30, 15, 26);
    r.rect(1, H - 4, 15, 4, 'stone.1');
    window(r, 5, H - 22, 6, 6, WIN);
    points['annex'] = [8, H - 19];
  }
  if (stage >= 5) Object.assign(points, flagOn(r, cx, top - 34));
  if (stage >= 3) {
    // Kran auf dem Dach (Meilenstein 50)
    const kx = x0 + 6;
    const ky = top - 4;
    r.vline(kx, ky - 22, 22, 'brass.1', N.left);
    r.vline(kx + 1, ky - 22, 22, 'brass.2', N.right);
    for (let k = 0; k < 26; k++) r.set(kx + 1 + k, ky - 22 + Math.floor(k / 9), 'brass.2', N.up);
    for (let k = 0; k < 26; k += 3) r.set(kx + 1 + k, ky - 21 + Math.floor(k / 9), 'brass.0');
    r.vline(kx + 24, ky - 19, 10, 'tar.2');
    r.rect(kx + 23, ky - 9, 3, 2, 'tar.1');
    r.rect(kx - 2, ky - 1, 6, 3, 'tar.2', N.up);
  }
  if (stage >= 2) {
    // Lampen neben dem Rolltor und Schild (Meilenstein 25)
    for (const lx of [dx - 5, dx + doorW + 3]) {
      r.rect(lx, dy + 2, 3, 4, 'brass.1');
      r.set(lx + 1, dy + 3, 'brass.3', N.flat, LAMP);
      r.set(lx + 1, dy + 4, 'brass.3', N.flat, LAMP);
    }
    // Schild mit Anker-Piktogramm (keine Schrift in der Grafik – l10n)
    r.rect(cx - 9, dy - 12, 18, 8, 'cream.0');
    r.hline(cx - 9, dy - 12, 18, 'cream.1', N.up);
    r.vline(cx, dy - 11, 6, 'sea.1');
    r.hline(cx - 2, dy - 10, 5, 'sea.1');
    r.set(cx - 2, dy - 6, 'sea.1');
    r.set(cx + 2, dy - 6, 'sea.1');
    r.hline(cx - 1, dy - 5, 3, 'sea.1');
    points['lampL'] = [dx - 4, dy + 4];
    points['lampR'] = [dx + doorW + 4, dy + 4];
  }
  points['window'] = [x0 + 9, H - 26];
  r.outline();
  r.removeOrphans();
  return { frames: [r], points };
}

/** Ziegelmuster nur dort, wo schon Fassade ist (Giebeldreieck). */
function brickWallClip(r: Raster, x: number, y: number, w: number, h: number, seed: number): void {
  const tmp = mk(r.w, r.h);
  brickWall(tmp, x, y, w, h, seed);
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const c = tmp.colorAt(xx, yy);
      if (c && r.colorAt(xx, yy) !== undefined) r.set(xx, yy, c);
    }
  }
}

function flagOn(r: Raster, x: number, top: number): Record<string, readonly [number, number]> {
  r.vline(x, top, 16, 'stone.3', N.right);
  r.set(x, top - 1, 'brass.2');
  r.rect(x + 1, top + 1, 8, 5, 'brass.2');
  r.hline(x + 1, top + 4, 8, 'brass.1');
  return { flag: [x + 4, top + 3] };
}

function warehouse(): SpriteDef {
  return {
    id: 'harbor.warehouse',
    anchor: [50, 120],
    shadow: true,
    stages: Array.from({ length: STAGES }, (_, k) => warehouseStage(k)),
  };
}

// ── Leuchtturm ──────────────────────────────────────────────────────────────
/** `k = -1`: dunkler, alter Turm (vor dem Kauf); 0–5: Ausbaustufen mit Licht. */
function lighthouseStage(k: number) {
  const W = 32;
  const H = 100;
  const r = mk(W, H);
  const lit = k >= 0;
  const cx = 16;
  for (let y = 30; y < H; y++) {
    const t = (y - 30) / (H - 30);
    const w = Math.round(14 + t * 8);
    const x0 = Math.round(cx - w / 2);
    const band = Math.floor((y - 30) / 12) % 2 === 0 ? 'cream.0' : 'brick.2';
    for (let x = x0; x < x0 + w; x++) {
      const u = (x - x0 + 0.5) / w;
      const n: NormalIndex = u < 0.3 ? N.left : u > 0.7 ? N.right : N.flat;
      r.set(x, y, band, n);
    }
  }
  r.rect(cx - 3, H - 11, 6, 11, 'wood.1');
  r.hline(cx - 2, H - 12, 4, 'wood.1');
  r.vline(cx, H - 10, 10, 'wood.0');
  for (const wy of [48, 72]) {
    r.rect(cx - 1, wy, 2, 3, 'sea.1');
    for (let i = 0; i < 3; i++) {
      if (lit && (wy === 72 || k >= 1)) {
        r.glow(cx - 1, wy + i, WIN);
        r.glow(cx, wy + i, WIN);
      }
    }
  }
  // Galerie mit Geländer
  r.rect(cx - 12, 27, 24, 3, 'tar.1');
  r.hline(cx - 12, 27, 24, 'tar.2', N.up);
  r.hline(cx - 12, 23, 24, 'tar.2');
  for (let x = cx - 12; x < cx + 12; x += 3) r.vline(x, 24, 3, 'tar.2');
  // Laternenraum
  r.rect(cx - 6, 13, 12, 11, 'brass.3');
  if (lit) for (let y = 13; y < 24; y++) for (let x = cx - 6; x < cx + 6; x++) r.glow(x, y, BEAM);
  else r.rect(cx - 5, 14, 10, 9, 'sea.1');
  r.vline(cx - 6, 13, 11, 'brass.0');
  r.vline(cx + 5, 13, 11, 'brass.0');
  r.vline(cx, 13, 11, 'brass.1');
  r.hline(cx - 6, 18, 12, 'brass.1');
  // Kuppel
  for (let y = 6; y < 13; y++) {
    const half = Math.round(((y - 5) / 8) * 8);
    for (let x = cx - half; x < cx + half; x++) {
      r.set(x, y, 'brick.1', x < cx - 2 ? N.upLeft : x >= cx + 2 ? N.upRight : N.up);
    }
  }
  r.vline(cx, 2, 4, 'tar.2');
  r.set(cx, 1, k >= 3 ? 'brass.3' : 'brass.2');
  if (k >= 2) {
    // Messingkranz unter der Kuppel
    r.hline(cx - 7, 12, 14, 'brass.2', N.up);
  }
  if (k >= 3) {
    // zweite Galerie
    r.hline(cx - 10, 44, 20, 'tar.1');
    r.hline(cx - 10, 41, 20, 'tar.2');
    for (let x = cx - 10; x < cx + 10; x += 3) r.vline(x, 42, 2, 'tar.2');
  }
  if (k >= 4) {
    // Nebelhorn + rotes Warnlicht
    r.rect(cx + 7, 30, 4, 3, 'brass.1');
    r.set(cx - 9, 26, 'brick.3', N.flat, RED);
  }
  if (k >= 5) {
    r.vline(cx + 11, 6, 21, 'stone.3', N.right);
    r.rect(cx + 12, 7, 6, 4, 'cblue.1');
  }
  r.outline();
  r.removeOrphans();
  return { frames: [r], points: { lamp: [cx, 18] as const } };
}

function lighthouse(): SpriteDef {
  return {
    id: 'harbor.lighthouse',
    anchor: [16, 100],
    shadow: true,
    stages: [-1, 0, 1, 2, 3, 4, 5].map(lighthouseStage),
  };
}

// ── Klippe (Mittelgrund) ────────────────────────────────────────────────────
function cliff(): SpriteDef {
  const W = 150;
  const H = 150;
  const r = mk(W, H);
  r.poly(
    [
      [0, H],
      [4, 118],
      [12, 96],
      [9, 74],
      [22, 56],
      [38, 44],
      [58, 36],
      [70, 34],
      [110, 34],
      [124, 40],
      [134, 62],
      [142, 92],
      [150, 124],
      [150, H],
    ],
    'stone.2',
  );
  // Höhe der Oberkante je Spalte
  const topOf = (x: number) => {
    for (let y = 0; y < H; y++) if (r.colorAt(x, y) !== undefined) return y;
    return H;
  };
  for (let x = 0; x < W; x++) {
    const t0 = topOf(x);
    for (let y = t0; y < H; y++) {
      const d = y - t0;
      if (d < 3) {
        r.set(x, y, d === 0 ? 'leaf.3' : 'leaf.2', N.up);
        continue;
      }
      if (d < 5 && hash(x, y, 2) < 0.5) {
        r.set(x, y, 'leaf.1', N.up);
        continue;
      }
      // Felsplatten: große Flächen je Platte, dazu wenige Risse (statt Körnung)
      const slab = Math.floor((y + Math.floor(hash(Math.floor(x / 11), 0, 4) * 7)) / 13);
      const strata =
        (y + Math.floor(hash(Math.floor(x / 11), 0, 4) * 7)) % 13 === 0 && hash(x, slab, 6) < 0.8;
      const v = hash(Math.floor((x + slab * 5) / 16), slab, 8) * 0.85 + hash(x, y, 9) * 0.15;
      const depth = (y - 34) / (H - 34);
      let c: ColorRef = v < 0.3 ? 'stone.3' : v < 0.8 ? 'stone.2' : 'stone.1';
      if (depth > 0.65 && v < 0.6) c = 'stone.1';
      if (strata) c = 'stone.0';
      const n: NormalIndex =
        x < 50 ? (d < 12 ? N.upLeft : N.left) : x > 118 ? N.right : d < 10 ? N.up : N.flat;
      r.set(x, y, c, n);
    }
  }
  for (let y = H - 10; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (r.colorAt(x, y) !== undefined && hash(x, y, 31) < (y - (H - 10)) / 8)
        r.set(x, y, 'teal.0');
    }
  }
  // kleiner Weg zum Leuchtturm
  for (let k = 0; k < 30; k++) r.set(60 + k, 35 + Math.floor(k / 12), 'sand.1', N.up);
  r.outline();
  return { id: 'harbor.cliff', anchor: [0, H], reflect: true, stages: [{ frames: [r] }] };
}

// ── Ferne: Hügel, Stadt, Wolken ─────────────────────────────────────────────
// 40 px Reserve je Seite für den Kamera-Schwenk (D-029); Verlauf bleibt an X = 40 verankert.
const HILLS_PAD = 40;

function hills(): SpriteDef {
  const W = 360 + 2 * HILLS_PAD;
  const H = 64;
  const r = mk(W, H);
  for (let x = 0; x < W; x++) {
    const hx = x - HILLS_PAD;
    const back = 22 + Math.round(10 * Math.sin(hx / 41) + 6 * Math.sin(hx / 17 + 1.3));
    const front = 40 + Math.round(6 * Math.sin(hx / 29 + 2) + 3 * Math.sin(hx / 11));
    for (let y = back; y < H; y++)
      r.set(x, y, y === back ? 'haze.2' : 'haze.1', y === back ? N.up : N.flat);
    for (let y = front; y < H; y++) r.set(x, y, y === front ? 'haze.1' : 'haze.0');
    if (hash(hx, 0, 12) < 0.18) {
      const th = 3 + Math.floor(hash(hx, 1, 12) * 4);
      for (let k = 0; k < th; k++) {
        const half = Math.floor(k / 2);
        for (let dx = -half; dx <= half; dx++) r.set(x + dx, front - th + k, 'sea.3');
      }
    }
  }
  return { id: 'harbor.hills', anchor: [0, H], stages: [{ frames: [r] }] };
}

function city(): SpriteDef {
  const W = 150;
  const H = 46;
  const r = mk(W, H);
  let x = 0;
  let i = 0;
  while (x < W - 6) {
    const bw = 6 + Math.floor(hash(i, 0, 40) * 12);
    const bh = 10 + Math.floor(hash(i, 1, 40) * 22);
    const c: ColorRef = hash(i, 2, 40) < 0.5 ? 'haze.0' : 'sea.3';
    r.rect(x, H - bh, bw, bh, c);
    r.hline(x, H - bh, bw, 'haze.1', N.up);
    for (let wy = H - bh + 3; wy < H - 2; wy += 3) {
      for (let wx = x + 1; wx < x + bw - 1; wx += 2) {
        if (hash(wx, wy, 41) < 0.22) {
          r.set(wx, wy, 'sea.2');
          r.glow(wx, wy, CITY);
        }
      }
    }
    x += bw + (hash(i, 3, 40) < 0.3 ? 1 : 0);
    i++;
  }
  // Kirchturm und zwei Hafenkräne als Silhouetten
  r.rect(52, 6, 6, 40, 'sea.3');
  for (let k = 0; k < 8; k++)
    r.hline(55 - Math.floor(k / 2), k - 2, 1 + Math.floor(k / 2) * 2, 'sea.3');
  for (const kx of [104, 128]) {
    r.vline(kx, 4, 42, 'sea.2');
    r.hline(kx - 6, 4, 22, 'sea.2');
    r.vline(kx + 14, 5, 6, 'sea.2');
    r.set(kx, 3, 'sea.2', N.flat, RED);
  }
  return { id: 'harbor.city', anchor: [0, H], stages: [{ frames: [r] }] };
}

function cloud(id: string, w: number, h: number, seed: number): SpriteDef {
  const r = mk(w, h);
  const blobs = 5 + Math.floor(hash(seed, 0, 50) * 3);
  for (let b = 0; b < blobs; b++) {
    const cx = 8 + hash(b, 1, seed) * (w - 16);
    const ry = 3 + hash(b, 2, seed) * (h / 2 - 3);
    const rx = ry * (1.4 + hash(b, 3, seed));
    r.ellipse(cx, h - ry - 2, rx, ry, 'cream.1', N.up);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = r.colorAt(x, y);
      if (!c) continue;
      const below = r.colorAt(x, y + 2) === undefined;
      if (below) r.set(x, y, 'haze.2', N.down);
      else if (r.colorAt(x, y - 1) !== undefined && (y + x) % 2 === 0 && y > h / 2)
        r.set(x, y, 'cream.0');
    }
  }
  r.removeOrphans();
  return { id, anchor: [0, h], stages: [{ frames: [r] }] };
}

// ── Fahrzeuge ───────────────────────────────────────────────────────────────
function fishingBoat(): SpriteDef {
  const W = 58;
  const H = 34;
  const r = mk(W, H);
  r.poly(
    [
      [3, 19],
      [48, 19],
      [55, 14],
      [56, 17],
      [50, H],
      [9, H],
      [3, 27],
    ],
    'brick.2',
  );
  for (let y = 19; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = r.colorAt(x, y);
      if (!c) continue;
      if (y === 22 || y === 23) r.set(x, y, 'cream.0');
      else if (y >= H - 3) r.set(x, y, 'tar.2');
      if (x > 47) r.set(x, y, r.colorAt(x, y)!, N.right);
    }
  }
  r.hline(3, 18, 46, 'wood.4', N.up);
  for (let k = 0; k < 7; k++) r.set(48 + k, 18 - Math.floor(k * 0.6), 'wood.4', N.up);
  // Steuerhaus
  r.rect(12, 8, 15, 11, 'cream.0');
  r.vline(26, 8, 11, 'cream.0', N.right);
  r.rect(11, 6, 17, 2, 'tar.1', N.up);
  window(r, 14, 10, 4, 3, WIN);
  window(r, 20, 10, 4, 3, WIN);
  r.set(11, 5, 'brick.3', N.flat, RED);
  r.set(27, 5, 'cgreen.1', N.flat, GREEN);
  // Mast, Ausleger, Netz
  r.vline(36, 1, 18, 'wood.1');
  r.set(36, 0, 'cream.1', N.flat, LAMP);
  for (let k = 0; k < 14; k++) r.set(36 + k, 3 + Math.floor(k * 0.4), 'wood.2');
  for (let y = 5; y < 17; y++) {
    for (let x = 38; x < 50; x++) {
      if ((x + y) % 2 === 0 && hash(x, y, 70) < 0.75 && y < 5 + (x - 36) * 0.9)
        r.set(x, y, 'stone.3');
    }
  }
  r.rect(36, 1, 2, 2, 'brick.3');
  // Fischer
  r.set(31, 12, 'corange.1');
  r.set(32, 12, 'corange.1');
  r.set(31, 13, 'sand.2');
  r.set(32, 13, 'sand.2');
  r.rect(30, 14, 4, 4, 'cblue.1');
  r.outline();
  r.removeOrphans();
  return {
    id: 'harbor.fishingBoat',
    anchor: [28, H],
    reflect: true,
    shadow: true,
    stages: [{ frames: [r], points: { mast: [36, 0], navRed: [11, 5], navGreen: [27, 5] } }],
  };
}

function containerShip(): SpriteDef {
  const W = 152;
  const H = 56;
  const r = mk(W, H);
  r.poly(
    [
      [0, 38],
      [146, 38],
      [152, 33],
      [147, H],
      [7, H],
      [0, 46],
    ],
    'tar.2',
  );
  for (let y = 38; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!r.colorAt(x, y)) continue;
      if (y >= H - 6) r.set(x, y, 'brick.1');
      else if (y === 39) r.set(x, y, 'cream.0');
      if (x > 144) r.set(x, y, r.colorAt(x, y)!, N.right);
    }
  }
  r.hline(0, 37, 147, 'stone.2', N.up);
  // Aufbau mit Brücke
  r.rect(5, 14, 24, 23, 'cream.0');
  r.vline(28, 14, 23, 'cream.0', N.right);
  r.hline(3, 13, 28, 'stone.3', N.up);
  for (let x = 6; x < 28; x++) {
    r.set(x, 16, 'sea.1');
    r.set(x, 17, 'sea.1');
    if (x % 4 !== 0) {
      r.glow(x, 16, WIN);
      r.glow(x, 17, WIN);
    } else {
      r.set(x, 16, 'stone.2');
      r.set(x, 17, 'stone.2');
    }
  }
  for (const py of [23, 29]) {
    for (let x = 8; x < 27; x += 4) {
      r.set(x, py, 'sea.1');
      if (hash(x, py, 3) < 0.6) r.glow(x, py, WIN_DIM);
    }
  }
  r.set(2, 14, 'brick.3', N.flat, RED);
  r.set(30, 14, 'cgreen.1', N.flat, GREEN);
  // Schornstein
  r.rect(12, 3, 9, 10, 'brick.2');
  r.vline(20, 3, 10, 'brick.1', N.right);
  r.hline(12, 6, 9, 'cream.0');
  r.rect(12, 1, 9, 2, 'tar.1', N.up);
  // Container in Stapeln
  const colors: ColorRef[] = [
    'cblue.0',
    'cblue.1',
    'cgreen.0',
    'cgreen.1',
    'corange.0',
    'corange.1',
    'brick.2',
    'stone.2',
  ];
  for (let col = 0; col < 9; col++) {
    const x = 33 + col * 12;
    const tiers = 2 + (hash(col, 0, 77) < 0.6 ? 1 : 0);
    for (let t = 0; t < tiers; t++) {
      const y = 37 - (t + 1) * 8;
      const c = colors[Math.floor(hash(col, t, 78) * colors.length)]!;
      r.rect(x, y, 11, 8, c);
      for (let xx = x + 1; xx < x + 11; xx += 2) r.vline(xx, y + 1, 6, r.darker(c));
      r.hline(x, y + 7, 11, r.darker(c));
      if (t === tiers - 1) r.hline(x, y, 11, r.lighter(c), N.up);
    }
  }
  // Masten mit Topplicht
  r.vline(143, 22, 16, 'tar.1');
  r.set(143, 21, 'cream.1', N.flat, LAMP);
  r.vline(17, 0, 1, 'tar.1');
  r.outline();
  r.removeOrphans();
  return {
    id: 'harbor.containerShip',
    anchor: [76, H],
    reflect: true,
    shadow: true,
    stages: [
      {
        frames: [r],
        points: { funnel: [16, 0], bowLight: [143, 21], navRed: [2, 14], navGreen: [30, 14] },
      },
    ],
  };
}

// ── Figuren und Tiere ───────────────────────────────────────────────────────
function worker(): SpriteDef {
  const legs: [number, number][][] = [
    [
      [4, 0],
      [5, 0],
    ],
    [
      [3, -1],
      [6, 1],
    ],
    [
      [4, 0],
      [5, 0],
    ],
    [
      [6, 1],
      [3, -1],
    ],
  ];
  const frames = legs.map((pair, f) => {
    const r = mk(10, 15);
    r.rect(3, 0, 4, 2, 'brass.2', N.up);
    r.hline(2, 1, 6, 'brass.2');
    r.rect(3, 2, 4, 3, 'sand.2');
    r.set(6, 3, 'tar.1');
    r.rect(2, 5, 6, 5, 'corange.1');
    r.hline(2, 7, 6, 'cream.1');
    const swing = f % 2 === 0 ? 0 : f === 1 ? 1 : -1;
    r.vline(1, 5 + Math.max(0, swing), 4, 'corange.0');
    r.vline(8, 5 + Math.max(0, -swing), 4, 'corange.0');
    for (const [lx, dy] of pair) {
      r.vline(lx, 10, 4 + Math.min(dy, 0) + 1, 'cblue.0');
      r.set(lx + (dy > 0 ? 1 : 0), 14, 'tar.0');
    }
    r.outline();
    return r;
  });
  return { id: 'harbor.worker', anchor: [5, 15], shadow: true, stages: [{ frames }] };
}

function gull(): SpriteDef {
  const wingY = [0, 2, 4];
  const frames = wingY.map((wy) => {
    const r = mk(13, 7);
    r.rect(4, 3, 5, 2, 'cream.1');
    r.set(9, 2, 'cream.1');
    r.set(10, 2, 'brass.2');
    r.set(8, 2, 'tar.1');
    r.set(3, 3, 'stone.3');
    for (let k = 0; k < 4; k++) {
      const y = 3 - Math.round(((3 - wy) * (k + 1)) / 4);
      r.set(5 - k, y, k === 3 ? 'tar.1' : 'stone.3');
      r.set(7 + Math.min(k, 2), y, k >= 2 ? 'tar.1' : 'stone.3');
    }
    return r;
  });
  return { id: 'harbor.gull', anchor: [6, 4], stages: [{ frames }] };
}

function smoke(): SpriteDef {
  const frames = [1, 2, 3, 4].map((rad) => {
    const r = mk(10, 10);
    r.ellipse(5, 5, rad + 0.4, rad + 0.4, 'stone.4');
    if (rad > 1) {
      for (let y = 0; y < 10; y++)
        for (let x = 0; x < 10; x++) if (r.colorAt(x, y) && y > 5 + rad / 3) r.set(x, y, 'stone.3');
    }
    return r;
  });
  return { id: 'harbor.smoke', anchor: [5, 5], stages: [{ frames }] };
}

// ── Kleinteile ──────────────────────────────────────────────────────────────
function lampPost(): SpriteDef {
  const r = mk(9, 32);
  r.cylinder(3, 7, 3, 23, 'tar.1');
  r.rect(2, 29, 5, 3, 'tar.0');
  r.rect(1, 1, 7, 6, 'brass.1');
  r.rect(2, 2, 5, 4, 'brass.3');
  for (let y = 2; y < 6; y++) for (let x = 2; x < 7; x++) r.glow(x, y, LAMP);
  r.hline(1, 0, 7, 'tar.1', N.up);
  r.outline();
  return {
    id: 'harbor.lampPost',
    anchor: [4, 32],
    shadow: true,
    stages: [{ frames: [r], points: { lamp: [4, 4] } }],
  };
}

function crates(): SpriteDef {
  const r = mk(26, 18);
  const crate = (x: number, y: number, s: number) => {
    r.rect(x, y, s, s, 'wood.3');
    r.hline(x, y, s, 'wood.4', N.up);
    for (let k = 1; k < s - 1; k++) {
      r.set(x + k, y + k, 'wood.2');
      r.set(x + s - 1 - k, y + k, 'wood.2');
    }
    r.vline(x, y, s, 'wood.2');
    r.vline(x + s - 1, y, s, 'wood.2');
  };
  crate(0, 8, 10);
  crate(11, 8, 10);
  crate(5, 0, 9);
  r.rect(21, 11, 5, 7, 'brick.2');
  r.hline(21, 11, 5, 'brick.3', N.up);
  r.hline(21, 14, 5, 'brick.1');
  r.outline();
  return { id: 'harbor.crates', anchor: [13, 18], shadow: true, stages: [{ frames: [r] }] };
}

function pile(): SpriteDef {
  const r = mk(12, 96);
  r.cylinder(1, 4, 10, 92, 'wood.2');
  for (let y = 4; y < 96; y += 7) r.hline(1, y + Math.floor(hash(y, 0, 3) * 3), 10, 'wood.1');
  r.rect(0, 0, 12, 4, 'wood.3', N.up);
  for (let y = 20; y < 30; y += 2) r.hline(1, y, 10, y % 4 === 0 ? 'sand.1' : 'sand.0');
  for (let y = 80; y < 96; y++)
    for (let x = 1; x < 11; x++) if (hash(x, y, 5) < (y - 80) / 14) r.set(x, y, 'teal.0');
  r.outline();
  return { id: 'harbor.pile', anchor: [6, 96], reflect: true, stages: [{ frames: [r] }] };
}

export function harborSprites(): SpriteDef[] {
  return [
    hills(),
    city(),
    cloud('harbor.cloudA', 70, 22, 1),
    cloud('harbor.cloudB', 46, 16, 2),
    cliff(),
    lighthouse(),
    quay(),
    warehouse(),
    pier(),
    fishingBoat(),
    containerShip(),
    worker(),
    gull(),
    smoke(),
    lampPost(),
    crates(),
    pile(),
    crane(),
    fishMarket(),
    customs(),
    shipyard(),
    spaceportPier(),
    cutter(),
    freighter(),
    scaffold(),
    sign(),
    spark(),
    stockPile(),
    harbormaster(),
  ];
}

export const harborPalette = palette;
