/** CLI: Parität von app/src/l10n/de.json (Quelle) und en.json (AGENTS Regel 13). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/files.ts';
import { compareCatalogs } from './lib/l10n.ts';

const load = (lang: string) =>
  JSON.parse(readFileSync(join(ROOT, `app/src/l10n/${lang}.json`), 'utf8')) as Record<
    string,
    unknown
  >;

const de = load('de');
const problems = compareCatalogs(de, load('en'));
for (const p of problems) console.error(`${p.kind}  ${p.key}${p.detail ? `  (${p.detail})` : ''}`);

if (problems.length > 0) {
  console.error(`check:l10n – ${problems.length} Problem(e).`);
  process.exit(1);
}
console.log(`check:l10n – ${Object.keys(de).length} Schlüssel, DE/EN paritätisch.`);
