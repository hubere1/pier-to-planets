/**
 * Raster für Code-generierte Pixelgrafik (D-015, docs/06 §8).
 * Jeder Pinselstrich schreibt Albedo (Palettenfarbe), Normale (9 Werte) und optional
 * Emissive an dieselbe Stelle – so passen alle drei Maps immer exakt zusammen.
 */
import { NORMAL_COLORS, type Palette } from '../../../tools/lib/palette.ts';

/** Normal-Indizes in NORMAL_COLORS: flach + 8 Richtungen (+y = oben). */
export const N = {
  flat: 0,
  right: 1,
  upRight: 2,
  up: 3,
  upLeft: 4,
  left: 5,
  downLeft: 6,
  down: 7,
  downRight: 8,
} as const;
export type NormalIndex = (typeof N)[keyof typeof N];

/** Farbreferenz `rampe.index`, z. B. `wood.3`. */
export type ColorRef = string;
export type Point = readonly [number, number];

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface RasterImages {
  albedo: RgbaImage;
  normal: RgbaImage;
  emissive: RgbaImage;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Deterministischer Hash für Muster und Streuung (kein Math.random – reproduzierbare Grafik). */
export function hash(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class Raster {
  private readonly color: (ColorRef | undefined)[];
  private readonly normal: Int8Array;
  private readonly emit: (string | undefined)[];

  constructor(
    readonly w: number,
    readonly h: number,
    private readonly palette: Palette,
  ) {
    this.color = new Array<ColorRef | undefined>(w * h);
    this.normal = new Int8Array(w * h).fill(-1);
    this.emit = new Array<string | undefined>(w * h);
  }

  private hex(ref: ColorRef): string {
    const [ramp, idx] = ref.split('.');
    const hex = this.palette.ramps[ramp ?? '']?.[Number(idx)];
    if (!hex) throw new Error(`Farbe ${ref} nicht in Palette ${this.palette.era}`);
    return hex;
  }

  private inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x: number, y: number, ref: ColorRef, n: NormalIndex = N.flat, emissive?: string): void {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inside(x, y)) return;
    this.hex(ref);
    const i = y * this.w + x;
    this.color[i] = ref;
    this.normal[i] = n;
    this.emit[i] = emissive;
  }

  /** Nur Emissive setzen (Fenster leuchten, Albedo bleibt). */
  glow(x: number, y: number, emissive: string): void {
    if (!this.inside(x, y) || this.color[y * this.w + x] === undefined) return;
    this.emit[y * this.w + x] = emissive;
  }

  clear(x: number, y: number): void {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    this.color[i] = undefined;
    this.normal[i] = -1;
    this.emit[i] = undefined;
  }

  colorAt(x: number, y: number): ColorRef | undefined {
    return this.inside(x, y) ? this.color[y * this.w + x] : undefined;
  }

  normalAt(x: number, y: number): number {
    return this.inside(x, y) ? (this.normal[y * this.w + x] ?? -1) : -1;
  }

  filled(): number {
    return this.color.filter((c) => c !== undefined).length;
  }

  rect(x: number, y: number, w: number, h: number, ref: ColorRef, n: NormalIndex = N.flat): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, ref, n);
  }

  hline(x: number, y: number, w: number, ref: ColorRef, n: NormalIndex = N.flat): void {
    this.rect(x, y, w, 1, ref, n);
  }

  vline(x: number, y: number, h: number, ref: ColorRef, n: NormalIndex = N.flat): void {
    this.rect(x, y, 1, h, ref, n);
  }

  /** Rechteck mit deterministisch gestreuten Farben (Holzmaserung, Stein, Rost). */
  noiseRect(
    x: number,
    y: number,
    w: number,
    h: number,
    refs: readonly ColorRef[],
    seed: number,
    n: NormalIndex = N.flat,
  ): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const ref = refs[Math.floor(hash(xx, yy, seed) * refs.length)] ?? refs[0]!;
        this.set(xx, yy, ref, n);
      }
    }
  }

  /** Scanline-Füllung (Pixelmitten-Regel), Ecken im Uhrzeigersinn oder dagegen. */
  poly(points: readonly Point[], ref: ColorRef, n: NormalIndex = N.flat): void {
    const ys = points.map((p) => p[1]);
    const minY = Math.floor(Math.min(...ys));
    const maxY = Math.ceil(Math.max(...ys));
    for (let y = minY; y < maxY; y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i]!;
        const [x2, y2] = points[(i + 1) % points.length]!;
        if ((y1 <= cy && y2 > cy) || (y2 <= cy && y1 > cy)) {
          xs.push(x1 + ((cy - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const from = Math.ceil(xs[k]! - 0.5);
        const to = Math.ceil(xs[k + 1]! - 0.5);
        for (let x = from; x < to; x++) this.set(x, y, ref, n);
      }
    }
  }

  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    ref: ColorRef,
    n: NormalIndex = N.flat,
  ): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, ref, n);
      }
    }
  }

  /**
   * Senkrechter Zylinder (Turm, Pfahl, Schornstein): Normalen links/flach/rechts nach Spalte,
   * damit Licht ihn rund wirken lässt, obwohl die Albedo flach bleibt.
   */
  cylinder(x: number, y: number, w: number, h: number, ref: ColorRef): void {
    for (let xx = x; xx < x + w; xx++) {
      const t = (xx - x + 0.5) / w;
      const n = t < 0.3 ? N.left : t > 0.7 ? N.right : N.flat;
      this.rect(xx, y, 1, h, ref, n);
    }
  }

  /** Quader in Seitenansicht mit Draufsicht-Streifen: Front flach, Deckel nach oben. */
  box(
    x: number,
    y: number,
    w: number,
    h: number,
    front: ColorRef,
    top?: { ref: ColorRef; h: number },
  ): void {
    this.rect(x, y, w, h, front, N.flat);
    if (top) this.rect(x, y - top.h, w, top.h, top.ref, N.up);
  }

  /** Kontur: Randpixel bekommen die dunklere Farbe ihrer Rampe (docs/06 §3). */
  outline(): void {
    const edge: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.colorAt(x, y) === undefined) continue;
        const open =
          this.colorAt(x - 1, y) === undefined ||
          this.colorAt(x + 1, y) === undefined ||
          this.colorAt(x, y - 1) === undefined ||
          this.colorAt(x, y + 1) === undefined;
        if (open) edge.push(y * this.w + x);
      }
    }
    for (const i of edge) this.color[i] = this.darker(this.color[i]!);
  }

  darker(ref: ColorRef): ColorRef {
    const [ramp, idx] = ref.split('.');
    const k = Number(idx);
    if (k > 0) return `${ramp}.${k - 1}`;
    return 'tar.0';
  }

  lighter(ref: ColorRef): ColorRef {
    const [ramp, idx] = ref.split('.');
    const k = Number(idx);
    const len = this.palette.ramps[ramp ?? '']?.length ?? 0;
    return k + 1 < len ? `${ramp}.${k + 1}` : ref;
  }

  /** Entfernt Pixel ohne gefüllten Nachbarn (docs/06 §3 „keine Waisen-Pixel“). */
  removeOrphans(): void {
    const orphans: [number, number][] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.colorAt(x, y) === undefined) continue;
        const lonely =
          this.colorAt(x - 1, y) === undefined &&
          this.colorAt(x + 1, y) === undefined &&
          this.colorAt(x, y - 1) === undefined &&
          this.colorAt(x, y + 1) === undefined;
        if (lonely) orphans.push([x, y]);
      }
    }
    for (const [x, y] of orphans) this.clear(x, y);
  }

  /** Kopie, horizontal gespiegelt (Fahrzeuge in Gegenrichtung). Normalen links/rechts getauscht. */
  mirrored(): Raster {
    const swap: Record<number, NormalIndex> = {
      [N.right]: N.left,
      [N.left]: N.right,
      [N.upRight]: N.upLeft,
      [N.upLeft]: N.upRight,
      [N.downRight]: N.downLeft,
      [N.downLeft]: N.downRight,
    };
    const out = new Raster(this.w, this.h, this.palette);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        const ref = this.color[i];
        if (ref === undefined) continue;
        const n = this.normal[i] as NormalIndex;
        out.set(this.w - 1 - x, y, ref, swap[n] ?? n, this.emit[i]);
      }
    }
    return out;
  }

  /** Kopiert ein anderes Raster an (dx, dy); leere Pixel bleiben durchsichtig. */
  stamp(src: Raster, dx: number, dy: number): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const ref = src.colorAt(x, y);
        if (ref === undefined) continue;
        const i = y * src.w + x;
        this.set(x + dx, y + dy, ref, src.normalAt(x, y) as NormalIndex, src.emit[i]);
      }
    }
  }

  toImages(): RasterImages {
    const size = this.w * this.h * 4;
    const albedo = new Uint8Array(size);
    const normal = new Uint8Array(size);
    const emissive = new Uint8Array(size);
    for (let i = 0; i < this.w * this.h; i++) {
      const ref = this.color[i];
      if (ref === undefined) continue;
      const [r, g, b] = hexToRgb(this.hex(ref));
      albedo.set([r, g, b, 255], i * 4);
      const nc = NORMAL_COLORS[this.normal[i]!]!;
      normal.set([nc[0], nc[1], nc[2], 255], i * 4);
      // Emissive deckt wie die Albedo (schwarz = leuchtet nicht), damit Vordergrund
      // Lichter dahinter verdeckt.
      const e = this.emit[i];
      emissive.set(e ? [...hexToRgb(e), 255] : [0, 0, 0, 255], i * 4);
    }
    const img = (data: Uint8Array) => ({ width: this.w, height: this.h, data });
    return { albedo: img(albedo), normal: img(normal), emissive: img(emissive) };
  }
}
