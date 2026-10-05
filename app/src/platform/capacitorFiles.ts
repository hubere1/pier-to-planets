/**
 * Spielstand-Dateien im App-Datenordner (Android, `Directory.Data`, docs/04 § Save).
 * Nicht `localStorage`: WebView/System können ihn leeren (D-009).
 */
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import type { FileBackend } from './files.ts';

const DIR = Directory.Data;

async function exists(path: string): Promise<boolean> {
  try {
    await Filesystem.stat({ path, directory: DIR });
    return true;
  } catch {
    return false;
  }
}

export class CapacitorFiles implements FileBackend {
  async read(name: string): Promise<string | null> {
    if (!(await exists(name))) return null;
    const r = await Filesystem.readFile({ path: name, directory: DIR, encoding: Encoding.UTF8 });
    return typeof r.data === 'string' ? r.data : await r.data.text();
  }

  async write(name: string, text: string): Promise<void> {
    await Filesystem.writeFile({ path: name, data: text, directory: DIR, encoding: Encoding.UTF8 });
  }

  async rename(from: string, to: string): Promise<void> {
    if (!(await exists(from))) return;
    // Ob das Plugin ein vorhandenes Ziel ersetzt, ist nicht dokumentiert – daher vorher entfernen.
    // Ziel ist immer eine ältere Kopie (save.bak) oder eine nicht existierende Datei.
    if (await exists(to)) await Filesystem.deleteFile({ path: to, directory: DIR });
    await Filesystem.rename({ from, to, directory: DIR, toDirectory: DIR });
  }
}
