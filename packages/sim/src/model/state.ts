/**
 * Spielzustand (docs/04 § Kernvertrag). Reine Daten, serialisierbar über `save/`.
 * Geld ist `Num`, Zähler und Raten sind `number`.
 */
import { ERAS, type EraDef, type EraId } from '@ptp/content';
import { Num } from '../num/index.ts';
import { APPROACH_S, FIRST_BOAT_LOAD } from '../rules.ts';
import { Rng, seedRng } from '../rng/index.ts';

export type BuyAmount = 1 | 10 | 'max';

/**
 * `approach` → (`waiting` auf Reede, wenn alle Liegeplätze belegt) → `docked` (wird entladen)
 * → `leaving` (docs/04 § Szenen-Zustand, D-032).
 */
export type VehiclePhase = 'approach' | 'waiting' | 'docked' | 'leaving';

export interface Vehicle {
  id: number;
  /** Index in `EraDef.vehicles`. */
  tier: number;
  /** Ladung bei Ankunft (Waren). */
  load: number;
  /** Noch an Bord. */
  cargo: number;
  phase: VehiclePhase;
  /** Sekunden in der aktuellen Phase. */
  t: number;
  /** Bonus-Tipps mit Kran (D-032). */
  bonusTaps: number;
  /** Abgewiesen, weil Liegeplätze und Reede voll waren (fährt beladen wieder ab). */
  turnedAway: boolean;
}

export interface EraState {
  money: Num;
  /** Einnahmen seit dem letzten Neustart dieser Ära. */
  runEarnings: Num;
  /** Einnahmen der Ära über alle Neustarts (Grundlage der Sterne, §4.1). */
  lifetimeEarnings: Num;
  levels: Record<string, number>;
  /** Freigeschaltete Gebäude (bleiben über Neustarts frei). */
  unlocked: string[];
  starsEarned: number;
  goalBuilt: boolean;
  resets: number;
  vehicles: Vehicle[];
  /** Restliche Exp(1)-Masse bis zur nächsten Ankunft (zeitvariabler Poisson-Prozess). */
  arrivalMass: number;
  /** Entladene, noch nicht verkaufte Waren. */
  stock: number;
  /** Abgefertigte Fahrzeuge, gesamt (Zähler für Erfolge). */
  served: number;
}

export interface BoostState {
  /** Restzeit in Sekunden; läuft nur im aktiven Spiel ab (D-032). */
  remaining: number;
  /** Aktueller Faktor-Anteil 0..1, gleitet in `BOOST_GLIDE_S` (Lehre 8). */
  level: number;
}

/** Werbe-Belohnungen mit Tageslimit (docs/03 §10). */
export type RewardKind = 'boost' | 'offlineDouble';

export interface RewardState {
  /** Lokaler Tag (vom Gerät geliefert, z. B. Tage seit 1970 in Ortszeit). */
  day: number;
  /** Nutzungen am Tag `day`. */
  used: Partial<Record<RewardKind, number>>;
}

export interface OfflineResult {
  /** Ertrag aller Ären zusammen (Anzeige) und je Ära (für ×2 per Werbung). */
  earned: Num;
  byEra: Partial<Record<EraId, Num>>;
  seconds: number;
  counted: number;
  doubled: boolean;
}

export interface GameState {
  /** Sim-Sekunden seit Spielbeginn (aktiv + offline). */
  time: number;
  rng: number;
  nextVehicleId: number;
  activeEra: EraId;
  buyAmount: BuyAmount;
  eras: Partial<Record<EraId, EraState>>;
  boost: BoostState;
  rewards: RewardState;
  lastOffline: OfflineResult | null;
}

export function eraDef(era: EraId): EraDef {
  const def = ERAS[era];
  if (!def) throw new Error(`Ära ${era} hat noch keine Inhalte`);
  return def;
}

export function freshEra(def: EraDef, rng: Rng): EraState {
  const levels: Record<string, number> = {};
  for (const b of def.buildings) levels[b.id] = b.startLevel;
  return {
    money: Num.ZERO,
    runEarnings: Num.ZERO,
    lifetimeEarnings: Num.ZERO,
    levels,
    unlocked: def.buildings.filter((b) => b.unlockAtLifetime <= 0).map((b) => b.id),
    starsEarned: 0,
    goalBuilt: false,
    resets: 0,
    vehicles: [],
    arrivalMass: rng.exp1(),
    stock: 0,
    served: 0,
  };
}

/** Neues Spiel: Hafen, Morgendämmerung, ein Fischerboot legt gleich an (docs/03 §8). */
export function newGame(seed: number): GameState {
  const rng = new Rng(seedRng(seed));
  const def = eraDef('harbor');
  const harbor = freshEra(def, rng);
  harbor.vehicles.push(firstBoat(def, 1));
  return {
    time: 0,
    rng: rng.state,
    nextVehicleId: 2,
    activeEra: 'harbor',
    buyAmount: 1,
    eras: { harbor },
    boost: { remaining: 0, level: 0 },
    rewards: { day: 0, used: {} },
    lastOffline: null,
  };
}

/** Das erste Boot ist fast da, damit der erste Tipp in Sekunden möglich ist (FR-K02). */
export function firstBoat(def: EraDef, id: number): Vehicle {
  const load = def.loadBase * FIRST_BOAT_LOAD;
  return {
    id,
    tier: 0,
    load,
    cargo: load,
    phase: 'approach',
    t: APPROACH_S - 2,
    bonusTaps: 0,
    turnedAway: false,
  };
}

export function eraState(s: GameState, era: EraId): EraState {
  const e = s.eras[era];
  if (!e) throw new Error(`Ära ${era} ist nicht freigeschaltet`);
  return e;
}

/** Sterne aller Ären zusammen (wirken global, §4.1). */
export function totalStars(s: GameState): number {
  let n = 0;
  for (const e of Object.values(s.eras)) n += e?.starsEarned ?? 0;
  return n;
}

/** Tiefe Kopie, damit `step` rein bleibt (Num ist unveränderlich). */
export function cloneState(s: GameState): GameState {
  const eras: Partial<Record<EraId, EraState>> = {};
  for (const [id, e] of Object.entries(s.eras) as [EraId, EraState][]) {
    eras[id] = {
      ...e,
      levels: { ...e.levels },
      unlocked: [...e.unlocked],
      vehicles: e.vehicles.map((v) => ({ ...v })),
    };
  }
  return {
    ...s,
    eras,
    boost: { ...s.boost },
    rewards: { day: s.rewards.day, used: { ...s.rewards.used } },
    lastOffline: s.lastOffline ? { ...s.lastOffline, byEra: { ...s.lastOffline.byEra } } : null,
  };
}
