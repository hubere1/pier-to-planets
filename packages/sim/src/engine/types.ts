/**
 * Commands und Notices (docs/04 § Kernvertrag). Commands verbrauchen keine Zeit (Lehre 2).
 * Notices tragen immer `ref` + `args`; die App übersetzt sie (AGENTS Regel 13).
 */
import type { EraId } from '@ptp/content';
import type { BuyAmount } from '../model/state.ts';

export type Command =
  | { type: 'buy'; era: EraId; building: string; amount?: BuyAmount }
  | { type: 'buildGoal'; era: EraId }
  | { type: 'tapVehicle'; era: EraId; vehicleId: number }
  /** A11y-Knopf „Entladen“: tippt das erste liegende Fahrzeug an (§2). */
  | { type: 'unload'; era: EraId }
  | { type: 'setBuyAmount'; amount: BuyAmount }
  | { type: 'resetEra'; era: EraId }
  | { type: 'switchEra'; era: EraId }
  /** Nur nach echtem `onUserEarnedReward` senden (Regel 14). `day` = lokaler Tag vom Gerät. */
  | { type: 'applyReward'; kind: 'boost'; day: number }
  /** Rückkehr-Dialog schließen; `boosted` nur nach Werbe-Belohnung (×2, §10). */
  | { type: 'claimOffline'; boosted: boolean; day: number };

export type NoticeArgs = Readonly<Record<string, string | number>>;

export interface Notice {
  ref: string;
  args: NoticeArgs;
}

export interface StepContext {
  /** Sekunden Spielzeit dieses Schritts (0 = nur Commands anwenden). */
  dt: number;
  /**
   * `active`: diskrete Fahrzeuge (Szene). `offline`: Erwartungswert über F ohne Fahrzeuge,
   * für das Sim-Skript (docs/03 §2); Abwesenheit läuft über `offline()`.
   */
  mode: 'active' | 'offline';
  /** Nur `offline`-Modus: gleichmäßiges Tippen je Sekunde (Spieler-Policy). */
  tapsPerSecond?: number;
}

export interface StepResult<S> {
  state: S;
  notices: Notice[];
}
