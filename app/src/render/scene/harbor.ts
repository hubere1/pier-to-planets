/**
 * Hafen-Szene (docs/06 §6, docs/05 § Szene). Zeigt den Sim-Zustand aus `sceneView()`:
 * Gebäude mit Ausbaustufen, Bauplätze und Silhouetten, Fahrzeuge an Liegeplätzen und auf Reede,
 * Arbeiter nach Ausbau, Lagerstapel. Entscheidet nichts (AGENTS Regel 6).
 * Komposition im mittleren 640er-Band; darüber Himmel, darunter Wasser.
 */
import { Container } from 'pixi.js';
import type { SceneView } from '@ptp/sim';
import type { EraAssets, MapKind, Point } from '../assets.ts';
import { layerOffset, PARALLAX } from '../camera.ts';
import type { DayState } from '../daynight.ts';
import type { PassTarget } from '../pipeline.ts';
import { BUILDINGS, WALK, type BuildingSpot, type LayerName } from './harborLayout.ts';
import { createLayer, SceneSprite, type Layer } from './sceneSprite.ts';
import { VehicleTracker, type VehicleVisual } from './vehicleTracker.ts';

export type { LayerName } from './harborLayout.ts';

export const CORE_H = 640;
/** Horizont (Meer beginnt) im Kern-Band. */
export const HORIZON = 268;
/** Wichtiger Inhalt im Kern-Band: Leuchtturm-Spitze bis hintere Liegeplätze. */
const CONTENT_TOP = 200;
const CONTENT_BOTTOM = 556;

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
const WELD = [0.6, 0.85, 1.0] as const;

/** Sichtbare Gebäude-Stufen (Sprite) – höher als 200 zeigt die letzte Stufe. */
const MAX_STAGE = 5;
/** Meilenstein-Umbau: Gerüst so lange, dann neuer Zustand mit Funken (docs/05 § Feedback). */
const SCAFFOLD_S = 0.8;
const HOP_S = 0.18;
const MAX_WORKERS = 10;

const VEHICLE_SPRITES: Readonly<Record<string, string>> = {
  fishingBoat: 'harbor.fishingBoat',
  cutter: 'harbor.cutter',
  freighter: 'harbor.freighter',
  containerShip: 'harbor.containerShip',
};

interface Walker {
  s: SceneSprite;
  x: number;
  dir: 1 | -1;
  speed: number;
  pause: number;
  phase: number;
}

interface Puff {
  s: SceneSprite;
  x: number;
  y: number;
  age: number;
  alive: boolean;
  /** Staub (Kauf) steigt nicht, sondern breitet sich aus. */
  dust: boolean;
}

interface Spark {
  s: SceneSprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

/** Zustand eines Gebäudes in der Szene, wie zuletzt angezeigt. */
interface BuildingVisual {
  id: string;
  spot: BuildingSpot;
  sprite: SceneSprite;
  sign: SceneSprite;
  scaffold: SceneSprite;
  level: number;
  stage: number;
  unlocked: boolean;
  /** Restzeit des Gerüsts; danach wird `pendingStage` sichtbar. */
  scaffoldT: number;
  pendingStage: number;
  hop: number;
}

export type SceneHit = { kind: 'vehicle'; id: number } | { kind: 'building'; id: string };

export class HarborScene implements PassTarget {
  readonly world = new Container();
  readonly shadows = new Container();
  readonly layers: Record<LayerName, Layer>;
  /** Fahrzeuge: eigene Unterebene im Spielbereich, nach Wassertiefe sortiert. */
  private readonly boats: Layer;
  private readonly all: SceneSprite[] = [];
  private offsetY = 0;
  private readonly offsetX: Record<LayerName, number> = { far: 0, mid: 0, game: 0, front: 0 };
  private time = 0;
  /** „Animationen reduzieren“ (NFR-Q03): kein Hüpfen, keine Funken. */
  reducedMotion = false;

  private readonly clouds: { s: SceneSprite; speed: number }[] = [];
  private readonly lampPost: SceneSprite;
  private readonly decorShip: SceneSprite;
  private readonly stock: SceneSprite;
  private readonly buildings = new Map<string, BuildingVisual>();
  private readonly vehicleSprites = new Map<number, SceneSprite>();
  private vehicles: VehicleVisual[] = [];
  private readonly tracker = new VehicleTracker();
  private readonly walkers: Walker[] = [];
  private workerCount = 2;
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
  private readonly sparks: Spark[] = [];
  private puffTimer = 0;
  private shipPuffTimer = 0;
  private initialized = false;

  constructor(private readonly assets: EraAssets) {
    this.layers = {
      far: createLayer(),
      mid: createLayer(),
      game: createLayer(),
      front: createLayer(),
    };
    this.boats = createLayer();
    this.boats.objects.sortableChildren = true;
    for (const name of ['far', 'mid', 'game'] as const) {
      this.world.addChild(this.layers[name].root);
      this.shadows.addChild(this.layers[name].shadows);
    }
    this.world.addChild(this.boats.root);
    this.shadows.addChild(this.boats.shadows);
    this.world.addChild(this.layers.front.root);
    this.shadows.addChild(this.layers.front.shadows);

    const add = (
      id: string,
      layer: LayerName | Layer,
      x: number,
      y: number,
      opts?: { reflect?: boolean; shadow?: boolean },
    ) => {
      const l = typeof layer === 'string' ? this.layers[layer] : layer;
      const s = new SceneSprite(assets.sprite(id), l, opts).place(x, y);
      this.all.push(s);
      return s;
    };

    // Ebene 2 – Ferne
    add('harbor.hills', 'far', -40, HORIZON);
    add('harbor.city', 'far', 6, HORIZON);
    this.clouds.push({ s: add('harbor.cloudA', 'far', 40, 96), speed: 1.6 });
    this.clouds.push({ s: add('harbor.cloudB', 'far', 230, 150), speed: 2.4 });
    this.clouds.push({ s: add('harbor.cloudB', 'far', 150, 52), speed: 1.1 });

    // Ebene 3 – Mittelgrund: fernes Containerschiff (Kulisse), Klippe, Leuchtturm
    this.decorShip = add('harbor.containerShip', 'mid', -80, 318);
    add('harbor.cliff', 'mid', 218, 330);

    // Ebene 4 – Spiel: Kai, dann Gebäude von hinten nach vorne
    add('harbor.quay', 'game', -170, 456);
    const order = [
      'lighthouse',
      'shipyard',
      'fishMarket',
      'warehouse',
      'customs',
      'pier',
      'crane',
      'spaceportPier',
    ];
    for (const id of order) {
      const spot = BUILDINGS[id]!;
      const sprite = add(spot.sprite, spot.layer, spot.x, spot.y);
      const scaffold = add('harbor.scaffold', spot.layer, 0, 0, { reflect: false, shadow: false });
      scaffold.setStage(spot.scaffold);
      scaffold.visible = false;
      const sign = add('harbor.sign', spot.layer, spot.x + spot.signDx, spot.y, {
        reflect: false,
      });
      sign.visible = false;
      this.buildings.set(id, {
        id,
        spot,
        sprite,
        sign,
        scaffold,
        level: 0,
        stage: 0,
        unlocked: false,
        scaffoldT: 0,
        pendingStage: 0,
        hop: 0,
      });
    }
    this.stock = add('harbor.stock', 'game', 152, 414);
    this.lampPost = add('harbor.lampPost', 'game', 170, 413);
    for (let i = 0; i < MAX_WORKERS; i++) {
      const s = add('harbor.worker', 'game', 0, WALK.y);
      this.walkers.push({
        s,
        x: WALK.min + 30 + ((i * 97) % (WALK.max - WALK.min - 60)),
        dir: i % 2 ? -1 : 1,
        speed: 10 + (i % 4) * 2,
        pause: 0,
        phase: i * 0.37,
      });
    }

    // Ebene 6 – Vordergrund: Pfähle, sitzende Möwe; fliegende Möwen
    for (const px of [-100, 16, 346, 470]) add('harbor.pile', 'front', px, px > 300 ? 650 : 610);
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
    for (let i = 0; i < 18; i++) {
      const s = add('harbor.smoke', 'game', 0, 0, { reflect: false, shadow: false });
      s.visible = false;
      this.puffs.push({ s, x: 0, y: 0, age: 0, alive: false, dust: false });
    }
  }

  /**
   * Höhe der Bühne in Spiel-Pixeln. Das Kern-Band wird zentriert, rückt aber nach oben,
   * damit Liegeplätze nicht unter Panel und Navigation liegen (oben ist nur Himmel).
   */
  setHeight(gameH: number, bottomInset = 0): void {
    const centered = Math.round((gameH - CORE_H) / 2);
    const fitBottom = Math.round(gameH - bottomInset - CONTENT_BOTTOM);
    // Nie so weit hoch, dass die Leuchtturm-Spitze aus dem Bild rutscht.
    this.offsetY = Math.max(-CONTENT_TOP + 40, Math.min(centered, fitBottom));
    for (const l of [...Object.values(this.layers), this.boats]) {
      l.root.y = this.offsetY;
      l.shadows.y = this.offsetY;
    }
  }

  /** Kamera-Schwenk in Spiel-Pixeln; jede Ebene verschiebt sich um ihren Parallax-Faktor. */
  setCamera(camX: number): void {
    for (const name of Object.keys(this.layers) as LayerName[]) {
      const dx = layerOffset(camX, PARALLAX[name]);
      this.offsetX[name] = dx;
      this.layers[name].root.x = dx;
      this.layers[name].shadows.x = dx;
    }
    this.boats.root.x = this.offsetX.game;
    this.boats.shadows.x = this.offsetX.game;
  }

  /** Kamera-Position, bei der das Gebäude mittig steht (docs/05: gewähltes Gebäude sichtbar). */
  cameraFor(id: string): number {
    const spot = BUILDINGS[id];
    if (!spot) return 0;
    return (spot.x - 180) / PARALLAX[spot.layer];
  }

  get horizonY(): number {
    return this.offsetY + HORIZON;
  }

  /** Qualitätsstufe „Sparsam“: nur 2 Parallax-Ebenen (docs/04 § Qualitätsstufen). */
  setLayerVisible(name: LayerName, visible: boolean): void {
    this.layers[name].root.visible = visible;
    this.layers[name].shadows.visible = visible;
  }

  /**
   * Übernimmt den Sim-Zustand. `prev`/`alpha` interpolieren die Fahrzeuge zwischen zwei
   * Sim-Schritten (docs/04 § Takt).
   */
  sync(prev: SceneView, view: SceneView, alpha: number, dt: number): void {
    for (const [id, b] of this.buildings) {
      const v =
        id === 'spaceportPier'
          ? { level: view.goal.built ? 1 : 0, stage: 0, unlocked: view.goal.unlocked }
          : view.buildings[id];
      if (v) this.syncBuilding(b, v.level, Math.min(MAX_STAGE, v.stage), v.unlocked);
    }
    this.initialized = true;

    this.vehicles = this.tracker.update(prev.vehicles, view.vehicles, alpha, dt);
    const seen = new Set<number>();
    for (const v of this.vehicles) {
      seen.add(v.id);
      let s = this.vehicleSprites.get(v.id);
      if (!s) {
        s = new SceneSprite(
          this.assets.sprite(VEHICLE_SPRITES[v.tier] ?? 'harbor.fishingBoat'),
          this.boats,
        );
        this.all.push(s);
        this.vehicleSprites.set(v.id, s);
      }
      const bob = v.phase === 'docked' && Math.sin(this.time * 1.3 + v.id) > 0.55 ? -1 : 0;
      s.place(v.x, v.y + bob).setFlipped(v.facingLeft);
    }
    for (const [id, s] of this.vehicleSprites) {
      if (seen.has(id)) continue;
      this.remove(s);
      this.vehicleSprites.delete(id);
    }

    this.stock.setStage(Math.min(4, Math.floor(view.stockFill * 5)));
    this.stock.visible = view.stock > 0.5;

    // Arbeiter: mehr Leute mit jedem Ausbau von Steg, Kran und Lagerhalle (docs/06 §6).
    const st = (id: string) => view.buildings[id]?.stage ?? 0;
    const built = (id: string) => ((view.buildings[id]?.level ?? 0) > 0 ? 1 : 0);
    this.workerCount = Math.min(
      MAX_WORKERS,
      2 + built('crane') + built('fishMarket') + st('crane') + st('warehouse') + st('pier'),
    );
  }

  private remove(s: SceneSprite): void {
    s.main.destroy();
    s.reflection?.destroy();
    s.shadow?.destroy();
    const i = this.all.indexOf(s);
    if (i >= 0) this.all.splice(i, 1);
  }

  private syncBuilding(b: BuildingVisual, level: number, stage: number, unlocked: boolean): void {
    const animate = this.initialized && !this.reducedMotion;
    if (this.initialized && level > b.level && b.level > 0) {
      b.hop = HOP_S;
      const box = b.sprite.bounds();
      this.emit([box.x + box.w / 2, b.spot.y - 2], true);
    }
    const target = level > 0 ? stage + b.spot.stageOffset : 0;
    const shown = b.level > 0 ? b.stage + b.spot.stageOffset : 0;
    if (target !== shown && b.scaffoldT <= 0 && b.pendingStage !== target) {
      if (animate && b.level > 0) {
        b.scaffoldT = SCAFFOLD_S;
        b.pendingStage = target;
      } else if (animate && level > 0) {
        // Erstbau: Gerüst, dann Gebäude
        b.scaffoldT = SCAFFOLD_S;
        b.pendingStage = target;
      } else {
        b.sprite.setStage(target);
        b.pendingStage = target;
      }
    }
    b.level = level;
    b.stage = stage;
    b.unlocked = unlocked;
    const lighthouse = b.spot.stageOffset > 0;
    // Gesperrt: Silhouette + Schloss; frei, aber nicht gebaut: Bauplatz (docs/05 § Szene).
    b.sprite.silhouette = level > 0 || lighthouse ? 0 : unlocked ? 0.55 : 0.7;
    b.sign.visible = level === 0 && b.id !== 'spaceportPier';
    b.sign.setStage(unlocked ? 0 : 1);
  }

  /** Was liegt unter dem Finger? Koordinaten in Bühnen-Pixeln. */
  hitTest(x: number, y: number): SceneHit | null {
    const gx = x - this.offsetX.game;
    const gy = y - this.offsetY;
    const inside = (r: { x: number; y: number; w: number; h: number }, pad = 0) =>
      gx >= r.x - pad && gx < r.x + r.w + pad && gy >= r.y - pad && gy < r.y + r.h + pad;
    // Vorne liegende Fahrzeuge zuerst (größte Wassertiefe).
    const boats = [...this.vehicles].sort((a, b) => b.y - a.y);
    for (const v of boats) {
      const s = this.vehicleSprites.get(v.id);
      if (s && inside(s.bounds(), 4)) return { kind: 'vehicle', id: v.id };
    }
    for (const [id, b] of [...this.buildings].reverse()) {
      const lx = x - this.offsetX[b.spot.layer];
      const r = b.sprite.bounds();
      if (lx >= r.x && lx < r.x + r.w && gy >= r.y && gy < r.y + r.h)
        return { kind: 'building', id };
    }
    return null;
  }

  /** Umriss in Bühnen-Pixeln (für Coach-Marks und fliegende Münzen). */
  rectOf(target: SceneHit): { x: number; y: number; w: number; h: number } | null {
    if (target.kind === 'vehicle') {
      const s = this.vehicleSprites.get(target.id);
      if (!s) return null;
      const r = s.bounds();
      return { ...r, x: r.x + this.offsetX.game, y: r.y + this.offsetY };
    }
    const b = this.buildings.get(target.id);
    if (!b) return null;
    const r = b.sprite.bounds();
    return { ...r, x: r.x + this.offsetX[b.spot.layer], y: r.y + this.offsetY };
  }

  /** Erstes liegendes Fahrzeug (Tutorial „Tippe auf das Boot“). */
  firstDocked(): number | null {
    return this.vehicles.find((v) => v.phase === 'docked')?.id ?? null;
  }

  update(dt: number, day: DayState): void {
    this.time += dt;
    const t = this.time;

    for (const c of this.clouds) {
      c.s.x += c.speed * dt;
      if (c.s.x > 380) c.s.x = -80;
    }

    // Fernes Containerschiff zieht als Kulisse vorbei (Wiederholung alle ~150 s)
    this.decorShip.x = -170 + ((t * 4 + 90) % 600);

    this.updateBuildings(dt);
    this.updateWorkers(dt, t);

    for (const g of this.gulls) {
      const a = t * g.speed + g.phase;
      const nx = g.cx + Math.cos(a) * g.rx;
      g.s.setFlipped(-Math.sin(a) < 0);
      g.s.place(nx, g.cy + Math.sin(a * 2) * g.ry);
      g.s.setFrame([0, 1, 2, 1][Math.floor(t * 6 + g.phase * 3) % 4]!);
    }
    this.sittingGull.setFrame(1);

    this.updateSmoke(dt);
    this.updateSparks(dt);

    const side = day.keyDir[0];
    const elev = day.keyDir[1];
    const strength = 1 - day.night * 0.7;
    for (const s of this.all) s.castShadow(side, elev, strength);
  }

  private updateBuildings(dt: number): void {
    const unloading = this.vehicles.some((v) => v.phase === 'docked' && v.slot === 0);
    for (const b of this.buildings.values()) {
      if (b.scaffoldT > 0) {
        b.scaffoldT -= dt;
        const box = b.sprite.bounds();
        const sc = b.scaffold;
        const frame = sc.bounds();
        sc.visible = true;
        sc.place(box.x + Math.round((box.w - frame.w) / 2), b.spot.y - frame.h);
        if (b.scaffoldT <= 0) {
          sc.visible = false;
          b.sprite.setStage(b.pendingStage);
          if (!this.reducedMotion) this.burst(box.x + box.w / 2, box.y + box.h / 3, b.spot.layer);
        }
      }
      if (b.hop > 0) {
        b.hop -= dt;
        b.sprite.dy = b.hop > 0 && !this.reducedMotion ? -1 : 0;
      }
      if (b.id === 'crane') {
        b.sprite.setFrame(unloading && b.level > 0 ? Math.floor(this.time * 1.2) % 2 : 0);
      }
    }
  }

  private updateWorkers(dt: number, t: number): void {
    this.walkers.forEach((w, i) => {
      w.s.visible = i < this.workerCount;
      if (!w.s.visible) return;
      if (w.pause > 0) {
        w.pause -= dt;
        w.s.setFrame(0);
      } else {
        w.x += w.dir * w.speed * dt;
        if (w.x > WALK.max || w.x < WALK.min) {
          w.dir = w.x > WALK.max ? -1 : 1;
          w.x = Math.min(WALK.max, Math.max(WALK.min, w.x));
          w.pause = 1.5 + w.phase * 2;
        }
        w.s.setFrame(Math.floor((t + w.phase) * 8));
      }
      w.s.place(w.x, WALK.y).setFlipped(w.dir < 0);
    });
  }

  private emit(at: Point | undefined, dust = false): void {
    if (!at) return;
    const puff = this.puffs.find((p) => !p.alive);
    if (!puff) return;
    puff.alive = true;
    puff.age = 0;
    puff.x = at[0];
    puff.y = at[1];
    puff.dust = dust;
  }

  /** Funken beim Meilenstein-Umbau (docs/05 § Feedback). */
  private burst(x: number, y: number, layer: LayerName): void {
    const l = this.layers[layer];
    for (let i = 0; i < 8; i++) {
      const s = new SceneSprite(this.assets.sprite('harbor.spark'), l, {
        reflect: false,
        shadow: false,
      });
      this.all.push(s);
      const a = (i / 8) * Math.PI * 2;
      this.sparks.push({ s, x, y, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26 - 12, age: 0 });
    }
  }

  private updateSparks(dt: number): void {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i]!;
      p.age += dt;
      p.vy += 40 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.s.place(p.x, p.y).setFrame(Math.min(2, Math.floor(p.age / 0.2)));
      if (p.age > 0.6) {
        this.remove(p.s);
        this.sparks.splice(i, 1);
      }
    }
  }

  private updateSmoke(dt: number): void {
    this.puffTimer += dt;
    this.shipPuffTimer += dt;
    if (this.puffTimer > 0.8) {
      this.puffTimer = 0;
      const wh = this.buildings.get('warehouse')!;
      this.emit(wh.sprite.point('chimney'));
      const yard = this.buildings.get('shipyard')!;
      if (yard.level > 0) this.emit(yard.sprite.point('chimney'));
    }
    if (this.shipPuffTimer > 0.6) {
      this.shipPuffTimer = 0;
      const f = this.decorShip.point('funnel');
      if (f) this.emit([f[0], f[1] - (this.decorShip.y - 318)]);
    }
    for (const p of this.puffs) {
      if (!p.alive) {
        p.s.visible = false;
        continue;
      }
      p.age += dt;
      if (p.dust) {
        p.x += (p.age < 0.2 ? 6 : 2) * dt;
      } else {
        p.y -= 5 * dt;
        p.x += (2 + p.age * 1.5) * dt;
      }
      const life = p.dust ? 0.9 : 3.4;
      p.s.visible = p.age < life;
      if (!p.s.visible) p.alive = false;
      p.s.place(p.x, p.y).setFrame(Math.min(3, Math.floor(p.age / (life / 4.5))));
    }
  }

  /** Punktlichter in Bühnenkoordinaten; Stärke folgt der Nacht. Wichtigste zuerst. */
  lights(day: DayState): { lights: PointLight[]; beam: [number, number, number, number] } {
    const n = day.night;
    const out: PointLight[] = [];
    const push = (
      layer: LayerName,
      p: Point | undefined,
      radius: number,
      intensity: number,
      color: readonly [number, number, number],
    ) => {
      if (p && intensity > 0.01)
        out.push({
          x: p[0] + this.offsetX[layer],
          y: p[1] + this.offsetY,
          radius,
          intensity,
          color,
        });
    };
    const b = (id: string) => this.buildings.get(id)!;
    const built = (id: string) => b(id).level > 0;
    const pt = (id: string, name: string) => (built(id) ? b(id).sprite.point(name) : undefined);
    const lighthouseOn = built('lighthouse');
    if (lighthouseOn) push('mid', b('lighthouse').sprite.point('lamp'), 70, 1.3 * n, BEAM);
    push('game', this.lampPost.point('lamp'), 64, 1.6 * n, WARM);
    const wh = b('warehouse').sprite;
    push('game', wh.point('window'), 26, 0.6 * n, WARM);
    push('game', wh.point('lampL'), 34, 0.9 * n, WARM);
    push('game', wh.point('lampR'), 34, 0.9 * n, WARM);
    push('game', pt('pier', 'lamp0'), 40, 1.0 * n, WARM);
    push('game', pt('pier', 'lamp1'), 40, 1.0 * n, WARM);
    push('game', pt('crane', 'flood'), 56, 1.2 * n, CLEAR);
    push('game', pt('fishMarket', 'lampL'), 30, 0.9 * n, WARM);
    push('game', pt('fishMarket', 'lampR'), 30, 0.9 * n, WARM);
    push('game', pt('customs', 'window'), 24, 0.6 * n, WARM);
    push('game', pt('customs', 'lamp'), 30, 0.8 * n, WARM);
    push('game', pt('shipyard', 'lampL'), 40, 1.0 * n, CLEAR);
    push('game', pt('shipyard', 'weld'), 18, 0.8 + 0.4 * Math.sin(this.time * 9), WELD);
    if (b('spaceportPier').level > 0) {
      push('game', b('spaceportPier').sprite.point('hangar'), 44, 1.2 * n, CLEAR);
    }
    for (const v of this.vehicles) {
      const s = this.vehicleSprites.get(v.id);
      push('game', s?.point('mast') ?? s?.point('bowLight'), 22, 0.8 * n, CLEAR);
    }
    const lamp = b('lighthouse').sprite.point('lamp');
    const beam: [number, number, number, number] =
      lamp && lighthouseOn
        ? [lamp[0] + this.offsetX.mid, lamp[1] + this.offsetY, Math.cos(this.time * 0.8) * 190, n]
        : [0, 0, 0, 0];
    return { lights: out, beam };
  }

  applyPass(pass: MapKind): void {
    for (const s of this.all) s.sync(pass);
  }
}
