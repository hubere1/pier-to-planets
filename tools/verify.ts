/**
 * `npm run verify`: alle Prüfungen der Definition of Done (docs/02) in fester Reihenfolge.
 * Bricht beim ersten Fehler ab. Plattformunabhängig (lokal Windows, CI Linux).
 */
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/files.ts';

const steps: [string, string][] = [
  ['Lint + Format', 'npm run lint'],
  ['Typecheck', 'npm run typecheck'],
  ['Tests Tools', 'npm run test:tools'],
  ['Tests Sim + Content + App (Vitest + Playwright)', 'npm test'],
  ['Balancing-Gate', 'npm run simulate -w packages/sim -- --policy all'],
  ['Purity', 'npm run check:purity'],
  ['l10n', 'npm run check:l10n'],
  ['Palette', 'npm run check:palette'],
  ['Build', 'npm run build'],
];

const started = Date.now();
for (const [name, cmd] of steps) {
  console.log(`\n▶ ${name}: ${cmd}`);
  const r = spawnSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`\n✖ verify fehlgeschlagen bei „${name}“ (Exit ${r.status ?? 'null'}).`);
    process.exit(r.status ?? 1);
  }
}
console.log(
  `\n✔ verify grün – ${steps.length} Schritte in ${((Date.now() - started) / 1000).toFixed(1)} s.`,
);
