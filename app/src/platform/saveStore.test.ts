import { describe, expect, it } from 'vitest';
import { MemoryFiles } from './files.ts';
import { FileSaveStore } from './saveStore.ts';

describe('FileSaveStore (docs/04 § Save)', () => {
  it('liest nichts, solange kein Spielstand existiert', async () => {
    const store = new FileSaveStore(new MemoryFiles());
    expect(await store.read()).toEqual({ main: null, backup: null });
  });

  it('schreibt über save.tmp und hebt die vorherige Datei als save.bak auf', async () => {
    const files = new MemoryFiles();
    const store = new FileSaveStore(files);
    await store.write('A');
    expect(await store.read()).toEqual({ main: 'A', backup: null });
    await store.write('B');
    expect(await store.read()).toEqual({ main: 'B', backup: 'A' });
    await store.write('C');
    expect(await store.read()).toEqual({ main: 'C', backup: 'B' });
    expect(files.names().sort()).toEqual(['save.bak', 'save.json']);
  });

  it('Absturz mitten im Schreiben: save.bak bleibt der letzte gute Stand', async () => {
    const files = new MemoryFiles();
    const store = new FileSaveStore(files);
    await store.write('A');
    files.failOn = 'rename:save.tmp';
    await expect(store.write('B')).rejects.toThrow();
    files.failOn = undefined;
    expect(await store.read()).toEqual({ main: null, backup: 'A' });
    // Nächster Versuch klappt und verliert nichts.
    await store.write('C');
    expect(await store.read()).toEqual({ main: 'C', backup: 'A' });
  });

  it('defekte Dateien werden verschoben, nie gelöscht', async () => {
    const files = new MemoryFiles();
    const store = new FileSaveStore(files);
    await store.write('A');
    await store.write('kaputt');
    await store.quarantine('main', 1234);
    expect(await store.read()).toEqual({ main: null, backup: 'A' });
    expect(files.get('corrupt_1234_main.json')).toBe('kaputt');
  });

  it('„Neu starten“ archiviert den Stand und behält ihn', async () => {
    const files = new MemoryFiles();
    const store = new FileSaveStore(files);
    await store.write('A');
    await store.write('B');
    await store.archive(99);
    expect(files.get('archive_99.json')).toBe('B');
    expect(files.get('archive_99_bak.json')).toBe('A');
    expect(await store.read()).toEqual({ main: null, backup: null });
  });
});
