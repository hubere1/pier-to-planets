/**
 * Ein Objekt der Szene: Haupt-Sprite + optional Spiegelbild (Wasser) + Schatten-Silhouette.
 * Positionen intern als Kommazahl, gezeichnet immer auf ganzen Spiel-Pixeln (docs/06 §2).
 */
import { Container, Sprite } from 'pixi.js';
import type { MapKind, Point, SpriteAsset } from '../assets.ts';

export interface Layer {
  root: Container;
  reflections: Container;
  objects: Container;
  shadows: Container;
}

export function createLayer(): Layer {
  const root = new Container();
  const reflections = new Container();
  const objects = new Container();
  root.addChild(reflections, objects);
  return { root, reflections, objects, shadows: new Container() };
}

export class SceneSprite {
  readonly main = new Sprite();
  readonly reflection?: Sprite;
  readonly shadow?: Sprite;
  x = 0;
  y = 0;
  private stageIdx = 0;
  private frameIdx = 0;
  private flipped = false;
  visible = true;
  /** Silhouette (gesperrt/Bauplatz, docs/05 § Szene): 0 = normal, sonst Deckkraft der Silhouette. */
  silhouette = 0;
  /** Senkrechter Versatz in Spiel-Pixeln (Hüpfen beim Kauf). */
  dy = 0;

  constructor(
    readonly asset: SpriteAsset,
    layer: Layer,
    opts: { reflect?: boolean; shadow?: boolean } = {},
  ) {
    layer.objects.addChild(this.main);
    if (opts.reflect ?? asset.reflect) {
      this.reflection = new Sprite();
      layer.reflections.addChild(this.reflection);
    }
    if (opts.shadow ?? asset.shadow) {
      this.shadow = new Sprite();
      this.shadow.tint = 0x000000;
      layer.shadows.addChild(this.shadow);
    }
    this.sync('albedo');
  }

  get frameCount(): number {
    return this.asset.stages[this.stageIdx]!.frames.length;
  }

  get stageCount(): number {
    return this.asset.stages.length;
  }

  get stage(): number {
    return this.stageIdx;
  }

  /** Umriss des aktuellen Bilds in Ebenen-Koordinaten (Tippen, Coach-Marks). */
  bounds(): { x: number; y: number; w: number; h: number } {
    const frame = this.asset.stages[this.stageIdx]!.frames[this.frameIdx]!.albedo.frame;
    const [ax, ay] = this.asset.anchor;
    const left = this.flipped ? Math.round(this.x) - (frame.width - ax) : Math.round(this.x) - ax;
    return { x: left, y: Math.round(this.y) - ay + this.dy, w: frame.width, h: frame.height };
  }

  /** Ankerpunkt eines benannten Punkts (Schornstein, Lampe) in Szenenkoordinaten. */
  point(name: string): Point | undefined {
    const p = this.asset.stages[this.stageIdx]!.points[name];
    if (!p) return undefined;
    const [ax, ay] = this.asset.anchor;
    const dx = p[0] - ax;
    return [Math.round(this.x) + (this.flipped ? -dx : dx), Math.round(this.y) + p[1] - ay];
  }

  place(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  setStage(i: number): this {
    this.stageIdx = Math.max(0, Math.min(this.asset.stages.length - 1, i));
    this.frameIdx = Math.min(this.frameIdx, this.frameCount - 1);
    return this;
  }

  setFrame(i: number): this {
    this.frameIdx = ((i % this.frameCount) + this.frameCount) % this.frameCount;
    return this;
  }

  setFlipped(f: boolean): this {
    this.flipped = f;
    return this;
  }

  /** Schatten nach Sonnenstand: Seite −1..1 (Licht von links/rechts), Höhe 0..1. */
  castShadow(side: number, elevation: number, strength: number): void {
    if (!this.shadow) return;
    this.shadow.visible = this.visible && strength > 0.05;
    const low = 1 - Math.min(1, Math.max(0, elevation));
    this.shadow.scale.y = -(0.14 + 0.3 * low);
    this.shadow.skew.x = -side * (0.6 + 1.6 * low);
  }

  /** Setzt Textur und Lage aller Teil-Sprites für den Render-Durchgang. */
  sync(pass: MapKind): void {
    const frame = this.asset.stages[this.stageIdx]!.frames[this.frameIdx]!;
    const tex = frame[pass];
    const [ax, ay] = this.asset.anchor;
    const px = Math.round(this.x);
    const py = Math.round(this.y) + this.dy;
    const sil = this.silhouette;
    const setup = (s: Sprite, flipY: boolean) => {
      s.texture = tex;
      s.anchor.set(ax / tex.frame.width, ay / tex.frame.height);
      s.position.set(px, flipY ? Math.round(this.y) : py);
      s.scale.x = this.flipped ? -1 : 1;
      if (flipY) s.scale.y = -1;
      s.visible = this.visible;
      // Silhouette: dunkel und halb durchsichtig, ohne Lichter (Emissive schwarz).
      s.tint =
        sil > 0
          ? pass === 'emissive'
            ? 0x000000
            : pass === 'albedo'
              ? 0x252a36
              : 0xffffff
          : 0xffffff;
      s.alpha = sil > 0 && pass !== 'normal' ? sil : 1;
    };
    this.main.zIndex = Math.round(this.y);
    setup(this.main, false);
    if (this.reflection) {
      setup(this.reflection, true);
      // Markierung im Normalen-Puffer: Alpha 0,5 = Spiegelbild (composite.ts).
      this.reflection.alpha = pass === 'normal' ? 0.5 : sil > 0 ? sil : 1;
    }
    if (this.shadow && pass === 'albedo') {
      this.shadow.visible = this.shadow.visible && sil === 0;
      this.shadow.texture = frame.albedo;
      this.shadow.anchor.set(ax / tex.frame.width, ay / tex.frame.height);
      this.shadow.position.set(px, py);
      this.shadow.scale.x = this.flipped ? -1 : 1;
    }
  }
}
