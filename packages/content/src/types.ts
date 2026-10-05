/**
 * Datentypen der Inhalte (docs/03 §2–§5). Formeln liegen in `packages/sim`,
 * hier stehen nur Zahlen und IDs. Werte mit (A) sind Annahmen, belegt durch `bin/simulate.ts`.
 */

/** Stufe der Kette (docs/03 §2): Ankunft `A`, Entladen `E`, Absatz `V`. */
export type FlowStage = 'arrival' | 'unload' | 'sales';

/**
 * Wirkung einer Gebäudestufe (docs/03 §3: linear je Stufe, Meilensteine ×2).
 * - `vehicles`: +Fahrzeuge/s (Ankunftsrate λ)
 * - `vehiclesPct`: +Anteil auf λ
 * - `loadPct`: +Anteil auf die Ladung je Fahrzeug
 * - `goods`: +Waren/s auf die eigene Stufe (Entladen oder Absatz)
 */
export type EffectKind = 'vehicles' | 'vehiclesPct' | 'loadPct' | 'goods';

export interface BuildingDef {
  readonly id: string;
  readonly stage: FlowStage;
  readonly effect: EffectKind;
  /** Wirkung je Stufe vor Meilenstein-Verdopplung. */
  readonly perLevel: number;
  /** Kosten von Stufe 0 → 1 in Ära-Währung. */
  readonly baseCost: number;
  /** Kostenwachstum je Stufe, ∈ [1,07; 1,15] (docs/03 §3). */
  readonly growth: number;
  /** Stufe nach Spielstart und nach jedem Ära-Neustart. */
  readonly startLevel: number;
  /** Freischaltung, sobald die Lebenseinnahmen der Ära diesen Wert erreichen (0 = sofort). */
  readonly unlockAtLifetime: number;
}

export interface VehicleTierDef {
  readonly id: string;
  /** Ware für Anzeige und Szene; Wert je Einheit regelt `EraDef.price`. */
  readonly good: string;
  /** Ab so vielen erreichten Meilensteinen des Tier-Gebäudes (Werft) fährt diese Stufe. */
  readonly fromMilestones: number;
}

export interface GoalDef {
  readonly id: string;
  readonly cost: number;
  /** Erst sichtbar als Silhouette, kaufbar ab diesen Lebenseinnahmen. */
  readonly unlockAtLifetime: number;
}

export interface EraDef {
  readonly id: string;
  /** l10n-Schlüssel der Währung (`currency.<id>`), D-006. */
  readonly currency: string;
  /** Erlös je Ware vor Multiplikatoren. */
  readonly price: number;
  /** Ladung eines Fahrzeugs vor Werft-Bonus (Waren). */
  readonly loadBase: number;
  readonly buildings: readonly BuildingDef[];
  /** Gebäude, dessen Meilensteine die Fahrzeugstufe bestimmen. */
  readonly tierBuilding: string;
  readonly vehicles: readonly VehicleTierDef[];
  readonly goal: GoalDef;
  /** Schwelle der Sterne-Formel (docs/03 §4.1). */
  readonly starThreshold: number;
}
