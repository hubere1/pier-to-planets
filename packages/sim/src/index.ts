/**
 * Pier to Planets – Simulation (rein, deterministisch, ohne IO).
 * Vertrag: docs/04-architecture.md § Kernvertrag der Simulation.
 */
export { Num, type NumLike } from './num/index.ts';
export { Rng, seedRng } from './rng/index.ts';
export * from './rules.ts';
export {
  newGame,
  totalStars,
  type BuyAmount,
  type EraState,
  type GameState,
  type Vehicle,
  type VehiclePhase,
} from './model/state.ts';
export { step } from './engine/step.ts';
export type { Command, Notice, NoticeArgs, StepContext, StepResult } from './engine/types.ts';
export { eraFlow, multiplier, stageRates, type EraFlow, type StageRates } from './econ/flow.ts';
export { purchaseOptions, type Bottleneck, type PurchaseOption } from './econ/bottleneck.ts';
export { offline, countedSeconds, type OfflinePreview } from './offline/offline.ts';
export { starsPossible, type PrestigePreview } from './prestige/stars.ts';
export * from './views/index.ts';
export { SAVE_SCHEMA_VERSION, type SaveHeader } from './save/schema.ts';
export {
  chooseSave,
  loadSave,
  serializeSave,
  type LoadResult,
  type SaveChoice,
} from './save/serialize.ts';
