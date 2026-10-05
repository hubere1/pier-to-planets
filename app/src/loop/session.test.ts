import { describe, expect, it } from 'vitest';
import { loadSave, newGame, serializeSave, type Notice } from '@ptp/sim';
import { FakeClock } from '../platform/clock.ts';
import { MemoryFiles } from '../platform/files.ts';
import { FileSaveStore } from '../platform/saveStore.ts';
import { GameSession } from './session.ts';

async function setup(files = new MemoryFiles(), clock = new FakeClock()) {
  const store = new FileSaveStore(files);
  const session = await GameSession.start({ clock, store, appVersion: 'test' });
  return { session, clock, files, store };
}

/** Lässt die Wanduhr in Frames à 16 ms laufen. */
function run(session: GameSession, clock: FakeClock, seconds: number): void {
  for (let t = 0; t < seconds * 1000; t += 16) {
    clock.advance(16);
    session.frame();
  }
}

describe('GameSession – Takt (docs/04 § Takt und Lifecycle)', () => {
  it('startet ein neues Spiel, wenn kein Spielstand existiert', async () => {
    const { session } = await setup();
    expect(session.load.source).toBe('none');
    expect(session.state.value.time).toBe(0);
    expect(session.state.value.eras.harbor?.vehicles).toHaveLength(1);
  });

  it('feste Schritte à 0,1 s: 1 s Wanduhr = 1 s Sim', async () => {
    const { session, clock } = await setup();
    run(session, clock, 1);
    expect(session.state.value.time).toBeCloseTo(1, 1);
  });

  it('Ruckler: höchstens 10 Schritte je Frame, der Rest verfällt', async () => {
    const { session, clock } = await setup();
    clock.advance(900);
    session.frame();
    expect(session.state.value.time).toBeCloseTo(0.9, 5);
    clock.advance(1);
    session.frame();
    // 0,9 s auf einmal ergibt 9 Schritte; nie mehr als 10 je Frame.
    expect(session.state.value.time).toBeLessThanOrEqual(1.0 + 1e-9);
  });

  it('Interpolation: alpha zwischen 0 und 1, prev ist der Zustand davor', async () => {
    const { session, clock } = await setup();
    clock.advance(150);
    session.frame();
    expect(session.state.value.time).toBeCloseTo(0.1, 5);
    expect(session.prev.time).toBeCloseTo(0, 5);
    expect(session.alpha).toBeCloseTo(0.5, 5);
  });

  it('Commands verbrauchen keine Zeit und liefern Notices', async () => {
    const { session } = await setup();
    const heard: Notice[] = [];
    session.onNotices((n) => heard.push(...n));
    const notices = session.dispatch({ type: 'setBuyAmount', amount: 10 });
    expect(notices).toEqual([]);
    expect(session.state.value.buyAmount).toBe(10);
    expect(session.state.value.time).toBe(0);
    session.dispatch({ type: 'buy', era: 'harbor', building: 'crane' });
    expect(heard.map((n) => n.ref)).toEqual(['buy.denied']);
  });
});

describe('GameSession – Speichern (FR-X01)', () => {
  it('Autosave alle 10 s', async () => {
    const { session, clock, files } = await setup();
    const start = clock.ms;
    run(session, clock, 9);
    await session.idle();
    expect(files.get('save.json')).toBeUndefined();
    run(session, clock, 1.1);
    await session.idle();
    const r = loadSave(files.get('save.json')!);
    expect(r.ok).toBe(true);
    expect(r.ok && r.header.savedAtWallMs).toBe(start + 10_000);
  });

  it('speichert nach jedem Kauf', async () => {
    const { session, files } = await setup();
    const s = session.state.value;
    // Geld geben, damit der Kauf gelingt (Startzustand eines alten Stands).
    s.eras.harbor!.money = s.eras.harbor!.money.add(1000);
    session.dispatch({ type: 'buy', era: 'harbor', building: 'pier' });
    await session.idle();
    const r = loadSave(files.get('save.json')!);
    expect(r.ok && r.state.eras.harbor?.levels['pier']).toBe(2);
  });

  it('speichert bei pause und lädt denselben Stand wieder', async () => {
    const { session, clock, files } = await setup();
    run(session, clock, 3);
    await session.pause();
    const again = await setup(files, clock);
    expect(again.session.load.source).toBe('main');
    expect(again.session.state.value.time).toBeCloseTo(session.state.value.time, 5);
  });

  it('nach 3 Fehlschlägen in Folge meldet die Sitzung den Fehler', async () => {
    const { session, files } = await setup();
    const heard: string[] = [];
    session.onNotices((n) => heard.push(...n.map((x) => x.ref)));
    files.failOn = 'write:save.tmp';
    for (let i = 0; i < 3; i++) await session.save();
    expect(heard.filter((r) => r === 'save.failed')).toHaveLength(1);
    files.failOn = undefined;
    await session.save();
    expect(files.get('save.json')).toBeDefined();
  });

  it('defekter Spielstand: Sicherung wird geladen, defekte Datei verschoben', async () => {
    const files = new MemoryFiles();
    const clock = new FakeClock();
    const good = newGame(7);
    good.time = 42;
    await files.write(
      'save.bak',
      serializeSave(good, { savedAtWallMs: clock.ms, appVersion: 'x' }),
    );
    await files.write('save.json', '{kaputt');
    const { session } = await setup(files, clock);
    expect(session.load.source).toBe('backup');
    expect(session.state.value.time).toBeCloseTo(42, 5);
    expect(files.names().some((n) => n.startsWith('corrupt_'))).toBe(true);
  });

  it('Spielstand einer neueren App: nur lesen, nie überschreiben', async () => {
    const files = new MemoryFiles();
    const newer = JSON.stringify({ schemaVersion: 999, checksum: '', payload: {} });
    await files.write('save.json', newer);
    const { session, clock } = await setup(files);
    expect(session.load.newerVersion).toBe(true);
    run(session, clock, 11);
    await session.pause();
    expect(files.get('save.json')).toBe(newer);
  });
});

describe('GameSession – Lifecycle (docs/03 §7)', () => {
  it('unter 60 s Abwesenheit holt die Sim nahtlos nach, ohne Rückkehr-Dialog', async () => {
    const { session, clock } = await setup();
    await session.pause();
    clock.advance(30_000);
    session.resume();
    expect(session.state.value.time).toBeCloseTo(30, 1);
    expect(session.state.value.lastOffline).toBeNull();
  });

  it('ab 60 s rechnet offline() und öffnet den Rückkehr-Dialog', async () => {
    const { session, clock } = await setup();
    await session.pause();
    clock.advance(2 * 3600_000);
    session.resume();
    const lo = session.state.value.lastOffline;
    expect(lo?.seconds).toBeCloseTo(7200, 0);
    session.dispatch({ type: 'claimOffline', boosted: false, day: clock.localDay() });
    expect(session.state.value.lastOffline).toBeNull();
  });

  it('Kaltstart nach langer Pause: Abwesenheit seit savedAtWallMs zählt', async () => {
    const { session, clock, files } = await setup();
    await session.pause();
    clock.advance(5 * 60_000);
    const again = await setup(files, clock);
    expect(again.session.state.value.lastOffline?.seconds).toBeCloseTo(300, 0);
  });

  it('Uhr zurückgestellt: kein Ertrag, kein Fehler', async () => {
    const { session, clock } = await setup();
    await session.pause();
    clock.advance(-3600_000);
    session.resume();
    expect(session.state.value.lastOffline).toBeNull();
    run(session, clock, 1);
    expect(session.state.value.time).toBeCloseTo(1, 1);
  });

  it('im Hintergrund läuft keine Zeit über frame()', async () => {
    const { session, clock } = await setup();
    await session.pause();
    clock.advance(500);
    session.frame();
    expect(session.state.value.time).toBe(0);
  });
});
