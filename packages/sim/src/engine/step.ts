/**
 * `step()` – der einzige Weg, den Spielzustand zu ändern (docs/04 § Kernvertrag).
 * Rein und deterministisch: Zufall aus `s.rng`, Zeit nur über `ctx.dt`.
 */
import type { EraDef, EraId } from '@ptp/content';
import { Num } from '../num/index.ts';
import { Rng } from '../rng/index.ts';
import {
  cloneState,
  eraDef,
  eraState,
  firstBoat,
  freshEra,
  type EraState,
  type GameState,
  type RewardKind,
  type Vehicle,
} from '../model/state.ts';
import { costFor, maxAffordable } from '../econ/cost.ts';
import { eraFlow, multiplier, stageRates, tapAmount, visibleArrivals } from '../econ/flow.ts';
import { prestigePreview } from '../prestige/stars.ts';
import {
  APPROACH_S,
  BERTHS,
  BOOST_DURATION_S,
  BOOST_GLIDE_S,
  BOOST_MAX_S,
  LEAVE_S,
  OFFLINE_AD,
  REWARD_LIMITS,
  ROADSTEAD,
  STOCK_BUFFER_S,
  TAP_BONUS_MAX,
  TAP_BONUS_SHARE,
  milestonesReached,
} from '../rules.ts';
import type { Command, Notice, StepContext, StepResult } from './types.ts';

export function step(
  prev: GameState,
  cmds: readonly Command[],
  ctx: StepContext,
): StepResult<GameState> {
  const s = cloneState(prev);
  const notices: Notice[] = [];
  const rng = new Rng(s.rng);
  for (const cmd of cmds) applyCommand(s, cmd, rng, notices);
  if (ctx.dt > 0) {
    advanceBoost(s, ctx.dt);
    for (const era of Object.keys(s.eras) as EraId[]) {
      if (ctx.mode === 'active') advanceActive(s, era, ctx.dt, rng);
      else advanceExpected(s, era, ctx.dt, ctx.tapsPerSecond ?? 0);
      checkUnlocks(s, era, notices);
    }
    s.time += ctx.dt;
  }
  s.rng = rng.state;
  return { state: s, notices };
}

// ---------------------------------------------------------------- Einnahmen + Freischaltung

export function earn(e: EraState, amount: Num): void {
  e.money = e.money.add(amount);
  e.runEarnings = e.runEarnings.add(amount);
  e.lifetimeEarnings = e.lifetimeEarnings.add(amount);
}

export function checkUnlocks(s: GameState, era: EraId, notices: Notice[]): void {
  const def = eraDef(era);
  const e = eraState(s, era);
  for (const b of def.buildings) {
    if (!e.unlocked.includes(b.id) && e.lifetimeEarnings.gte(b.unlockAtLifetime)) {
      e.unlocked.push(b.id);
      notices.push({ ref: 'building.unlocked', args: { era, building: b.id } });
    }
  }
  const goal = def.goal;
  if (!e.unlocked.includes(goal.id) && e.lifetimeEarnings.gte(goal.unlockAtLifetime)) {
    e.unlocked.push(goal.id);
    notices.push({ ref: 'goal.unlocked', args: { era, goal: goal.id } });
  }
}

// ---------------------------------------------------------------- Zeit: aktiv (diskret)

function advanceBoost(s: GameState, dt: number): void {
  const b = s.boost;
  const target = b.remaining > 0 ? 1 : 0;
  const delta = dt / BOOST_GLIDE_S;
  b.level =
    target > b.level ? Math.min(target, b.level + delta) : Math.max(target, b.level - delta);
  b.remaining = Math.max(0, b.remaining - dt);
}

function tierFor(def: EraDef, e: EraState): number {
  const level = e.levels[def.tierBuilding] ?? 0;
  let tier = 0;
  def.vehicles.forEach((v, i) => {
    if (level >= v.fromLevel) tier = i;
  });
  return tier;
}

function stockCap(V: number, dt: number): number {
  return V * (STOCK_BUFFER_S + dt);
}

function advanceActive(s: GameState, era: EraId, dt: number, rng: Rng): void {
  const def = eraDef(era);
  const e = eraState(s, era);
  const r = stageRates(def, e.levels);
  const vis = visibleArrivals(r);

  // Ankünfte: zeitvariabler Poisson-Prozess über verbleibende Exp(1)-Masse.
  if (vis.rate > 0) {
    e.arrivalMass -= vis.rate * dt;
    while (e.arrivalMass <= 0) {
      e.vehicles.push({
        id: s.nextVehicleId++,
        tier: tierFor(def, e),
        load: vis.load,
        cargo: vis.load,
        phase: 'approach',
        t: 0,
        bonusTaps: 0,
        turnedAway: false,
      });
      e.arrivalMass += rng.exp1();
    }
  }

  // Anlegen: freie Liegeplätze in Ankunftsreihenfolge, sonst Reede, sonst abweisen.
  let docked = e.vehicles.filter((v) => v.phase === 'docked').length;
  let waiting = e.vehicles.filter((v) => v.phase === 'waiting').length;
  for (const v of e.vehicles) {
    v.t += dt;
    if (v.phase === 'waiting' && docked < BERTHS) {
      v.phase = 'docked';
      v.t = 0;
      docked++;
      waiting--;
    } else if (v.phase === 'approach' && v.t >= APPROACH_S) {
      v.t = 0;
      if (docked < BERTHS) {
        v.phase = 'docked';
        docked++;
      } else if (waiting < ROADSTEAD) {
        v.phase = 'waiting';
        waiting++;
      } else {
        v.phase = 'leaving';
        v.turnedAway = true;
      }
    }
  }

  // Entladen per Kran in den Lagerpuffer.
  let crane = r.E * dt;
  const cap = stockCap(r.V, dt);
  for (const v of e.vehicles) {
    if (v.phase !== 'docked' || crane <= 0) continue;
    const take = Math.min(v.cargo, crane, Math.max(0, cap - e.stock));
    v.cargo -= take;
    crane -= take;
    e.stock += take;
    if (v.cargo <= 1e-9) departLoaded(e, v);
  }

  // Verkauf aus dem Lager.
  const sold = Math.min(e.stock, r.V * dt);
  if (sold > 0) {
    e.stock -= sold;
    earn(e, Num.of(sold * def.price).mul(multiplier(s, { boost: true })));
  }

  e.vehicles = e.vehicles.filter((v) => !(v.phase === 'leaving' && v.t >= LEAVE_S));
}

function departLoaded(e: EraState, v: Vehicle): void {
  v.cargo = 0;
  v.phase = 'leaving';
  v.t = 0;
  e.served++;
}

// ---------------------------------------------------------------- Zeit: Erwartungswert

function advanceExpected(s: GameState, era: EraId, dt: number, taps: number): void {
  const def = eraDef(era);
  const e = eraState(s, era);
  const f = eraFlow(s, era, { boost: true, tapsPerSecond: taps });
  let income = f.income.mul(dt);
  const vis = visibleArrivals(f);
  const servedPerSec = vis.load > 0 ? f.F / vis.load : 0;
  if (taps > 0 && stageRates(def, e.levels).E > 0) {
    // Bonus-Tipps mit Kran: +1 % des Fahrzeugwerts, höchstens 10 je Fahrzeug (D-032).
    const bonusTaps = Math.min(taps, TAP_BONUS_MAX * servedPerSec);
    const value = vis.load * def.price * multiplier(s, { boost: true });
    income = income.add(bonusTaps * TAP_BONUS_SHARE * value * dt);
  }
  earn(e, income);
  e.served += servedPerSec * dt;
}

// ---------------------------------------------------------------- Commands

function applyCommand(s: GameState, cmd: Command, rng: Rng, notices: Notice[]): void {
  switch (cmd.type) {
    case 'setBuyAmount':
      s.buyAmount = cmd.amount;
      return;
    case 'buy':
      return buy(s, cmd.era, cmd.building, cmd.amount ?? s.buyAmount, notices);
    case 'buildGoal':
      return buildGoal(s, cmd.era, notices);
    case 'tapVehicle':
      return tap(s, cmd.era, cmd.vehicleId, notices);
    case 'unload': {
      const e = s.eras[cmd.era];
      const v = e?.vehicles.find((x) => x.phase === 'docked');
      if (!v) {
        notices.push({ ref: 'tap.denied', args: { era: cmd.era, reason: 'noVehicle' } });
        return;
      }
      return tap(s, cmd.era, v.id, notices);
    }
    case 'resetEra':
      return resetEra(s, cmd.era, rng, notices);
    case 'switchEra':
      if (s.eras[cmd.era]) s.activeEra = cmd.era;
      else notices.push({ ref: 'era.denied', args: { era: cmd.era, reason: 'locked' } });
      return;
    case 'applyReward':
      return applyBoost(s, cmd.day, notices);
    case 'claimOffline': {
      const last = s.lastOffline;
      if (!last) return;
      if (cmd.boosted && !last.doubled && useReward(s, 'offlineDouble', cmd.day, notices)) {
        for (const [era, amount] of Object.entries(last.byEra) as [EraId, Num][]) {
          const e = s.eras[era];
          if (e) earn(e, amount.mul(OFFLINE_AD.factor - 1));
        }
        notices.push({ ref: 'offline.doubled', args: { earned: last.earned.serialize() } });
      }
      s.lastOffline = null;
      return;
    }
  }
}

function buy(
  s: GameState,
  era: EraId,
  id: string,
  amount: GameState['buyAmount'],
  notices: Notice[],
): void {
  const e = s.eras[era];
  const b = e ? eraDef(era).buildings.find((x) => x.id === id) : undefined;
  if (!e || !b) {
    notices.push({ ref: 'buy.denied', args: { era, building: id, reason: 'unknown' } });
    return;
  }
  if (!e.unlocked.includes(id)) {
    notices.push({ ref: 'buy.denied', args: { era, building: id, reason: 'locked' } });
    return;
  }
  const level = e.levels[id] ?? 0;
  const n = amount === 'max' ? maxAffordable(b, level, e.money) : amount;
  const want = Math.max(1, n);
  const cost = costFor(b, level, want);
  if (n < 1 || cost.gt(e.money)) {
    notices.push({
      ref: 'buy.denied',
      args: { era, building: id, reason: 'funds', missing: cost.sub(e.money).serialize() },
    });
    return;
  }
  e.money = e.money.sub(cost);
  const newLevel = level + want;
  e.levels[id] = newLevel;
  notices.push({ ref: 'buy.done', args: { era, building: id, levels: want, level: newLevel } });
  const before = milestonesReached(level);
  const after = milestonesReached(newLevel);
  for (let m = before + 1; m <= after; m++) {
    notices.push({ ref: 'milestone.reached', args: { era, building: id, milestone: m } });
  }
}

function buildGoal(s: GameState, era: EraId, notices: Notice[]): void {
  const e = s.eras[era];
  if (!e) return;
  const goal = eraDef(era).goal;
  if (e.goalBuilt) {
    notices.push({ ref: 'goal.denied', args: { era, reason: 'done' } });
  } else if (!e.unlocked.includes(goal.id)) {
    notices.push({ ref: 'goal.denied', args: { era, reason: 'locked' } });
  } else if (e.money.lt(goal.cost)) {
    const missing = Num.of(goal.cost).sub(e.money).serialize();
    notices.push({ ref: 'goal.denied', args: { era, reason: 'funds', missing } });
  } else {
    e.money = e.money.sub(goal.cost);
    e.goalBuilt = true;
    notices.push({ ref: 'goal.built', args: { era, goal: goal.id } });
  }
}

function tap(s: GameState, era: EraId, vehicleId: number, notices: Notice[]): void {
  const e = s.eras[era];
  const v = e?.vehicles.find((x) => x.id === vehicleId);
  if (!e || !v || v.phase !== 'docked') {
    notices.push({ ref: 'tap.denied', args: { era, reason: 'notDocked' } });
    return;
  }
  const def = eraDef(era);
  const r = stageRates(def, e.levels);
  if (r.E > 0) {
    // Kran entlädt; Tippen ist nur noch Bonus (§2, FR-K03).
    if (v.bonusTaps >= TAP_BONUS_MAX) {
      notices.push({ ref: 'tap.denied', args: { era, reason: 'bonusMax' } });
      return;
    }
    v.bonusTaps++;
    const bonus = Num.of(v.load * TAP_BONUS_SHARE * def.price).mul(multiplier(s, { boost: true }));
    earn(e, bonus);
    notices.push({ ref: 'tap.bonus', args: { era, vehicleId, earned: bonus.serialize() } });
    return;
  }
  const space = Math.max(0, stockCap(r.V, 0) - e.stock);
  const amount = Math.min(v.cargo, tapAmount(v.load), space);
  if (amount <= 0) {
    notices.push({ ref: 'tap.denied', args: { era, reason: 'stockFull' } });
    return;
  }
  v.cargo -= amount;
  e.stock += amount;
  if (v.cargo <= 1e-9) departLoaded(e, v);
  notices.push({ ref: 'tap.unloaded', args: { era, vehicleId, amount } });
}

function resetEra(s: GameState, era: EraId, rng: Rng, notices: Notice[]): void {
  const e = s.eras[era];
  if (!e) return;
  const preview = prestigePreview(s, era);
  if (preview.newStars < 1) {
    notices.push({ ref: 'reset.denied', args: { era, reason: 'noStars' } });
    return;
  }
  const def = eraDef(era);
  const fresh = freshEra(def, rng);
  fresh.lifetimeEarnings = e.lifetimeEarnings;
  fresh.unlocked = e.unlocked;
  fresh.starsEarned = e.starsEarned + preview.newStars;
  fresh.goalBuilt = e.goalBuilt;
  fresh.resets = e.resets + 1;
  fresh.served = e.served;
  fresh.vehicles.push(firstBoat(def, s.nextVehicleId++));
  s.eras[era] = fresh;
  notices.push({ ref: 'era.reset', args: { era, stars: preview.newStars } });
}

/** Verbraucht eine Nutzung des Tageslimits; neuer Tag setzt zurück. */
function useReward(s: GameState, kind: RewardKind, day: number, notices: Notice[]): boolean {
  if (day !== s.rewards.day) s.rewards = { day, used: {} };
  const used = s.rewards.used[kind] ?? 0;
  if (used >= REWARD_LIMITS[kind]) {
    notices.push({ ref: 'reward.denied', args: { kind, reason: 'limit' } });
    return false;
  }
  s.rewards.used[kind] = used + 1;
  return true;
}

function applyBoost(s: GameState, day: number, notices: Notice[]): void {
  const b = s.boost;
  if (b.remaining + BOOST_DURATION_S > BOOST_MAX_S) {
    notices.push({ ref: 'reward.denied', args: { kind: 'boost', reason: 'full' } });
    return;
  }
  if (!useReward(s, 'boost', day, notices)) return;
  b.remaining += BOOST_DURATION_S;
  notices.push({ ref: 'reward.applied', args: { kind: 'boost', remaining: b.remaining } });
}
