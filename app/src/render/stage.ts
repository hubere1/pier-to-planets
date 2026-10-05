/**
 * Bühne: PixiJS-Anwendung, Render-Schleife, Größenanpassung, Frame-Messung.
 * Zeit für die Darstellung kommt aus dem Ticker (nicht aus der Sim, D-017: Tag-Nacht kosmetisch).
 */
import { Application, Texture, WebGLRenderer } from 'pixi.js';
import { sceneView } from '@ptp/sim';
import type { GameSession } from '../loop/session.ts';
import { loadEra } from './assets.ts';
import { Camera } from './camera.ts';
import { dayState } from './daynight.ts';
import { debug, type Quality } from './debugState.ts';
import { computeStageLayout } from './layout.ts';
import { MAX_LIGHTS } from './lighting/composite.ts';
import { Pipeline } from './pipeline.ts';
import { HarborScene, type SceneHit } from './scene/harbor.ts';

const QUALITY: Record<
  Quality,
  { normals: boolean; bloom: boolean; wobble: boolean; lights: number; far: boolean }
> = {
  high: { normals: true, bloom: true, wobble: true, lights: MAX_LIGHTS, far: true },
  medium: { normals: true, bloom: true, wobble: false, lights: 8, far: true },
  low: { normals: false, bloom: false, wobble: false, lights: 4, far: false },
};

function deviceSize() {
  const dpr = window.devicePixelRatio || 1;
  return { w: Math.round(window.innerWidth * dpr), h: Math.round(window.innerHeight * dpr), dpr };
}

export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StageHandle {
  stop(): void;
  /** Kamera schwenkt zum Gebäude (docs/05: gewähltes Gebäude bleibt sichtbar). */
  focus(building: string): void;
  /** Umriss eines Szenen-Objekts in CSS-Pixeln (Coach-Marks, fliegende Münzen). */
  screenRect(target: SceneHit): ScreenRect | null;
  /** Erstes liegendes Fahrzeug (Tutorial). */
  firstDocked(): number | null;
  /** Render-Schleife anhalten (Hintergrund, Akku – docs/02 NFR-P). */
  setRunning(running: boolean): void;
  /** Höchstbildrate (60 oder 30; Vollbild-Panel drosselt, docs/05). */
  setMaxFps(fps: number): void;
  /** Von Panel + Navigation (unten) verdeckte Höhe in CSS-Pixeln. */
  setInsets(bottom: number): void;
}

export interface StageOptions {
  session: GameSession;
  onHit(hit: SceneHit): void;
}

/** Bewegung bis zu dieser Strecke (CSS-px) gilt als Tippen statt Wischen. */
const TAP_SLOP = 8;

export async function startStage(host: HTMLElement, opts: StageOptions): Promise<StageHandle> {
  const { session } = opts;
  const app = new Application();
  const size = deviceSize();
  await app.init({
    preference: 'webgl',
    width: size.w,
    height: size.h,
    resolution: 1,
    autoDensity: false,
    antialias: false,
    backgroundColor: 0x14161c,
    powerPreference: 'high-performance',
  });
  const canvas = app.canvas;
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;image-rendering:pixelated;';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const assets = await loadEra('harbor');
  const scene = new HarborScene(assets);
  const pipeline = new Pipeline(app.renderer, assets.lut, assets.lutCount);
  app.stage.addChild(pipeline.view);

  const camera = new Camera();
  camera.jumpTo(debug.camera.value);
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const applyMotion = () => {
    camera.reducedMotion = motionQuery.matches || debug.reducedMotion.value;
    scene.reducedMotion = camera.reducedMotion;
  };
  applyMotion();
  /** Gerätepixel je Spiel-Pixel (für die Umrechnung der Fingerbewegung). */
  let pxPerGamePx = 1;
  let layoutNow = computeStageLayout(deviceSize().w, deviceSize().h);
  const insets = { bottom: 0 };

  /**
   * Pixis WebGL-Batcher bindet nur die belegten Textur-Einheiten, der Batch-Shader deklariert aber
   * Sampler für alle. Leere Einheiten melden im Android-WebView „no texture bound to the unit n“
   * (Bild korrekt, aber Log-Flut). Daher einmal die leere Textur auf jede Einheit binden – nach
   * dem Start und nach jedem Neuanlegen der Render-Ziele (zerstörte Texturen geben ihre Einheit frei).
   */
  const fillTextureUnits = () => {
    const r = app.renderer;
    if (!(r instanceof WebGLRenderer)) return;
    for (let i = 0; i < r.limits.maxTextures; i++) r.texture.bind(Texture.EMPTY, i);
  };

  const applyLayout = () => {
    const { w, h } = deviceSize();
    const layout = computeStageLayout(w, h);
    layoutNow = layout;
    pxPerGamePx = layout.outW / layout.gameW;
    app.renderer.resize(w, h);
    pipeline.resize(layout);
    fillTextureUnits();
    // CSS-Pixel → Spiel-Pixel
    const k = (window.devicePixelRatio || 1) / pxPerGamePx;
    scene.setHeight(layout.gameH, insets.bottom * k);
    debug.stats.value = {
      ...debug.stats.value,
      scale: layout.scale,
      gameH: layout.gameH,
      sharp: layout.sharp,
    };
  };
  applyLayout();
  window.addEventListener('resize', applyLayout);

  // Kamera-Schwenk per Wischen (docs/06 §6); kurzes Antippen trifft Fahrzeuge und Gebäude.
  let pointerId: number | undefined;
  let lastX = 0;
  let downX = 0;
  let downY = 0;
  let moved = false;
  canvas.style.touchAction = 'none';
  const toStage = (clientX: number, clientY: number) => {
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (clientX * dpr - layoutNow.offsetX) / pxPerGamePx,
      y: (clientY * dpr - layoutNow.offsetY) / pxPerGamePx,
    };
  };
  const onDown = (e: PointerEvent) => {
    if (pointerId !== undefined) return;
    pointerId = e.pointerId;
    lastX = downX = e.clientX;
    downY = e.clientY;
    moved = false;
    canvas.setPointerCapture(e.pointerId);
    camera.beginDrag();
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_SLOP) moved = true;
    if (!moved) return;
    const dpr = window.devicePixelRatio || 1;
    camera.dragBy(((e.clientX - lastX) * dpr) / pxPerGamePx);
    lastX = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = undefined;
    camera.endDrag();
    if (!moved && e.type === 'pointerup') {
      const p = toStage(e.clientX, e.clientY);
      const hit = scene.hitTest(p.x, p.y);
      if (hit) opts.onHit(hit);
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  motionQuery.addEventListener('change', applyMotion);
  const unwatchMotion = debug.reducedMotion.subscribe(applyMotion);
  let lastDebugCam = debug.camera.value;

  // Automatische Qualität: nach je 10 s Messung eine Stufe herunter, wenn p95 > 20 ms (docs/04).
  const AUTO_WINDOW_S = 10;
  const AUTO_P95_MS = 20;
  let autoTimer = 0;
  let autoSamples: number[] = [];
  const autoQuality = (dt: number, frameMs: number) => {
    if (!debug.autoQuality.value || debug.quality.value === 'low') return;
    autoTimer += dt;
    autoSamples.push(frameMs);
    if (autoTimer < AUTO_WINDOW_S) return;
    const sorted = [...autoSamples].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    if (p95 > AUTO_P95_MS) debug.quality.value = debug.quality.value === 'high' ? 'medium' : 'low';
    else debug.autoQuality.value = false;
    autoTimer = 0;
    autoSamples = [];
  };

  const frameTimes: number[] = [];
  const cpuTimes: number[] = [];
  let statsTimer = 0;
  let time = 0;

  app.ticker.add((ticker) => {
    const t0 = performance.now();
    const dt = Math.min(ticker.deltaMS / 1000, 0.1);
    time += dt;
    debug.hour.value = (debug.hour.value + (dt * debug.speed.value) / 60) % 24;
    const day = dayState(debug.hour.value);
    const q = QUALITY[debug.quality.value];

    if (debug.camera.value !== lastDebugCam) camera.jumpTo(debug.camera.value);
    camera.update(dt);
    lastDebugCam = debug.camera.value = Math.round(camera.x);
    scene.setCamera(camera.x);
    session.frame();
    const era = session.state.value.activeEra;
    scene.sync(
      sceneView(session.prev, era),
      sceneView(session.state.value, era),
      session.alpha,
      dt,
    );
    scene.setLayerVisible('far', q.far);
    scene.setLayerVisible('front', q.far);
    scene.update(dt, day);

    const u = pipeline.uniforms;
    const horizon = scene.horizonY;
    const set3 = (k: string, v: readonly number[]) => (u[k] as Float32Array).set(v);
    u['uTime'] = time;
    u['uHorizon'] = horizon;
    set3('uKeyDir', day.keyDir);
    set3('uKeyColor', day.keyColor);
    set3('uAmbient', day.ambient);
    set3('uSkyTop', day.skyTop);
    set3('uSkyHorizon', day.skyHorizon);
    set3('uGlow', day.glow);
    set3('uWater', day.water);
    const skyPos = (b: { x: number; elevation: number }, r: number) => [
      Math.round(b.x * 360),
      Math.round(horizon - b.elevation * (horizon - 30)),
      Math.max(0, Math.min(1, (b.elevation + 0.05) * 6)),
      r,
    ];
    set3('uSun', skyPos(day.sun, 7));
    set3('uMoon', skyPos(day.moon, 5));
    u['uStars'] = day.stars;
    u['uNight'] = day.night;
    set3('uLut3', [day.lutA, day.lutB, day.lutMix, assets.lutCount]);
    set3('uFlags', [
      q.normals ? 1 : 0,
      q.bloom ? 1 : 0,
      q.wobble ? 1 : 0,
      debug.lighting.value ? 1 : 0,
    ]);

    const { lights, beam } = scene.lights(day);
    const pos = u['uLights'] as Float32Array;
    const col = u['uLightColors'] as Float32Array;
    const count = Math.min(lights.length, q.lights);
    for (let i = 0; i < count; i++) {
      const l = lights[i]!;
      pos.set([l.x, l.y, l.radius, l.intensity], i * 4);
      col.set([...l.color, 0], i * 4);
    }
    u['uLightCount'] = count;
    set3('uBeam', q.far ? beam : [0, 0, 0, 0]);

    pipeline.render({ world: scene.world, shadows: scene.shadows, scene });

    if (app.ticker.maxFPS >= 60) autoQuality(dt, ticker.deltaMS);
    cpuTimes.push(performance.now() - t0);
    frameTimes.push(ticker.deltaMS);
    if (frameTimes.length > 240) {
      frameTimes.shift();
      cpuTimes.shift();
    }
    statsTimer += dt;
    if (statsTimer > 0.5 && debug.open.value) {
      statsTimer = 0;
      const sorted = [...frameTimes].sort((a, b) => a - b);
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      debug.stats.value = {
        ...debug.stats.value,
        fps: Math.round(1000 / avg),
        p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]! * 10) / 10,
        cpu: Math.round((cpuTimes.reduce((a, b) => a + b, 0) / cpuTimes.length) * 10) / 10,
      };
    }
  });

  let maxFps = 60;
  app.ticker.maxFPS = maxFps;
  return {
    stop() {
      window.removeEventListener('resize', applyLayout);
      motionQuery.removeEventListener('change', applyMotion);
      unwatchMotion();
      app.destroy(true);
    },
    focus(building) {
      camera.focus(scene.cameraFor(building));
    },
    screenRect(target) {
      const r = scene.rectOf(target);
      if (!r) return null;
      const dpr = window.devicePixelRatio || 1;
      const k = pxPerGamePx / dpr;
      return {
        x: layoutNow.offsetX / dpr + r.x * k,
        y: layoutNow.offsetY / dpr + r.y * k,
        w: r.w * k,
        h: r.h * k,
      };
    },
    firstDocked: () => scene.firstDocked(),
    setRunning(running) {
      if (running) app.ticker.start();
      else app.ticker.stop();
    },
    setInsets(bottom) {
      if (bottom === insets.bottom) return;
      insets.bottom = bottom;
      applyLayout();
    },
    setMaxFps(fps) {
      if (fps === maxFps) return;
      maxFps = fps;
      app.ticker.maxFPS = fps;
    },
  };
}
