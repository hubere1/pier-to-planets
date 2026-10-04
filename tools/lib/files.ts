import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Alle Dateien unter `dir`, deren Name auf eine der Endungen passt (Pfade relativ zu ROOT, mit `/`). */
export function listFiles(dir: string, extensions: readonly string[]): string[] {
  const abs = join(ROOT, dir);
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const full = join(abs, name);
    const rel = relative(ROOT, full).split(sep).join('/');
    if (statSync(full).isDirectory()) return listFiles(rel, extensions);
    return extensions.some((e) => name.endsWith(e)) ? [rel] : [];
  });
}
