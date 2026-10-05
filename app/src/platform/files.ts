/**
 * Kleinste Datei-Schnittstelle für Spielstände (docs/04 § Plattform-Interfaces).
 * Android: Capacitor Filesystem, Browser: IndexedDB, Tests: Speicher.
 */
export interface FileBackend {
  read(name: string): Promise<string | null>;
  write(name: string, text: string): Promise<void>;
  /** Benennt um; ein vorhandenes Ziel wird ersetzt. Fehlt die Quelle, passiert nichts. */
  rename(from: string, to: string): Promise<void>;
}

/** Speicher-Implementierung für Tests; `failOn` simuliert einen Absturz („op:name“). */
export class MemoryFiles implements FileBackend {
  private readonly files = new Map<string, string>();
  failOn: string | undefined;

  private check(op: string, name: string): void {
    if (this.failOn === `${op}:${name}`) throw new Error(`Simulierter Fehler bei ${op} ${name}`);
  }

  read(name: string): Promise<string | null> {
    this.check('read', name);
    return Promise.resolve(this.files.get(name) ?? null);
  }

  write(name: string, text: string): Promise<void> {
    this.check('write', name);
    this.files.set(name, text);
    return Promise.resolve();
  }

  rename(from: string, to: string): Promise<void> {
    this.check('rename', from);
    const text = this.files.get(from);
    if (text !== undefined) {
      this.files.set(to, text);
      this.files.delete(from);
    }
    return Promise.resolve();
  }

  get(name: string): string | undefined {
    return this.files.get(name);
  }

  names(): string[] {
    return [...this.files.keys()];
  }
}
