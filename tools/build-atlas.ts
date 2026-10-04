/**
 * Baut je Ära Atlanten (Albedo/Normal/Emissive, identisches Layout) + art/manifest.json
 * (docs/04 § Asset-Pipeline, D-015).
 *
 * Austausch einer Grafik ohne Codeänderung (NFR-G08): Liegt
 *   art/src/<sprite-id>/<stufe>-<bild>.albedo.png   (+ optional .normal.png, .emissive.png)
 * vor, ersetzt sie das generierte Bild. Fehlende Normal-Map = flach, fehlende Emissive = dunkel.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { harborSprites } from '../art/gen/harbor/index.ts';
import { packShelves } from '../art/gen/lib/atlas.ts';
import { LUT_SIZE, TIME_KEYS } from '../art/gen/lib/lut.ts';
import type { RgbaImage } from '../art/gen/lib/raster.ts';
import type { SpriteDef } from '../art/gen/lib/sprite.ts';
import { ROOT } from './lib/files.ts';
import { MAX_ATLAS_SIZE, NORMAL_COLORS } from './lib/palette.ts';

type Maps = { albedo: RgbaImage; normal: RgbaImage; emissive: RgbaImage };

const readPng = (file: string): RgbaImage => {
  const png = PNG.sync.read(readFileSync(file));
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
};

const writePng = (file: string, img: RgbaImage) => {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data);
  writeFileSync(file, PNG.sync.write(png, { colorType: 6 }));
};

function override(id: string, stage: number, frame: number): Maps | undefined {
  const base = join(ROOT, 'art/src', id, `${stage}-${frame}`);
  if (!existsSync(`${base}.albedo.png`)) return undefined;
  const albedo = readPng(`${base}.albedo.png`);
  const blank = () => ({ ...albedo, data: new Uint8Array(albedo.data.length) });
  let normal: RgbaImage;
  if (existsSync(`${base}.normal.png`)) normal = readPng(`${base}.normal.png`);
  else {
    normal = blank();
    const [r, g, b] = NORMAL_COLORS[0]!;
    for (let i = 0; i < albedo.width * albedo.height; i++) {
      if (albedo.data[i * 4 + 3]) normal.data.set([r, g, b, 255], i * 4);
    }
  }
  let emissive: RgbaImage;
  if (existsSync(`${base}.emissive.png`)) emissive = readPng(`${base}.emissive.png`);
  else {
    emissive = blank();
    for (let i = 0; i < albedo.width * albedo.height; i++) {
      if (albedo.data[i * 4 + 3]) emissive.data[i * 4 + 3] = 255;
    }
  }
  return { albedo, normal, emissive };
}

function blit(dst: RgbaImage, src: RgbaImage, x: number, y: number): void {
  for (let row = 0; row < src.height; row++) {
    const from = row * src.width * 4;
    dst.data.set(src.data.subarray(from, from + src.width * 4), ((y + row) * dst.width + x) * 4);
  }
}

interface ManifestSprite {
  atlas: string;
  anchor: readonly [number, number];
  reflect: boolean;
  shadow: boolean;
  stages: {
    frames: [number, number, number, number][];
    points: Record<string, readonly [number, number]>;
  }[];
}

function buildEra(era: string, defs: SpriteDef[]) {
  const items: { def: SpriteDef; stage: number; frame: number; maps: Maps; replaced: boolean }[] =
    [];
  for (const def of defs) {
    def.stages.forEach((st, s) =>
      st.frames.forEach((raster, f) => {
        const replaced = override(def.id, s, f);
        items.push({
          def,
          stage: s,
          frame: f,
          maps: replaced ?? raster.toImages(),
          replaced: !!replaced,
        });
      }),
    );
  }
  const { boxes, width, height } = packShelves(
    items.map((it) => ({ w: it.maps.albedo.width, h: it.maps.albedo.height })),
    512,
    1,
  );
  if (width > MAX_ATLAS_SIZE || height > MAX_ATLAS_SIZE)
    throw new Error(`Atlas ${era} zu groß: ${width}×${height}`);
  const sheet = () => ({ width, height, data: new Uint8Array(width * height * 4) });
  const out = { albedo: sheet(), normal: sheet(), emissive: sheet() };
  const sprites: Record<string, ManifestSprite> = {};
  items.forEach((it, i) => {
    const b = boxes[i]!;
    blit(out.albedo, it.maps.albedo, b.x, b.y);
    blit(out.normal, it.maps.normal, b.x, b.y);
    blit(out.emissive, it.maps.emissive, b.x, b.y);
    const s = (sprites[it.def.id] ??= {
      atlas: era,
      anchor: it.def.anchor,
      reflect: it.def.reflect ?? false,
      shadow: it.def.shadow ?? false,
      stages: it.def.stages.map((st) => ({ frames: [], points: st.points ?? {} })),
    });
    s.stages[it.stage]!.frames[it.frame] = [b.x, b.y, b.w, b.h];
  });

  const dir = join(ROOT, 'art/build', era);
  mkdirSync(dir, { recursive: true });
  for (const map of ['albedo', 'normal', 'emissive'] as const)
    writePng(join(dir, `atlas.${map}.png`), out[map]);

  // LUT-Streifen aller Tageszeiten untereinander (eine Textur für den Shader).
  const lutW = LUT_SIZE * LUT_SIZE;
  const luts = {
    width: lutW,
    height: LUT_SIZE * TIME_KEYS.length,
    data: new Uint8Array(lutW * LUT_SIZE * TIME_KEYS.length * 4),
  };
  TIME_KEYS.forEach((key, row) => {
    const lut = readPng(join(ROOT, 'art/luts', era, `${key}.png`));
    if (lut.width !== lutW || lut.height !== LUT_SIZE)
      throw new Error(`LUT ${era}/${key} hat falsche Größe`);
    blit(luts, lut, 0, row * LUT_SIZE);
  });
  writePng(join(dir, 'luts.png'), luts);

  const replaced = items.filter((it) => it.replaced).length;
  console.log(
    `build-atlas – ${era}: ${items.length} Bilder (${replaced} ersetzt), Atlas ${width}×${height}.`,
  );
  return {
    atlas: {
      width,
      height,
      maps: {
        albedo: `build/${era}/atlas.albedo.png`,
        normal: `build/${era}/atlas.normal.png`,
        emissive: `build/${era}/atlas.emissive.png`,
      },
      luts: { file: `build/${era}/luts.png`, size: LUT_SIZE, order: TIME_KEYS },
    },
    sprites,
  };
}

const harbor = buildEra('harbor', harborSprites());
const manifest = { version: 1, atlases: { harbor: harbor.atlas }, sprites: { ...harbor.sprites } };
writeFileSync(join(ROOT, 'art/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`build-atlas – art/manifest.json: ${Object.keys(manifest.sprites).length} Sprites.`);
