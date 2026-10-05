/**
 * Pixel-Symbol aus art/build/ui/icons.albedo.png, auf ganze Spiel-Pixel skaliert (`--gp`).
 */
import iconsUrl from '../../../../art/build/ui/icons.albedo.png?url';
import sheet from '../../../../art/build/ui/icons.json';

export type IconName =
  | 'coin'
  | 'star'
  | 'crystal'
  | 'gear'
  | 'build'
  | 'goal'
  | 'eras'
  | 'lock'
  | 'warn'
  | 'close'
  | 'check'
  | 'clock'
  | 'up';

const index = new Map(sheet.icons.map((n, i) => [n, i]));

export function Icon(props: { name: IconName; scale?: 1 | 2; class?: string }) {
  const i = index.get(props.name) ?? 0;
  const k = props.scale ?? 1;
  const size = `calc(${sheet.size * k} * var(--gp))`;
  return (
    <span
      class={`icon ${props.class ?? ''}`}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${iconsUrl})`,
        backgroundSize: `calc(${sheet.size * sheet.icons.length * k} * var(--gp)) ${size}`,
        backgroundPosition: `calc(${-i * sheet.size * k} * var(--gp)) 0`,
      }}
    />
  );
}
