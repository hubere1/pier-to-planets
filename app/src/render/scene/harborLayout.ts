/**
 * Hafen-Komposition (docs/06 §6, D-029, D-037): wo Gebäude stehen, wo Schiffe anlegen.
 * Koordinaten im 640er-Kern-Band der jeweiligen Ebene. Nur Darstellung.
 */
import type { Point } from '../assets.ts';

export type LayerName = 'far' | 'mid' | 'game' | 'front';

export interface BuildingSpot {
  sprite: string;
  layer: LayerName;
  x: number;
  y: number;
  /** Gerüstgröße (Index in `harbor.scaffold`) für den Meilenstein-Umbau. */
  scaffold: number;
  /** Fußpunkt des Bauplatz-Schilds relativ zum Gebäude. */
  signDx: number;
  /** Sprite-Stufe für „Stufe 1–9“; der Leuchtturm hat davor eine dunkle Stufe. */
  stageOffset: number;
}

/** Gebäude-ID (Inhalt) → Platz in der Szene. Der Raumhafen-Anleger ist das Ziel-Gebäude. */
export const BUILDINGS: Readonly<Record<string, BuildingSpot>> = {
  shipyard: {
    sprite: 'harbor.shipyard',
    layer: 'game',
    x: -66,
    y: 414,
    scaffold: 2,
    signDx: 30,
    stageOffset: 0,
  },
  fishMarket: {
    sprite: 'harbor.fishMarket',
    layer: 'game',
    x: 30,
    y: 414,
    scaffold: 0,
    signDx: 0,
    stageOffset: 0,
  },
  warehouse: {
    sprite: 'harbor.warehouse',
    layer: 'game',
    x: 104,
    y: 414,
    scaffold: 2,
    signDx: 0,
    stageOffset: 0,
  },
  customs: {
    sprite: 'harbor.customs',
    layer: 'game',
    x: 190,
    y: 414,
    scaffold: 1,
    signDx: 0,
    stageOffset: 0,
  },
  pier: {
    sprite: 'harbor.pier',
    layer: 'game',
    x: 196,
    y: 452,
    scaffold: 0,
    signDx: 40,
    stageOffset: 0,
  },
  crane: {
    sprite: 'harbor.crane',
    layer: 'game',
    x: 262,
    y: 412,
    scaffold: 1,
    signDx: 0,
    stageOffset: 0,
  },
  lighthouse: {
    sprite: 'harbor.lighthouse',
    layer: 'mid',
    x: 308,
    y: 215,
    scaffold: 0,
    signDx: -18,
    stageOffset: 1,
  },
  spaceportPier: {
    sprite: 'harbor.spaceportPier',
    layer: 'game',
    x: 432,
    y: 470,
    scaffold: 2,
    signDx: -30,
    stageOffset: 0,
  },
};

/** Wasserlinie der Fahrzeuge. */
const NEAR = 476;
const FAR = 530;

/**
 * 4 Liegeplätze (D-032) in zwei Reihen, so verteilt, dass auch Containerschiffe (152 px)
 * nebeneinander passen. Platz 0 liegt unter dem Kran-Ausleger.
 */
export const BERTHS: readonly Point[] = [
  [312, NEAR],
  [118, NEAR],
  [242, FAR],
  [44, FAR],
];

/** 4 Plätze auf Reede, rechts vor dem Ziel-Gebäude (bleiben über dem Panel sichtbar). */
export const ROADSTEAD: readonly Point[] = [
  [436, 540],
  [476, 562],
  [396, 556],
  [452, 580],
];

/** Fahrzeuge kommen von rechts aus der offenen See und fahren dorthin zurück. */
export const SPAWN_X = 560;
export const EXIT: Point = [600, 590];

/** Arbeiter laufen auf Kai und Steg. */
export const WALK = { y: 413, min: -110, max: 330 };
