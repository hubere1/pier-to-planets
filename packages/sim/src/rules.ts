/**
 * Ära-übergreifende Spielregeln als Konstanten. Jede Zahl verweist auf docs/03;
 * Werte mit (A) sind Annahmen, Änderungen gehen über Decision-Log + Balancing-Gate.
 */

/** Sim-Takt 10 Hz (§1). */
export const DT = 0.1;

/** Meilensteine 10/25/50/100/200/300 … (§3). */
const FIRST_MILESTONES = [10, 25, 50, 100] as const;
/** Wirkung ×2 je Meilenstein (§3, A). */
export const MILESTONE_FACTOR = 2;

export function milestonesReached(level: number): number {
  let n = 0;
  for (const m of FIRST_MILESTONES) if (level >= m) n++;
  if (level >= 200) n += Math.floor(level / 100) - 1;
  return n;
}

/** Nächster Meilenstein über `level` (für Fortschrittsbalken, §3). */
export function nextMilestone(level: number): number {
  for (const m of FIRST_MILESTONES) if (level < m) return m;
  return (Math.floor(level / 100) + 1) * 100;
}

/** Vorheriger erreichter Meilenstein (0, wenn keiner). */
export function previousMilestone(level: number): number {
  let prev = 0;
  for (const m of FIRST_MILESTONES) if (level >= m) prev = m;
  if (level >= 200) prev = Math.floor(level / 100) * 100;
  return prev;
}

/** Tippen: 5 % der Ladung, mindestens 1 Ware (§2, A). */
export const TAP_SHARE = 0.05;
export const TAP_MIN = 1;
/** Mit Kran: +1 % des Fahrzeugwerts je Tipp (§2, A), höchstens 10 Tipps je Fahrzeug (D-032). */
export const TAP_BONUS_SHARE = 0.01;
export const TAP_BONUS_MAX = 10;

/** Darstellung der Fahrzeuge (D-032): reine Optik, Mittelwert bleibt `A`. */
export const BERTHS = 4;
/** Wartende Fahrzeuge auf Reede; erst darüber wird abgewiesen. */
export const ROADSTEAD = 4;
export const APPROACH_S = 6;
export const LEAVE_S = 5;
/** Höchstens so viele Ankünfte/s werden als einzelne Fahrzeuge gezeigt; darüber wächst die Ladung. */
export const VISIBLE_ARRIVALS_MAX = 0.25;
/** Lagerpuffer zwischen Entladen und Verkauf: so viele Sekunden Absatz. */
export const STOCK_BUFFER_S = 20;

/** Sterne (§4.1, A). */
export const STAR_FACTOR = 10;
export const STAR_EXPONENT = 0.5;
export const STAR_BONUS = 0.1;

/** Offline (§7, D-008). */
export const OFFLINE_MIN_S = 60;
export const OFFLINE_CAP_S = 4 * 3600;
export const OFFLINE_EFFICIENCY = 0.5;
export const OFFLINE_MAX_JUMP_S = 30 * 86_400;

/** Werbe-Boost (§10, A): ×2 für 30 Min, stapelt bis 4 h Restzeit, 6/Tag, gleitet in 2 s. */
export const BOOST_FACTOR = 2;
export const BOOST_DURATION_S = 30 * 60;
export const BOOST_MAX_S = 4 * 3600;
export const BOOST_PER_DAY = 6;
export const BOOST_GLIDE_S = 2;
