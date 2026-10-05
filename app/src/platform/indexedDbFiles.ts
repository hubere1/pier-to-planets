/**
 * Browser-Entwicklung: dieselben Spielstand-Dateien in IndexedDB (docs/04 § Save).
 */
import type { FileBackend } from './files.ts';

const DB = 'pier-to-planets';
const STORE = 'files';

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB-Fehler'));
  });
}

export class IndexedDbFiles implements FileBackend {
  private db: Promise<IDBDatabase> | undefined;

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error ?? new Error('IndexedDB nicht verfügbar'));
    });
    return this.db;
  }

  private async tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return (await this.open()).transaction(STORE, mode).objectStore(STORE);
  }

  async read(name: string): Promise<string | null> {
    const v = await request((await this.tx('readonly')).get(name));
    return typeof v === 'string' ? v : null;
  }

  async write(name: string, text: string): Promise<void> {
    await request((await this.tx('readwrite')).put(text, name));
  }

  async rename(from: string, to: string): Promise<void> {
    const store = await this.tx('readwrite');
    const v = await request(store.get(from));
    if (typeof v !== 'string') return;
    store.put(v, to);
    await request(store.delete(from));
  }
}
