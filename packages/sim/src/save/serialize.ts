/**
 * Spielstand schreiben und tolerant lesen (docs/04 § Save, AGENTS Regel 9, D-009).
 * Datei = Kopf + Payload; `Num` als String. Fehlende Felder bekommen ihren Startwert.
 * Dateisystem (save.tmp → save.json, save.bak) liegt in der App; hier nur reine Logik.
 */
import { ERA_IDS, ERAS, type EraId } from '@ptp/content';
import { Num } from '../num/index.ts';
import { Rng } from '../rng/index.ts';
import {
  freshEra,
  newGame,
  type BuyAmount,
  type EraState,
  type GameState,
  type RewardKind,
  type Vehicle,
  type VehiclePhase,
} from '../model/state.ts';
import { migrate } from './migrate.ts';
import { SAVE_SCHEMA_VERSION, type SaveFile, type SaveHeader } from './schema.ts';
import { sha256Hex } from './sha256.ts';

// ---------------------------------------------------------------- schreiben

function encodeEra(e: EraState): Record<string, unknown> {
  return {
    ...e,
    money: e.money.serialize(),
    runEarnings: e.runEarnings.serialize(),
    lifetimeEarnings: e.lifetimeEarnings.serialize(),
  };
}

export function encodeState(s: GameState): Record<string, unknown> {
  const eras: Record<string, unknown> = {};
  for (const [id, e] of Object.entries(s.eras)) if (e) eras[id] = encodeEra(e);
  return {
    ...s,
    eras,
    lastOffline: s.lastOffline
      ? {
          ...s.lastOffline,
          earned: s.lastOffline.earned.serialize(),
          byEra: Object.fromEntries(
            Object.entries(s.lastOffline.byEra).map(([k, v]) => [k, v.serialize()]),
          ),
        }
      : null,
  };
}

export function serializeSave(
  s: GameState,
  meta: { savedAtWallMs: number; appVersion: string },
): string {
  const payload = encodeState(s);
  const file: SaveFile = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    checksum: sha256Hex(JSON.stringify(payload)),
    savedAtWallMs: meta.savedAtWallMs,
    appVersion: meta.appVersion,
    payload,
  };
  return JSON.stringify(file);
}

// ---------------------------------------------------------------- tolerant lesen

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : d;
const big = (v: unknown, d: Num): Num => Num.parse(v) ?? d;
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const PHASES: readonly VehiclePhase[] = ['approach', 'waiting', 'docked', 'leaving'];

function decodeVehicle(v: unknown): Vehicle | undefined {
  if (!isObj(v)) return undefined;
  const phase = PHASES.find((p) => p === v.phase);
  if (!phase) return undefined;
  const load = num(v.load, 0);
  return {
    id: num(v.id, 0),
    tier: num(v.tier, 0),
    load,
    cargo: num(v.cargo, load),
    phase,
    t: num(v.t, 0),
    bonusTaps: num(v.bonusTaps, 0),
    turnedAway: bool(v.turnedAway, false),
  };
}

function decodeEra(id: EraId, raw: unknown): EraState | undefined {
  const def = ERAS[id];
  if (!def || !isObj(raw)) return undefined;
  const base = freshEra(def, new Rng(0));
  const levels = { ...base.levels };
  if (isObj(raw.levels)) {
    for (const k of Object.keys(levels)) levels[k] = Math.max(0, num(raw.levels[k], levels[k]!));
  }
  const unlocked = Array.isArray(raw.unlocked)
    ? raw.unlocked.filter((x): x is string => typeof x === 'string')
    : base.unlocked;
  return {
    money: big(raw.money, base.money),
    runEarnings: big(raw.runEarnings, base.runEarnings),
    lifetimeEarnings: big(raw.lifetimeEarnings, base.lifetimeEarnings),
    levels,
    unlocked: [...new Set([...base.unlocked, ...unlocked])],
    starsEarned: num(raw.starsEarned, 0),
    goalBuilt: bool(raw.goalBuilt, false),
    resets: num(raw.resets, 0),
    vehicles: Array.isArray(raw.vehicles)
      ? raw.vehicles.map(decodeVehicle).filter((v): v is Vehicle => !!v)
      : [],
    arrivalMass: num(raw.arrivalMass, 1),
    stock: num(raw.stock, 0),
    served: num(raw.served, 0),
  };
}

const BUY_AMOUNTS: readonly BuyAmount[] = [1, 10, 'max'];
const REWARD_KINDS: readonly RewardKind[] = ['boost', 'offlineDouble'];

/** Payload (aktuelles Schema) → GameState; Unbekanntes wird ignoriert, Fehlendes ergänzt. */
export function decodeState(p: Obj): GameState {
  const base = newGame(0);
  const eras: GameState['eras'] = {};
  if (isObj(p.eras)) {
    for (const id of ERA_IDS) {
      const e = decodeEra(id, p.eras[id]);
      if (e) eras[id] = e;
    }
  }
  if (!eras.harbor) eras.harbor = base.eras.harbor!;
  const activeEra = ERA_IDS.find((id) => id === p.activeEra && eras[id]) ?? 'harbor';
  const boost = isObj(p.boost) ? p.boost : {};
  const rewards = isObj(p.rewards) ? p.rewards : {};
  const used = isObj(rewards.used) ? rewards.used : {};
  const lo = isObj(p.lastOffline) ? p.lastOffline : null;
  return {
    time: num(p.time, 0),
    rng: num(p.rng, base.rng) >>> 0,
    nextVehicleId: num(p.nextVehicleId, base.nextVehicleId),
    activeEra,
    buyAmount: BUY_AMOUNTS.find((a) => a === p.buyAmount) ?? 1,
    eras,
    boost: {
      remaining: num(boost.remaining, 0),
      level: num(boost.level, 0),
    },
    rewards: {
      day: num(rewards.day, 0),
      used: Object.fromEntries(
        REWARD_KINDS.flatMap((k) => (typeof used[k] === 'number' ? [[k, used[k]]] : [])),
      ),
    },
    lastOffline: lo
      ? {
          earned: big(lo.earned, Num.ZERO),
          byEra: Object.fromEntries(
            ERA_IDS.flatMap((id) => {
              const v = isObj(lo.byEra) ? Num.parse(lo.byEra[id]) : undefined;
              return v ? [[id, v]] : [];
            }),
          ),
          seconds: num(lo.seconds, 0),
          counted: num(lo.counted, 0),
          doubled: bool(lo.doubled, false),
        }
      : null,
  };
}

export type LoadResult =
  | { ok: true; state: GameState; header: SaveHeader }
  | { ok: false; reason: 'parse' | 'checksum' | 'newer' | 'invalid'; header?: SaveHeader };

export function loadSave(text: string): LoadResult {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'parse' };
  }
  if (!isObj(file) || !isObj(file.payload)) return { ok: false, reason: 'invalid' };
  const header: SaveHeader = {
    schemaVersion: num(file.schemaVersion, 0),
    checksum: typeof file.checksum === 'string' ? file.checksum : '',
    savedAtWallMs: num(file.savedAtWallMs, 0),
    appVersion: typeof file.appVersion === 'string' ? file.appVersion : '',
  };
  if (header.schemaVersion > SAVE_SCHEMA_VERSION) return { ok: false, reason: 'newer', header };
  if (sha256Hex(JSON.stringify(file.payload)) !== header.checksum) {
    return { ok: false, reason: 'checksum', header };
  }
  try {
    const payload = migrate(file.payload, Math.max(1, header.schemaVersion));
    return { ok: true, state: decodeState(payload), header };
  } catch {
    return { ok: false, reason: 'invalid', header };
  }
}

export interface SaveChoice {
  state: GameState | null;
  source: 'main' | 'backup' | 'none';
  header?: SaveHeader;
  /** Defekte Dateien: App verschiebt sie nach `corrupt_<zeit>.json`, löscht nie. */
  quarantine: ('main' | 'backup')[];
  /** Spielstand stammt aus einer neueren App: Hinweis „App aktualisieren“, Datei unangetastet. */
  newerVersion: boolean;
}

/** Ladereihenfolge save.json → save.bak (docs/04 § Save). */
export function chooseSave(files: { main?: string | null; backup?: string | null }): SaveChoice {
  const quarantine: SaveChoice['quarantine'] = [];
  for (const source of ['main', 'backup'] as const) {
    const text = files[source];
    if (text === undefined || text === null) continue;
    const r = loadSave(text);
    if (r.ok) return { state: r.state, source, header: r.header, quarantine, newerVersion: false };
    if (r.reason === 'newer') return { state: null, source, quarantine, newerVersion: true };
    quarantine.push(source);
  }
  return { state: null, source: 'none', quarantine, newerVersion: false };
}
