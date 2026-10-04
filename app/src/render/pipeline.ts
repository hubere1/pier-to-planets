/**
 * Render-Pipeline (docs/04 § Renderer):
 * 1. G-Puffer in Spiel-Pixeln: Albedo, Normalen, Emissive (gleiche Szene, Texturen getauscht)
 * 2. Schatten-Puffer (Silhouetten, weiß = Licht)
 * 3. Licht-Pass (composite.ts) → fertiges Bild 360 × H
 * 4. Ganzzahlig hochskalieren (nearest), Rest per Sharp-Bilinear
 */
import {
  Container,
  Mesh,
  MeshGeometry,
  RenderTexture,
  Shader,
  Sprite,
  type Renderer,
  type Texture,
} from 'pixi.js';
import type { MapKind } from './assets.ts';
import type { StageLayout } from './layout.ts';
import { fragment, MAX_LIGHTS, vertex } from './lighting/composite.ts';

export interface PassTarget {
  /** Setzt alle Sprites auf die Map des Durchgangs. */
  applyPass(pass: MapKind): void;
}

export interface Frame {
  world: Container;
  shadows: Container;
  scene: PassTarget;
}

const rt = (w: number, h: number, scaleMode: 'nearest' | 'linear' = 'nearest') =>
  RenderTexture.create({ width: w, height: h, scaleMode, resolution: 1, antialias: false });

type Uniforms = Record<string, unknown>;

export class Pipeline {
  readonly view = new Container();
  private targets!: Record<MapKind | 'shadow' | 'final', RenderTexture>;
  private big?: RenderTexture;
  private mesh!: Mesh<MeshGeometry, Shader>;
  private shader!: Shader;
  private readonly finalSprite = new Sprite();
  private readonly bigSprite = new Sprite();
  private readonly bigStage = new Container();
  private layout!: StageLayout;

  constructor(
    private readonly renderer: Renderer,
    private readonly lut: Texture,
    private readonly lutCount: number,
  ) {
    this.view.addChild(this.finalSprite, this.bigSprite);
  }

  get uniforms(): Uniforms {
    return (this.shader.resources as { u: { uniforms: Uniforms } }).u.uniforms;
  }

  resize(layout: StageLayout): void {
    this.layout = layout;
    const { gameW: w, gameH: h } = layout;
    if (this.targets) Object.values(this.targets).forEach((t) => t.destroy(true));
    this.big?.destroy(true);
    this.targets = {
      albedo: rt(w, h),
      normal: rt(w, h),
      emissive: rt(w, h),
      shadow: rt(w, h),
      final: rt(w, h),
    };
    const geometry = new MeshGeometry({
      positions: new Float32Array([0, 0, w, 0, w, h, 0, h]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
    const prev = this.shader ? { ...this.uniforms } : undefined;
    this.shader = Shader.from({
      gl: { vertex, fragment, name: 'ptp-composite', preferredFragmentPrecision: 'highp' },
      resources: {
        uAlbedo: this.targets.albedo.source,
        uNormal: this.targets.normal.source,
        uEmissive: this.targets.emissive.source,
        uShadow: this.targets.shadow.source,
        uLut: this.lut.source,
        u: {
          uSize: { value: new Float32Array([w, h]), type: 'vec2<f32>' },
          uFlipY: { value: 0, type: 'f32' },
          uTime: { value: 0, type: 'f32' },
          uHorizon: { value: 0, type: 'f32' },
          uKeyDir: { value: new Float32Array([0, 1, 0]), type: 'vec3<f32>' },
          uKeyColor: { value: new Float32Array(3), type: 'vec3<f32>' },
          uAmbient: { value: new Float32Array(3), type: 'vec3<f32>' },
          uSkyTop: { value: new Float32Array(3), type: 'vec3<f32>' },
          uSkyHorizon: { value: new Float32Array(3), type: 'vec3<f32>' },
          uGlow: { value: new Float32Array(3), type: 'vec3<f32>' },
          uWater: { value: new Float32Array(3), type: 'vec3<f32>' },
          uSun: { value: new Float32Array(4), type: 'vec4<f32>' },
          uMoon: { value: new Float32Array(4), type: 'vec4<f32>' },
          uStars: { value: 0, type: 'f32' },
          uNight: { value: 0, type: 'f32' },
          uLut3: { value: new Float32Array([0, 0, 0, this.lutCount]), type: 'vec4<f32>' },
          uFlags: { value: new Float32Array([1, 1, 1, 1]), type: 'vec4<f32>' },
          uBeam: { value: new Float32Array(4), type: 'vec4<f32>' },
          uLights: { value: new Float32Array(MAX_LIGHTS * 4), type: 'vec4<f32>', size: MAX_LIGHTS },
          uLightColors: {
            value: new Float32Array(MAX_LIGHTS * 4),
            type: 'vec4<f32>',
            size: MAX_LIGHTS,
          },
          uLightCount: { value: 0, type: 'f32' },
        },
      },
    });
    if (prev) Object.assign(this.uniforms, prev, { uSize: new Float32Array([w, h]) });
    this.mesh?.destroy();
    this.mesh = new Mesh<MeshGeometry, Shader>({ geometry, shader: this.shader });

    this.finalSprite.texture = this.targets.final;
    if (layout.sharp) {
      // Sharp-Bilinear: erst nearest auf s, dann einmal bilinear auf die Zielgröße.
      this.big = rt(w * layout.scale, h * layout.scale, 'linear');
      this.bigStage.removeChildren();
      const inner = new Sprite(this.targets.final);
      inner.scale.set(layout.scale);
      this.bigStage.addChild(inner);
      this.bigSprite.texture = this.big;
      this.bigSprite.visible = true;
      this.finalSprite.visible = false;
      this.bigSprite.position.set(layout.offsetX, layout.offsetY);
      this.bigSprite.width = layout.outW;
      this.bigSprite.height = layout.outH;
    } else {
      this.bigSprite.visible = false;
      this.finalSprite.visible = true;
      this.finalSprite.scale.set(layout.scale);
      this.finalSprite.position.set(layout.offsetX, layout.offsetY);
    }
  }

  render(frame: Frame): void {
    const r = this.renderer;
    const clear = [0, 0, 0, 0] as const;
    for (const pass of ['albedo', 'normal', 'emissive'] as const) {
      frame.scene.applyPass(pass);
      r.render({
        container: frame.world,
        target: this.targets[pass],
        clear: true,
        clearColor: [...clear],
      });
    }
    frame.scene.applyPass('albedo');
    r.render({
      container: frame.shadows,
      target: this.targets.shadow,
      clear: true,
      clearColor: [1, 1, 1, 1],
    });
    r.render({
      container: this.mesh,
      target: this.targets.final,
      clear: true,
      clearColor: [0, 0, 0, 1],
    });
    if (this.layout.sharp && this.big) {
      r.render({ container: this.bigStage, target: this.big, clear: true });
    }
  }
}
