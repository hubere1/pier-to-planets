import { describe, expect, it } from 'vitest';
import type { SceneVehicle } from '@ptp/sim';
import { BERTHS, EXIT, ROADSTEAD, SPAWN_X } from './harborLayout.ts';
import { VehicleTracker } from './vehicleTracker.ts';

const v = (id: number, phase: SceneVehicle['phase'], progress = 0, extra = {}): SceneVehicle => ({
  id,
  tier: 'fishingBoat',
  phase,
  progress,
  cargo: 10,
  turnedAway: false,
  ...extra,
});

describe('VehicleTracker – Darstellung der Sim-Fahrzeuge (Regel 6)', () => {
  it('Anfahrt: von rechts zum ersten freien Liegeplatz, interpoliert', () => {
    const t = new VehicleTracker();
    const [a] = t.update([v(1, 'approach', 0)], [v(1, 'approach', 0)], 0, 0);
    expect(a!.x).toBe(SPAWN_X);
    expect(a!.y).toBe(BERTHS[0]![1]);
    const [b] = t.update([v(1, 'approach', 0.4)], [v(1, 'approach', 0.6)], 0.5, 0.1);
    // Fortschritt 0,5 zwischen den Sim-Zuständen; Strecke mit Ease-Out.
    expect(b!.x).toBeLessThan(SPAWN_X);
    expect(b!.x).toBeGreaterThan(BERTHS[0]![0]);
    t.update([v(1, 'approach', 1)], [v(1, 'approach', 1)], 0, 0.1);
    const [c] = t.update([v(1, 'approach', 1)], [v(1, 'docked', 0)], 0.3, 0.1);
    expect([c!.x, c!.y]).toEqual(BERTHS[0]);
    expect(c!.facingLeft).toBe(true);
  });

  it('vergibt jedem Fahrzeug einen eigenen Liegeplatz, danach die Reede', () => {
    const t = new VehicleTracker();
    const list = [1, 2, 3, 4, 5].map((id) => v(id, 'approach', 1));
    const out = t.update(list, list, 0, 0);
    const spots = out.map((o) => `${o.slotKind}${o.slot}`);
    expect(new Set(spots).size).toBe(5);
    expect(spots.slice(0, 4).every((s) => s.startsWith('berth'))).toBe(true);
    expect(out[4]!.slotKind).toBe('roadstead');
  });

  it('Sim weicht von der Vorhersage ab: Fahrzeug gleitet zum richtigen Platz', () => {
    const t = new VehicleTracker();
    t.update([v(1, 'approach', 1)], [v(1, 'approach', 1)], 0, 0);
    const [w] = t.update([v(1, 'waiting')], [v(1, 'waiting')], 0, 0.1);
    expect(w!.slotKind).toBe('roadstead');
    // Gleitet, springt nicht.
    expect(w!.x).not.toBe(ROADSTEAD[0]![0]);
    let last = w!;
    for (let i = 0; i < 100; i++) last = t.update([v(1, 'waiting')], [v(1, 'waiting')], 0, 0.1)[0]!;
    expect([last.x, last.y]).toEqual(ROADSTEAD[0]);
  });

  it('Abfahrt gibt den Liegeplatz frei und fährt Richtung offene See', () => {
    const t = new VehicleTracker();
    t.update([v(1, 'docked')], [v(1, 'docked')], 0, 0);
    const [a] = t.update([v(1, 'leaving', 1)], [v(1, 'leaving', 1)], 0, 0.1);
    expect([a!.x, a!.y]).toEqual(EXIT);
    expect(a!.facingLeft).toBe(false);
    // Der frisch verlassene Platz kommt zuletzt dran (kein Überlagern beim Ablegen) …
    const next = [2, 3, 4, 5].map((id) => v(id, 'approach', 0));
    const out = t.update(next, next, 0, 0.1);
    expect(out[0]!.slot).not.toBe(0);
    // … ist aber frei: das vierte neue Schiff bekommt ihn.
    expect(out.map((o) => o.slot).sort()).toEqual([0, 1, 2, 3]);
  });

  it('vergisst Fahrzeuge, die die Sim entfernt hat', () => {
    const t = new VehicleTracker();
    t.update([v(1, 'docked')], [v(1, 'docked')], 0, 0);
    expect(t.update([], [], 0, 0.1)).toEqual([]);
    expect(t.size).toBe(0);
  });
});
