/**
 * Balancing-CLI (docs/03 §9, D-013): spielt die Policies durch und prüft die Zielkurve.
 *   npm run simulate -w packages/sim -- --policy all [--report]
 * `--report` schreibt docs/balance-report.md. Exit 1, wenn das Gate fällt.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POLICIES, POLICY, runJourney, type PolicyId } from '../balance/policies.ts';
import {
  checkGate,
  GATE,
  runVariants,
  type GateCheck,
  type PolicySummary,
} from '../balance/gate.ts';
import { OFFLINE_AD, RESET_HINT, REWARD_LIMITS } from '../rules.ts';
import { harbor } from '@ptp/content';

const args = process.argv.slice(2);
const at = args.indexOf('--policy');
const policyArg = at >= 0 ? (args[at + 1] ?? 'all') : 'all';
const ids: PolicyId[] =
  policyArg === 'all' ? [...POLICIES] : POLICIES.filter((p) => p === policyArg);
if (ids.length === 0) {
  console.error(`Unbekannte Policy „${policyArg}“. Erlaubt: all, ${POLICIES.join(', ')}`);
  process.exit(2);
}

const started = performance.now();
const results = new Map<PolicyId, PolicySummary>();
for (const id of ids) results.set(id, runVariants(id));
const journey = runJourney();
const again = runVariants(ids[0]!);
const deterministic = JSON.stringify(again) === JSON.stringify(results.get(ids[0]!));
const gate = checkGate(results, journey, deterministic);
const ms = performance.now() - started;

const fmt = (d: number | null) => (d === null ? '–' : `Tag ${d.toFixed(2)}`);
const table: string[] = [
  '| Policy | Sitzungen/Tag | Ziel-Gebäude (Mittel) | Spanne | Neustarts (Mittel) | Sterne am Ziel |',
  '|---|---|---|---|---|---|',
];
for (const r of results.values()) {
  const days = r.runs.map((x) => x.goalDay).filter((d): d is number => d !== null);
  const stars = r.runs.map((x) => x.days.at(-1)!.stars);
  table.push(
    `| ${r.policy} | ${POLICY[r.policy].sessions.length} | ${fmt(r.goalDay)} | ` +
      `${days.length ? `${Math.min(...days).toFixed(2)}–${Math.max(...days).toFixed(2)}` : '–'} | ` +
      `${r.resets.toFixed(2)} | ${Math.min(...stars)}–${Math.max(...stars)} |`,
  );
}

console.log(
  `\nBalancing-Gate – Ära 1 Hafen, je Policy ${GATE.variants} Läufe (${ms.toFixed(0)} ms)\n`,
);
console.log(table.join('\n'));
console.log(
  `\nEinstieg (diskret, 3 Tipps/s): erster Kauf ${journey.firstPurchase?.toFixed(1) ?? '–'} s, ` +
    `Kran ${journey.crane?.toFixed(1) ?? '–'} s\n`,
);
for (const c of gate) console.log(`${c.ok ? '✔' : '✖'} ${c.name}: ${c.detail}`);

if (args.includes('--report')) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
  writeFileSync(join(root, 'docs/balance-report.md'), report(gate));
  console.log('\nReport geschrieben: docs/balance-report.md');
}

if (gate.some((c) => !c.ok)) {
  console.error('\n✖ Balancing-Gate rot.');
  process.exit(1);
}
console.log('\n✔ Balancing-Gate grün.');

function report(checks: GateCheck[]): string {
  const out: string[] = [
    '# Balance-Report – Ära 1 Hafen',
    '',
    'Erzeugt mit `npm run simulate -w packages/sim -- --policy all --report` (docs/03 §9, D-013).',
    'Nicht von Hand bearbeiten. Zeiten in Tagen ab der ersten Sitzung; je Policy',
    `${GATE.variants} Läufe mit unterschiedlicher Installationszeit und um ±45 Min gestreuten Sitzungen (D-035).`,
    '',
    '## Ergebnis',
    '',
    ...table,
    '',
    `Einstieg (diskret, 3 Tipps/s): erster Kauf nach **${journey.firstPurchase?.toFixed(1)} s**, ` +
      `Kran nach **${journey.crane?.toFixed(1)} s**.`,
    '',
    '## Prüfungen',
    '',
    ...checks.map((c) => `- ${c.ok ? '✔' : '✖'} **${c.name}:** ${c.detail}`),
    '',
    '## Annahmen dieses Laufs',
    '',
    `- Sterne-Schwelle ${harbor.starThreshold.toExponential(1)}, Ziel-Gebäude ${harbor.goal.cost.toExponential(1)} Taler`,
    `- Neustart-Hinweis ab max(${RESET_HINT.min}; ${RESET_HINT.share} · Sterne) neuen Sternen (D-031)`,
    `- Werbung: Boost ${REWARD_LIMITS.boost}/Tag, Offline ×${OFFLINE_AD.factor} ${REWARD_LIMITS.offlineDouble}/Tag (D-034)`,
    '- Policies: casual 4 × 3 Min (8:00, 12:30, 18:00, 21:30), active 8 × 3 Min + Tippen, idle 2 × 3 Min, ads = casual + Werbung',
    '',
    '## Verlauf je Tag (Lauf 1 je Policy)',
  ];
  for (const r of results.values()) {
    const run = r.runs[0]!;
    out.push('', `### ${r.policy}`, '');
    out.push(
      `Neustarts: ${run.resets.map((x) => `Tag ${x.day.toFixed(2)} (+${x.stars} Sterne)`).join(', ') || 'keine'}; ` +
        `Ziel: ${fmt(run.goalDay)}`,
      '',
    );
    out.push('| Tag | Lebenseinnahmen | Sterne | Einnahmen/s | Stufen |', '|---|---|---|---|---|');
    for (const d of run.days) {
      const lv = Object.entries(d.levels)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ');
      out.push(
        `| ${d.day.toFixed(2)} | ${d.lifetime.toNumber().toPrecision(3)} | ${d.stars} | ` +
          `${d.incomePerSec.toNumber().toPrecision(3)} | ${lv} |`,
      );
    }
  }
  out.push('');
  return out.join('\n');
}
