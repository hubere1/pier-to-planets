/** CLI: prüft packages/sim/src auf Reinheit (AGENTS Regel 4 + 5). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listFiles, ROOT } from './lib/files.ts';
import { findPurityViolations } from './lib/purity.ts';

const files = listFiles('packages/sim/src', ['.ts', '.tsx'])
  // Die Balancing-CLI darf auf die Konsole schreiben und Dateien lesen; sie ist kein Teil der Sim.
  .filter((p) => !p.startsWith('packages/sim/src/bin/'))
  .map((path) => ({ path, source: readFileSync(join(ROOT, path), 'utf8') }));

const violations = findPurityViolations(files);
for (const v of violations) console.error(`${v.path}:${v.line}:${v.column}  ${v.rule}  ${v.text}`);

if (violations.length > 0) {
  console.error(`check:purity – ${violations.length} Verstoß/Verstöße.`);
  process.exit(1);
}
console.log(`check:purity – ${files.length} Datei(en) rein.`);
