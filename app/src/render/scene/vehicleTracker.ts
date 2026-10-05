/**
 * Ordnet Sim-Fahrzeugen Plätze in der Szene zu und interpoliert ihre Bewegung
 * (docs/04 § Szenen-Zustand). Rein kosmetisch: Ankunft, Entladen und Abfahrt entscheidet
 * die Sim (AGENTS Regel 6); hier wird nur gezeigt, wo das Fahrzeug gerade ist.
 */
import type { SceneVehicle } from '@ptp/sim';
import type { Point } from '../assets.ts';
import { BERTHS, EXIT, ROADSTEAD, SPAWN_X } from './harborLayout.ts';

export type SlotKind = 'berth' | 'roadstead';

export interface VehicleVisual {
  id: number;
  tier: string;
  phase: SceneVehicle['phase'];
  x: number;
  y: number;
  facingLeft: boolean;
  slotKind: SlotKind;
  slot: number;
  /** Entladefortschritt 0..1 (liegend). */
  unloaded: number;
}

interface Track {
  slotKind: SlotKind;
  slot: number;
  x: number;
  y: number;
  /** Position beim Beginn der Abfahrt. */
  leaveFrom: Point | null;
}

/** Gleiten bei korrigierten Plätzen: Anteil der Reststrecke je Sekunde. */
const GLIDE = 2.5;

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeIn = (t: number) => t * t;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export class VehicleTracker {
  private readonly tracks = new Map<number, Track>();
  /** Renderzeit, seit der ein Liegeplatz frei ist (frisch verlassene Plätze zuletzt vergeben). */
  private readonly vacated = BERTHS.map(() => Number.NEGATIVE_INFINITY);
  private clock = 0;

  get size(): number {
    return this.tracks.size;
  }

  private slotPos(kind: SlotKind, slot: number): Point {
    return (kind === 'berth' ? BERTHS : ROADSTEAD)[slot]!;
  }

  private taken(kind: SlotKind, except: number): Set<number> {
    const used = new Set<number>();
    for (const [id, t] of this.tracks) if (id !== except && t.slotKind === kind) used.add(t.slot);
    return used;
  }

  private free(kind: SlotKind, except: number): number | undefined {
    const used = this.taken(kind, except);
    const list = kind === 'berth' ? BERTHS : ROADSTEAD;
    let best: number | undefined;
    for (let i = 0; i < list.length; i++) {
      if (used.has(i)) continue;
      // Liegeplätze: der am längsten freie zuerst, damit sich ankommende und ablegende
      // Schiffe nicht überlagern; bei Gleichstand die vordere Reihe.
      if (kind === 'roadstead') return i;
      if (best === undefined || this.vacated[i]! < this.vacated[best]! - 1e-9) best = i;
    }
    return best;
  }

  private assign(t: Track, id: number, want: SlotKind): void {
    if (t.slotKind === want && t.slot >= 0) return;
    const slot = this.free(want, id);
    if (slot !== undefined) {
      t.slotKind = want;
      t.slot = slot;
    } else if (t.slot < 0) {
      // Mehr Fahrzeuge als Plätze (sollte die Sim verhindern): auf Reede-Platz 0 stellen.
      t.slotKind = 'roadstead';
      t.slot = 0;
    }
  }

  /**
   * @param prev Fahrzeuge im Sim-Zustand vor dem letzten Schritt
   * @param curr Fahrzeuge im aktuellen Sim-Zustand
   * @param alpha Anteil des angebrochenen Schritts (Interpolation)
   * @param dt Renderzeit seit dem letzten Aufruf (Gleiten)
   */
  update(
    prev: readonly SceneVehicle[],
    curr: readonly SceneVehicle[],
    alpha: number,
    dt: number,
  ): VehicleVisual[] {
    this.clock += dt;
    const before = new Map(prev.map((p) => [p.id, p]));
    const alive = new Set(curr.map((c) => c.id));
    for (const id of [...this.tracks.keys()]) if (!alive.has(id)) this.tracks.delete(id);

    const out: VehicleVisual[] = [];
    for (const v of curr) {
      let t = this.tracks.get(v.id);
      if (!t) {
        t = { slotKind: 'berth', slot: -1, x: SPAWN_X, y: 0, leaveFrom: null };
        this.tracks.set(v.id, t);
        // Vorhersage: freier Liegeplatz, sonst Reede (die Sim entscheidet beim Anlegen).
        if (v.phase === 'waiting') this.assign(t, v.id, 'roadstead');
        else {
          this.assign(t, v.id, 'berth');
          if (t.slot < 0 || t.slotKind !== 'berth') this.assign(t, v.id, 'roadstead');
        }
        const [, sy] = this.slotPos(t.slotKind, t.slot);
        t.y = sy;
        if (v.phase !== 'approach') [t.x, t.y] = this.slotPos(t.slotKind, t.slot);
      }
      const p = before.get(v.id);
      const progress = p && p.phase === v.phase ? lerp(p.progress, v.progress, alpha) : v.progress;

      if (v.phase === 'docked') this.assign(t, v.id, 'berth');
      else if (v.phase === 'waiting') this.assign(t, v.id, 'roadstead');

      if (v.phase === 'approach') {
        const [tx, ty] = this.slotPos(t.slotKind, t.slot);
        t.x = lerp(SPAWN_X, tx, easeOut(clamp01(progress)));
        t.y = ty;
      } else if (v.phase === 'leaving') {
        if (!t.leaveFrom) {
          t.leaveFrom = [t.x, t.y];
          // Platz freigeben, damit das nächste Fahrzeug ihn bekommt.
          if (t.slotKind === 'berth' && t.slot >= 0) this.vacated[t.slot] = this.clock;
          t.slot = Number.NaN;
        }
        const k = easeIn(clamp01(progress));
        t.x = lerp(t.leaveFrom[0], EXIT[0], k);
        t.y = lerp(t.leaveFrom[1], EXIT[1], k);
      } else {
        const [tx, ty] = this.slotPos(t.slotKind, t.slot);
        const f = Math.min(1, GLIDE * dt);
        t.x = Math.abs(tx - t.x) < 0.5 ? tx : t.x + (tx - t.x) * f;
        t.y = Math.abs(ty - t.y) < 0.5 ? ty : t.y + (ty - t.y) * f;
      }
      out.push({
        id: v.id,
        tier: v.tier,
        phase: v.phase,
        x: t.x,
        y: t.y,
        facingLeft: v.phase !== 'leaving',
        slotKind: t.slotKind,
        slot: t.slot,
        unloaded: v.phase === 'docked' ? v.progress : 0,
      });
    }
    return out;
  }
}
