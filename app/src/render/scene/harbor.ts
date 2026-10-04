/**
 * Hafen-Szene, Stilprobe M1 (docs/07 M1, docs/06 §6).
 * Komposition im mittleren 640er-Band; darüber Himmel, darunter Wasser (docs/05 Layout).
 *
 * Hinweis: In M1 bewegen sich Boote und Arbeiter nach einer festen Demo-Choreografie.
 * Ab M3 liest die Szene die Positionen aus `sceneView()` der Simulation (AGENTS Regel 6).
 */
import { Container } from 'pixi.js';
import type { EraAssets, MapKind, Point } from '../assets.ts';
import type { DayState } from '../daynight.ts';
import type { PassTarget } from '../pipeline.ts';
import { createLayer, SceneSprite, type Layer } from './sceneSprite.ts';

export const CORE_H = 640;
/** Horizont (Meer beginnt) im Kern-Band. */
export const HORIZON = 268;

export interface PointLight {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: readonly [number, number, number];
}

const WARM = [1.0, 0.72, 0.38] as const;
const BEAM = [1.0, 0.9, 0.6] as const;
const CLEAR = [0.9, 0.9, 1.0] as const;

interface Walker {
  s: SceneSprite;
  x: number;
  dir: 1 | -1;
  speed: number;
  min: number;
  max: number;
  pause: number;
  phase: number;
}

interface Puff {
  s: SceneSprite;
  x: number;
  y: number;
  age: number;
  alive: boolean;
}

export type LayerName = 'far' | 'mid' | 'game' | 'front';

export class HarborScene implements PassTarget {
  readonly world = new Container();
  readonly shadows = new Container();
  readonly layers: Record<LayerName, Layer>;
  private readonly all: SceneSprite[] = [];
  private offsetY = 0;
  private time = 0;

  private readonly clouds: { s: SceneSprite; speed: number }[] = [];
  private readonly warehouse: SceneSprite;
  private readonly lighthouse: SceneSprite;
  private readonly lampPost: SceneSprite;
  private readonly boat: SceneSprite;
  private readonly ship: SceneSprite;
  private readonly walkers: Walker[] = [];
  private readonly gulls: {
    s: SceneSprite;
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    speed: number;
    phase: number;
  }[] = [];
  private readonly sittingGull: SceneSprite;
  private readonly puffs: Puff[] = [];
  private puffTimer = 0;
  private shipPuffTimer = 0;

  constructor(private readonly assets: EraAssets) {
    this.layers = {
      far: createLayer(),
      mid: createLayer(),
      game: createLayer(),
      front: createLayer(),
    };
    for (const l of Object.values(this.layers)) {
      this.world.addChild(l.root);
      this.shadows.addChild(l.shadows);
    }
    const add = (
      id: string,
      layer: LayerName,
      x: number,
      y: number,
      opts?: { reflect?: boolean; shadow?: boolean },
    ) => {
      const s = new SceneSprite(assets.sprite(id), this.layers[layer], opts).place(x, y);
      this.all.push(s);
      return s;
    };

    // Ebene 2 – Ferne
    add('harbor.hills', 'far', 0, HORIZON);
    add('harbor.city', 'far', 6, HORIZON);
    this.clouds.push({ s: add('harbor.cloudA', 'far', 40, 96), speed: 1.6 });
    this.clouds.push({ s: add('harbor.cloudB', 'far', 230, 150), speed: 2.4 });
    this.clouds.push({ s: add('harbor.cloudB', 'far', 150, 52), speed: 1.1 });

    // Ebene 3 – Mittelgrund: Containerschiff hinter der Klippe, Leuchtturm auf der Klippe
    this.ship = add('harbor.containerShip', 'mid', -80, 318);
    add('harbor.cliff', 'mid', 218, 330);
    this.lighthouse = add('harbor.lighthouse', 'mid', 308, 215);

    // Ebene 4 – Spiel: Kai, Lagerhalle, Steg, Boot, Arbeiter
    add('harbor.quay', 'game', -4, 456);
    this.warehouse = add('harbor.warehouse', 'game', 80, 414);
    add('harbor.crates', 'game', 128, 414);
    this.lampPost = add('harbor.lampPost', 'game', 156, 413);
    add('harbor.pier', 'game', 196, 452);
    this.boat = add('harbor.fishingBoat', 'game', 300, 472);
    for (let i = 0; i < 4; i++) {
      const s = add('harbor.worker', 'game', 0, 413);
      this.walkers.push({
        s,
        x: 100 + i * 55,
        dir: i % 2 ? -1 : 1,
        speed: 10 + i * 2,
        min: 96,
        max: 332,
        pause: 0,
        phase: i * 0.37,
      });
    }

    // Ebene 6 – Vordergrund: Pfähle, sitzende Möwe; fliegende Möwen
    add('harbor.pile', 'front', 16, 610);
    add('harbor.pile', 'front', 346, 650);
    this.sittingGull = add('harbor.gull', 'front', 17, 512);
    for (let i = 0; i < 3; i++) {
      this.gulls.push({
        s: add('harbor.gull', 'front', 0, 0),
        cx: 120 + i * 70,
        cy: 170 + i * 30,
        rx: 70 + i * 25,
        ry: 18 + i * 6,
        speed: 0.35 + i * 0.08,
        phase: i * 2.1,
      });
    }
    for (let i = 0; i < 14; i++) {
      const s = add('harbor.smoke', 'game', 0, 0, { reflect: false, shadow: false });
      s.visible = false;
      this.puffs.push({ s, x: 0, y: 0, age: 0, alive: false });
    }
  }

  /** Höhe der Bühne in Spiel-Pixeln; das Kern-Band wird vertikal zentriert. */
  setHeight(gameH: number): void {
    this.offsetY = Math.round((gameH - CORE_H) / 2);
    for (const l of Object.values(this.layers)) {
      l.root.y = this.offsetY;
      l.shadows.y = this.offsetY;
    }
  }

  get horizonY(): number {
    return this.offsetY + HORIZON;
  }

  setWarehouseStage(stage: number): void {
    this.warehouse.setStage(stage);
  }

  /** Qualitätsstufe „Sparsam“: nur 2 Parallax-Ebenen (docs/04 § Qualitätsstufen). */
  setLayerVisible(name: LayerName, visible: boolean): void {
    this.layers[name].root.visible = visible;
    this.layers[name].shadows.visible = visible;
  }

  update(dt: number, day: DayState): void {
    this.time += dt;
    const t = this.time;

    for (const c of this.clouds) {
      c.s.x += c.speed * dt;
      if (c.s.x > 380) c.s.x = -80;
    }

    // Containerschiff zieht langsam vorbei (Wiederholung alle ~150 s)
    this.ship.x = -170 + ((t * 4 + 90) % 600);

    // Fischerboot: anlegen, liegen, ablegen (Zyklus 40 s)
    const cyc = t % 40;
    let bx: number;
    if (cyc < 10) bx = 420 - 120 * easeOut(cyc / 10);
    else if (cyc < 28) bx = 300;
    else bx = 300 + 140 * easeIn((cyc - 28) / 12);
    this.boat.x = bx;
    this.boat.y = 472 + (Math.sin(t * 1.3) > 0.55 ? -1 : 0);

    for (const w of this.walkers) {
      if (w.pause > 0) {
        w.pause -= dt;
        w.s.setFrame(0);
      } else {
        w.x += w.dir * w.speed * dt;
        if (w.x > w.max || w.x < w.min) {
          w.dir = w.x > w.max ? -1 : 1;
          w.x = Math.min(w.max, Math.max(w.min, w.x));
          w.pause = 1.5 + w.phase * 2;
        }
        w.s.setFrame(Math.floor((t + w.phase) * 8));
      }
      w.s.place(w.x, 413).setFlipped(w.dir < 0);
    }

    for (const g of this.gulls) {
      const a = t * g.speed + g.phase;
      const nx = g.cx + Math.cos(a) * g.rx;
      g.s.setFlipped(-Math.sin(a) < 0);
      g.s.place(nx, g.cy + Math.sin(a * 2) * g.ry);
      g.s.setFrame([0, 1, 2, 1][Math.floor(t * 6 + g.phase * 3) % 4]!);
    }
    this.sittingGull.setFrame(1);

    this.updateSmoke(dt);

    const side = day.keyDir[0];
    const elev = day.keyDir[1];
    const strength = 1 - day.night * 0.7;
    for (const s of this.all) s.castShadow(side, elev, strength);
  }

  private emit(at: Point | undefined): void {
    if (!at) return;
    const puff = this.puffs.find((p) => !p.alive);
    if (!puff) return;
    puff.alive = true;
    puff.age = 0;
    puff.x = at[0];
    puff.y = at[1];
  }

  private updateSmoke(dt: number): void {
    this.puffTimer += dt;
    this.shipPuffTimer += dt;
    if (this.puffTimer > 0.8) {
      this.puffTimer = 0;
      this.emit(this.warehouse.point('chimney'));
    }
    if (this.shipPuffTimer > 0.6) {
      this.shipPuffTimer = 0;
      const f = this.ship.point('funnel');
      if (f) this.emit([f[0], f[1] - (this.ship.y - 318)]);
    }
    for (const p of this.puffs) {
      if (!p.alive) {
        p.s.visible = false;
        continue;
      }
      p.age += dt;
      p.y -= 5 * dt;
      p.x += (2 + p.age * 1.5) * dt;
      p.s.visible = p.age < 3.4;
      if (!p.s.visible) p.alive = false;
      p.s.place(p.x, p.y).setFrame(Math.min(3, Math.floor(p.age / 0.75)));
    }
  }

  /** Punktlichter in Bühnenkoordinaten; Stärke folgt der Nacht. */
  lights(day: DayState): { lights: PointLight[]; beam: [number, number, number, number] } {
    const n = day.night;
    const out: PointLight[] = [];
    const push = (
      p: Point | undefined,
      radius: number,
      intensity: number,
      color: readonly [number, number, number],
    ) => {
      if (p && intensity > 0.01)
        out.push({ x: p[0], y: p[1] + this.offsetY, radius, intensity, color });
    };
    push(this.lighthouse.point('lamp'), 70, 1.3 * n, BEAM);
    push(this.lampPost.point('lamp'), 64, 1.6 * n, WARM);
    push(this.warehouse.point('window'), 26, 0.6 * n, WARM);
    push(this.warehouse.point('lampL'), 34, 0.9 * n, WARM);
    push(this.warehouse.point('lampR'), 34, 0.9 * n, WARM);
    push(this.boat.point('mast'), 22, 0.8 * n, CLEAR);
    push(this.ship.point('bowLight'), 18, 0.7 * n, CLEAR);
    const lamp = this.lighthouse.point('lamp');
    const beam: [number, number, number, number] = lamp
      ? [lamp[0], lamp[1] + this.offsetY, Math.cos(this.time * 0.8) * 190, n]
      : [0, 0, 0, 0];
    return { lights: out, beam };
  }

  applyPass(pass: MapKind): void {
    for (const s of this.all) s.sync(pass);
  }
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeIn = (t: number) => t * t;
