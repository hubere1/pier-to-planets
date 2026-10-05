/**
 * Spielstand-Dateien (docs/04 § Save, AGENTS Regel 9, D-009).
 * Schreiben: save.tmp → (save.json → save.bak) → save.json. Defekte Dateien und
 * archivierte Stände werden nur umbenannt, nie gelöscht.
 */
import type { FileBackend } from './files.ts';

export const MAIN = 'save.json';
export const BACKUP = 'save.bak';
const TMP = 'save.tmp';

export interface SaveFiles {
  main: string | null;
  backup: string | null;
}

export interface SaveStore {
  read(): Promise<SaveFiles>;
  write(text: string): Promise<void>;
  /** Defekte Datei nach `corrupt_<stamp>_<which>.json` verschieben. */
  quarantine(which: 'main' | 'backup', stamp: number): Promise<void>;
  /** „Neu starten“: aktuellen Stand nach `archive_<stamp>.json` verschieben. */
  archive(stamp: number): Promise<void>;
}

export class FileSaveStore implements SaveStore {
  constructor(private readonly files: FileBackend) {}

  async read(): Promise<SaveFiles> {
    const [main, backup] = await Promise.all([this.files.read(MAIN), this.files.read(BACKUP)]);
    return { main, backup };
  }

  async write(text: string): Promise<void> {
    await this.files.write(TMP, text);
    // Erst wenn die neue Datei vollständig liegt, wird die alte zur Sicherung.
    if ((await this.files.read(MAIN)) !== null) await this.files.rename(MAIN, BACKUP);
    await this.files.rename(TMP, MAIN);
  }

  async quarantine(which: 'main' | 'backup', stamp: number): Promise<void> {
    await this.files.rename(which === 'main' ? MAIN : BACKUP, `corrupt_${stamp}_${which}.json`);
  }

  async archive(stamp: number): Promise<void> {
    await this.files.rename(MAIN, `archive_${stamp}.json`);
    await this.files.rename(BACKUP, `archive_${stamp}_bak.json`);
  }
}
