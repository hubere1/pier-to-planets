import { describe, expect, it } from 'vitest';
import { ERA_IDS, ERAS, harbor } from '../src/index.ts';

describe('ERA_IDS (docs/03 §5)', () => {
  it('enthält die sechs Ären in fester Reihenfolge', () => {
    expect(ERA_IDS).toEqual(['harbor', 'airport', 'rocket', 'moon', 'mars', 'belt']);
  });
});

describe('Ära 1 Hafen (docs/03 §5, FR-P01)', () => {
  it('hat 7 Gebäude plus Ziel-Gebäude Raumhafen-Anleger', () => {
    expect(harbor.buildings.map((b) => b.id)).toEqual([
      'pier',
      'crane',
      'warehouse',
      'fishMarket',
      'lighthouse',
      'shipyard',
      'customs',
    ]);
    expect(harbor.goal.id).toBe('spaceportPier');
  });

  it('hat 4 Fahrzeugstufen mit steigender Meilenstein-Schwelle', () => {
    expect(harbor.vehicles.map((v) => v.id)).toEqual([
      'fishingBoat',
      'cutter',
      'freighter',
      'containerShip',
    ]);
    const steps = harbor.vehicles.map((v) => v.fromMilestones);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(steps[0]).toBe(0);
  });

  it('hält Kostenwachstum in [1,07; 1,15] und positive Werte (docs/03 §3)', () => {
    for (const b of harbor.buildings) {
      expect(b.growth, b.id).toBeGreaterThanOrEqual(1.07);
      expect(b.growth, b.id).toBeLessThanOrEqual(1.15);
      expect(b.baseCost, b.id).toBeGreaterThan(0);
      expect(b.perLevel, b.id).toBeGreaterThan(0);
    }
  });

  it('deckt jede Stufe der Kette ab und startet mit Fluss ungleich null (Tippen ersetzt den Kran)', () => {
    const stages = new Set(harbor.buildings.map((b) => b.stage));
    expect(stages).toEqual(new Set(['arrival', 'unload', 'sales']));
    const started = harbor.buildings.filter((b) => b.startLevel > 0).map((b) => b.id);
    expect(started).toContain('pier');
    expect(started).toContain('warehouse');
    expect(harbor.buildings.find((b) => b.id === 'crane')?.startLevel).toBe(0);
  });

  it('hat eindeutige IDs und ein vorhandenes Tier-Gebäude', () => {
    const ids = harbor.buildings.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(harbor.tierBuilding);
  });

  it('ist in ERAS registriert', () => {
    expect(ERAS.harbor).toBe(harbor);
  });
});
