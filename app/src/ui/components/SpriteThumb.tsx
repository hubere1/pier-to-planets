/**
 * Szenen-Ausschnitt als Karten-Icon (docs/05 § Bauen): ein Fenster auf das Sprite im
 * Albedo-Atlas, in ganzen Spiel-Pixeln (kein Verkleinern – sonst Mischpixel).
 */
import manifestJson from '../../../../art/manifest.json';

interface SpriteMeta {
  atlas: string;
  anchor: [number, number];
  stages: { frames: [number, number, number, number][] }[];
}
const manifest = manifestJson as unknown as {
  atlases: Record<string, { width: number; height: number; maps: { albedo: string } }>;
  sprites: Record<string, SpriteMeta>;
};

const urls = import.meta.glob('../../../../art/build/**/*.albedo.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function SpriteThumb(props: {
  sprite: string;
  stage: number;
  size?: number;
  dim?: boolean;
}) {
  const meta = manifest.sprites[props.sprite];
  if (!meta) return null;
  const atlas = manifest.atlases[meta.atlas]!;
  const url = urls[`../../../../art/${atlas.maps.albedo}`];
  const st = meta.stages[Math.max(0, Math.min(meta.stages.length - 1, props.stage))]!;
  const [fx, fy, fw, fh] = st.frames[0]!;
  const size = props.size ?? 44;
  // Fenster: waagerecht mittig, senkrecht am oberen Drittel (Dach, Kran, Turm).
  const ox = fx + Math.round((fw - size) / 2);
  const oy = fy + Math.max(0, Math.min(fh - size, Math.round(fh * 0.3 - size / 2)));
  const gp = (n: number) => `calc(${n} * var(--gp))`;
  // Rahmen außen: border-image mit „fill“ würde sonst über das Bild malen.
  return (
    <span class="thumb-frame frame-high" aria-hidden="true">
      <span
        class={`thumb ${props.dim ? 'thumb-dim' : ''}`}
        style={{
          width: gp(size),
          height: gp(size),
          backgroundImage: url ? `url(${url})` : undefined,
          backgroundSize: `${gp(atlas.width)} ${gp(atlas.height)}`,
          backgroundPosition: `${gp(-ox)} ${gp(-oy)}`,
        }}
      />
    </span>
  );
}
