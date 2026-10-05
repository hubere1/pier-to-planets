import { describe, expect, it } from 'vitest';
import fixtureV1 from './fixtures/save-v1-harbor.json';
import { Num } from '../src/num/index.ts';
import { newGame, type GameState } from '../src/model/state.ts';
import { step } from '../src/engine/step.ts';
import { offline } from '../src/offline/offline.ts';
import { sha256Hex } from '../src/save/sha256.ts';
import { migrate, type Migration } from '../src/save/migrate.ts';
import { SAVE_SCHEMA_VERSION } from '../src/save/schema.ts';
import {
  chooseSave,
  decodeState,
  encodeState,
  loadSave,
  serializeSave,
} from '../src/save/serialize.ts';

const meta = { savedAtWallMs: 1_791_187_200_000, appVersion: '0.1.0' };

function played(): GameState {
  let s = newGame(11);
  s.eras.harbor!.money = Num.of('4.2e15');
  s = step(s, [{ type: 'buy', era: 'harbor', building: 'crane', amount: 10 }], {
    dt: 0,
    mode: 'active',
  }).state;
  for (let i = 0; i < 300; i++) s = step(s, [], { dt: 0.1, mode: 'active' }).state;
  return offline(s, 600).state;
}

describe('SHA-256 (Save-Prüfsumme)', () => {
  it('stimmt mit Referenzwerten überein, auch für Umlaute und Emoji', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256Hex('Taler ÄÖÜß € 🚢')).toBe(
      'b7d22cd2dd1fa0d1ec6f57109cc27d8a44afeccbad5716f1b8d753806615549b',
    );
    expect(sha256Hex('a'.repeat(1000))).toBe(
      '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3',
    );
  });
});

describe('Save (docs/04 § Save, FR-X02, Regel 9)', () => {
  it('Schema-Version ist 1', () => {
    expect(SAVE_SCHEMA_VERSION).toBe(1);
  });

  it('Rundreise erhält den Zustand vollständig', () => {
    const s = played();
    const r = loadSave(serializeSave(s, meta));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(JSON.stringify(encodeState(r.state))).toBe(JSON.stringify(encodeState(s)));
    expect(r.header).toMatchObject({ schemaVersion: 1, ...meta });
  });

  it('nach dem Laden läuft die Sim identisch weiter (Rng im Save)', () => {
    const s = played();
    const r = loadSave(serializeSave(s, meta));
    if (!r.ok) throw new Error('load');
    let a = s;
    let b = r.state;
    for (let i = 0; i < 600; i++) {
      a = step(a, [], { dt: 0.1, mode: 'active' }).state;
      b = step(b, [], { dt: 0.1, mode: 'active' }).state;
    }
    expect(JSON.stringify(encodeState(b))).toBe(JSON.stringify(encodeState(a)));
  });

  it('erkennt Manipulation und Beschädigung', () => {
    const text = serializeSave(played(), meta);
    expect(loadSave(text.replace('"pier":1', '"pier":99'))).toMatchObject({
      ok: false,
      reason: 'checksum',
    });
    expect(loadSave(text.slice(0, 100))).toMatchObject({ ok: false, reason: 'parse' });
    expect(loadSave('{"schemaVersion":1}')).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('neuere Version: nicht laden, nichts anfassen', () => {
    const file = JSON.parse(serializeSave(newGame(1), meta));
    file.schemaVersion = SAVE_SCHEMA_VERSION + 1;
    const choice = chooseSave({
      main: JSON.stringify(file),
      backup: serializeSave(newGame(2), meta),
    });
    expect(choice).toMatchObject({ state: null, newerVersion: true, quarantine: [] });
  });

  it('lädt save.json, sonst save.bak, und meldet defekte Dateien zur Quarantäne', () => {
    const good = serializeSave(played(), meta);
    expect(chooseSave({ main: good, backup: null })).toMatchObject({ source: 'main' });
    const fallback = chooseSave({ main: '{kaputt', backup: good });
    expect(fallback.source).toBe('backup');
    expect(fallback.quarantine).toEqual(['main']);
    expect(fallback.state).not.toBeNull();
    expect(chooseSave({ main: 'x', backup: 'y' })).toMatchObject({
      source: 'none',
      state: null,
      quarantine: ['main', 'backup'],
    });
    expect(chooseSave({})).toMatchObject({ source: 'none', quarantine: [] });
  });

  it('liest tolerant: fehlende und falsche Felder bekommen Startwerte', () => {
    const s = decodeState({
      eras: { harbor: { money: '1.5e3', levels: { pier: 7, crane: 'drei' }, vehicles: [{}] } },
      buyAmount: 7,
      unbekannt: true,
    });
    const h = s.eras.harbor!;
    expect(h.money.toNumber()).toBe(1500);
    expect(h.levels.pier).toBe(7);
    expect(h.levels.crane).toBe(0);
    expect(h.levels.warehouse).toBe(1);
    expect(h.vehicles).toEqual([]);
    expect(h.unlocked).toContain('pier');
    expect(s.buyAmount).toBe(1);
    expect(s.boost).toEqual({ remaining: 0, level: 0 });
    expect(s.rewards).toEqual({ day: 0, used: {} });
    expect(decodeState({}).eras.harbor).toBeDefined();
  });

  it('Fixture: echter Schema-1-Spielstand lädt weiterhin (Regel 9)', () => {
    const r = loadSave(JSON.stringify(fixtureV1));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const h = r.state.eras.harbor!;
    expect(h.levels).toMatchObject({ pier: 42, crane: 31, warehouse: 45 });
    expect(r.state.rewards).toEqual({ day: 20366, used: { boost: 1 } });
    expect(r.state.boost.remaining).toBeGreaterThan(1500);
    expect(h.money.toNumber()).toBeGreaterThan(0);
    expect(r.state.lastOffline?.counted).toBe(1800);
    const next = step(r.state, [], { dt: 0.1, mode: 'active' });
    expect(next.state.time).toBeGreaterThan(r.state.time);
  });
});

describe('Migrations-Gerüst', () => {
  it('ohne Versionssprung unverändert', () => {
    const p = { a: 1 };
    expect(migrate(p, SAVE_SCHEMA_VERSION)).toBe(p);
  });

  it('führt Migrationen der Reihe nach aus und bricht bei Lücken ab', () => {
    const steps: Record<number, Migration> = {
      1: (p) => ({ ...p, v2: true }),
      2: (p) => ({ ...p, v3: p.v2 === true }),
    };
    expect(migrate({}, 1, 3, steps)).toEqual({ v2: true, v3: true });
    expect(() => migrate({}, 1, 4, steps)).toThrow(/Schema 3/);
  });
});
