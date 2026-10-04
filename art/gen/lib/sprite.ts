import type { Raster } from './raster.ts';

/** Benannte Ankerpunkte im Sprite (Schornstein für Rauch, Lampe für Punktlicht …). */
export type Points = Record<string, readonly [number, number]>;

export interface SpriteStage {
  /** Animationsbilder dieser Ausbaustufe, alle gleich groß. */
  frames: Raster[];
  points?: Points;
}

/**
 * Ein Sprite mit Ausbaustufen (docs/03 §3: Meilensteine verändern die Szene).
 * `anchor` ist der Fußpunkt; bei `reflect` liegt er auf der Wasserlinie und der Renderer
 * spiegelt das Sprite dort (docs/06 §6).
 */
export interface SpriteDef {
  id: string;
  anchor: readonly [number, number];
  reflect?: boolean;
  /** Wirft Sonnenschatten (docs/06 §5). */
  shadow?: boolean;
  stages: SpriteStage[];
}
