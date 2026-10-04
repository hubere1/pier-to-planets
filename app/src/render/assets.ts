/**
 * Lädt Grafik ausschließlich über Manifest-IDs (AGENTS Regel 15, D-015).
 * Der Code kennt keine Dateinamen einzelner Sprites – nur das Manifest.
 */
import { Assets, Rectangle, Texture } from 'pixi.js';
import manifestJson from '../../../art/manifest.json';

export type MapKind = 'albedo' | 'normal' | 'emissive';
export type Point = readonly [number, number];

interface Manifest {
  version: number;
  atlases: Record<
    string,
    {
      width: number;
      height: number;
      maps: Record<MapKind, string>;
      luts: { file: string; size: number; order: string[] };
    }
  >;
  sprites: Record<
    string,
    {
      atlas: string;
      anchor: Point;
      reflect: boolean;
      shadow: boolean;
      stages: { frames: [number, number, number, number][]; points: Record<string, Point> }[];
    }
  >;
}

const manifest = manifestJson as unknown as Manifest;

// Vite liefert für jede gebaute Grafik eine URL; das Manifest wählt daraus aus.
const urls = import.meta.glob('../../../art/build/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function urlFor(rel: string): string {
  const url = urls[`../../../art/${rel}`];
  if (!url) throw new Error(`Grafik fehlt im Build: art/${rel} (npm run art)`);
  return url;
}

export type FrameTextures = Record<MapKind, Texture>;

export interface SpriteAsset {
  id: string;
  anchor: Point;
  reflect: boolean;
  shadow: boolean;
  stages: { frames: FrameTextures[]; points: Record<string, Point> }[];
}

export interface EraAssets {
  sprite(id: string): SpriteAsset;
  lut: Texture;
  lutCount: number;
}

async function loadTexture(url: string, scaleMode: 'nearest' | 'linear'): Promise<Texture> {
  const tex = await Assets.load<Texture>(url);
  tex.source.scaleMode = scaleMode;
  tex.source.autoGenerateMipmaps = false;
  return tex;
}

export async function loadEra(era: string): Promise<EraAssets> {
  const atlas = manifest.atlases[era];
  if (!atlas) throw new Error(`Ära ${era} nicht im Manifest`);
  const [albedo, normal, emissive, lut] = await Promise.all([
    loadTexture(urlFor(atlas.maps.albedo), 'nearest'),
    loadTexture(urlFor(atlas.maps.normal), 'nearest'),
    loadTexture(urlFor(atlas.maps.emissive), 'nearest'),
    // LUT wird zwischen den Stützwerten interpoliert.
    loadTexture(urlFor(atlas.luts.file), 'linear'),
  ]);
  const sheets: Record<MapKind, Texture> = { albedo, normal, emissive };
  const cache = new Map<string, SpriteAsset>();

  return {
    lut,
    lutCount: atlas.luts.order.length,
    sprite(id) {
      const hit = cache.get(id);
      if (hit) return hit;
      const def = manifest.sprites[id];
      if (!def || def.atlas !== era) throw new Error(`Sprite ${id} nicht im Manifest (${era})`);
      const asset: SpriteAsset = {
        id,
        anchor: def.anchor,
        reflect: def.reflect,
        shadow: def.shadow,
        stages: def.stages.map((st) => ({
          points: st.points,
          frames: st.frames.map(([x, y, w, h]) => {
            const frame = new Rectangle(x, y, w, h);
            const make = (k: MapKind) => new Texture({ source: sheets[k].source, frame });
            return { albedo: make('albedo'), normal: make('normal'), emissive: make('emissive') };
          }),
        })),
      };
      cache.set(id, asset);
      return asset;
    },
  };
}
