/**
 * Spielsitzung: Takt, Commands, Autosave, Lifecycle (docs/04 § Takt und Lifecycle, FR-X01).
 * Einzige Stelle, die den Sim-Zustand der App hält. Die Sim bleibt rein; Wanduhr und Dateien
 * kommen über die Plattform-Interfaces.
 */
import { signal, type Signal } from '@preact/signals';
import {
  chooseSave,
  DT,
  newGame,
  offline,
  OFFLINE_MIN_S,
  serializeSave,
  step,
  type Command,
  type GameState,
  type Notice,
} from '@ptp/sim';
import type { Clock } from '../platform/clock.ts';
import type { SaveStore } from '../platform/saveStore.ts';

export interface SessionDeps {
  clock: Clock;
  store: SaveStore;
  appVersion: string;
}

export interface LoadInfo {
  source: 'main' | 'backup' | 'none';
  /** Spielstand stammt aus einer neueren App: lesen ja, speichern nie (docs/04 § Save). */
  newerVersion: boolean;
}

/** Höchstens so viele Sim-Schritte je Frame; der Rest verfällt (Ruckler). */
const MAX_STEPS_PER_FRAME = 10;
/** Längere Lücken zwischen zwei Frames gelten als Abwesenheit (nahtlos nachholen). */
const GAP_MS = 1000;
const AUTOSAVE_MS = 10_000;
const SAVE_FAIL_NOTICE_AFTER = 3;
/** Nach diesen Notices sofort speichern (FR-X01: nach jedem Kauf). */
const SAVE_AFTER = new Set(['buy.done', 'goal.built', 'era.reset', 'reward.applied']);

type Listener = (notices: readonly Notice[]) => void;

export class GameSession {
  readonly state: Signal<GameState>;
  /** Zustand vor dem letzten Schritt, für die Interpolation im Renderer. */
  prev: GameState;
  /** Anteil des angebrochenen Schritts 0..1. */
  alpha = 0;
  readonly load: LoadInfo;

  private acc = 0;
  private lastWall: number;
  private lastSave: number;
  private paused = false;
  private readonly listeners = new Set<Listener>();
  private saving: Promise<void> | null = null;
  private saveAgain = false;
  private failures = 0;

  private constructor(
    private readonly deps: SessionDeps,
    state: GameState,
    load: LoadInfo,
    savedAtWallMs: number,
  ) {
    this.state = signal(state);
    this.prev = state;
    this.load = load;
    this.lastWall = savedAtWallMs;
    this.lastSave = deps.clock.now();
  }

  static async start(deps: SessionDeps): Promise<GameSession> {
    const files = await deps.store.read();
    const choice = chooseSave(files);
    const now = deps.clock.now();
    for (const which of choice.quarantine) await deps.store.quarantine(which, now);
    const state = choice.state ?? newGame(now % 2 ** 32);
    const savedAt = choice.state && choice.header ? choice.header.savedAtWallMs : now;
    const session = new GameSession(
      deps,
      state,
      {
        source: choice.state ? choice.source : 'none',
        newerVersion: choice.newerVersion,
      },
      savedAt,
    );
    // Abwesenheit seit dem letzten Speichern sofort verrechnen (Rückkehr-Dialog beim Start).
    session.catchUp();
    return session;
  }

  onNotices(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Lokaler Tag für Commands mit Tageslimit. */
  day(): number {
    return this.deps.clock.localDay();
  }

  dispatch(cmd: Command): Notice[] {
    const r = step(this.state.value, [cmd], { dt: 0, mode: 'active' });
    this.prev = r.state;
    this.state.value = r.state;
    this.emit(r.notices);
    return r.notices;
  }

  /** Einmal je Animations-Frame aufrufen. */
  frame(): void {
    if (this.paused) return;
    const now = this.deps.clock.now();
    const elapsed = now - this.lastWall;
    if (elapsed > GAP_MS) {
      this.catchUp();
    } else if (elapsed > 0) {
      this.lastWall = now;
      this.acc += elapsed / 1000;
      let s = this.state.value;
      let prev = this.prev;
      const notices: Notice[] = [];
      let steps = 0;
      while (this.acc >= DT - 1e-9 && steps < MAX_STEPS_PER_FRAME) {
        prev = s;
        const r = step(s, [], { dt: DT, mode: 'active' });
        s = r.state;
        notices.push(...r.notices);
        this.acc -= DT;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.acc = Math.min(this.acc, DT);
      this.acc = Math.max(0, this.acc);
      if (steps > 0) {
        this.prev = prev;
        this.state.value = s;
        this.emit(notices);
      }
      this.alpha = Math.min(1, this.acc / DT);
    } else {
      // Uhr rückwärts oder gleiche Zeit: nichts nachholen.
      this.lastWall = now;
    }
    if (now - this.lastSave >= AUTOSAVE_MS) void this.save();
  }

  /** App geht in den Hintergrund: Zeit merken, speichern, Takt anhalten. */
  async pause(): Promise<void> {
    this.paused = true;
    this.lastWall = this.deps.clock.now();
    await this.save();
  }

  /** App kommt zurück: < 60 s nahtlos nachholen, sonst offline() + Rückkehr-Dialog. */
  resume(): void {
    this.paused = false;
    this.catchUp();
  }

  /** Verrechnet die Zeit seit `lastWall` am Stück. */
  private catchUp(): void {
    const now = this.deps.clock.now();
    const seconds = (now - this.lastWall) / 1000;
    this.lastWall = now;
    this.acc = 0;
    this.alpha = 0;
    if (!(seconds > 0)) return;
    if (seconds >= OFFLINE_MIN_S) {
      const r = offline(this.state.value, seconds);
      this.prev = r.state;
      this.state.value = r.state;
      this.emit(r.notices);
      void this.save();
      return;
    }
    let s = this.state.value;
    const notices: Notice[] = [];
    for (let i = Math.round(seconds / DT); i > 0; i--) {
      const r = step(s, [], { dt: DT, mode: 'active' });
      s = r.state;
      notices.push(...r.notices);
    }
    this.prev = s;
    this.state.value = s;
    this.emit(notices);
  }

  /** Speichert den aktuellen Stand; parallele Aufrufe werden zusammengefasst. */
  save(): Promise<void> {
    if (this.load.newerVersion) return Promise.resolve();
    if (this.saving) {
      this.saveAgain = true;
      return this.saving;
    }
    this.saving = this.writeLoop().finally(() => (this.saving = null));
    return this.saving;
  }

  /** Wartet, bis alle laufenden Speichervorgänge fertig sind (Tests, Pause). */
  async idle(): Promise<void> {
    while (this.saving) await this.saving;
  }

  private async writeLoop(): Promise<void> {
    do {
      this.saveAgain = false;
      const now = this.deps.clock.now();
      this.lastSave = now;
      const text = serializeSave(this.state.value, {
        savedAtWallMs: now,
        appVersion: this.deps.appVersion,
      });
      try {
        await this.deps.store.write(text);
        this.failures = 0;
      } catch {
        this.failures++;
        if (this.failures === SAVE_FAIL_NOTICE_AFTER) {
          this.emit([{ ref: 'save.failed', args: { attempts: this.failures } }]);
        }
      }
    } while (this.saveAgain);
  }

  private emit(notices: readonly Notice[]): void {
    if (notices.length === 0) return;
    for (const l of this.listeners) l(notices);
    if (notices.some((n) => SAVE_AFTER.has(n.ref))) void this.save();
  }
}
