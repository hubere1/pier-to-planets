/**
 * Abnahmeregeln des Balancing-Gates (docs/03 §9, FR-M05). Ära 1: Ziel nach etwa Tag 2
 * mit 1–2 Neustarts (casual ±30 %), Werbung höchstens 25 % schneller, keine Sackgasse.
 * Jede Policy läuft in mehreren Varianten (Installationszeit, gestreute Sitzungen, D-035);
 * bewertet wird der Mittelwert, damit keine einzelne Schwelle vor der Nacht den Ausschlag gibt.
 */
import { runPolicy, type JourneyResult, type PolicyId, type RunResult } from './policies.ts';

export const GATE = {
  maxDays: 12,
  variants: 8,
  casualGoalDay: 2,
  tolerance: 0.3,
  casualResets: [1, 2] as const,
  adsMaxSpeedup: 0.25,
  firstPurchaseS: 60,
  craneS: 300,
} as const;

export interface PolicySummary {
  policy: PolicyId;
  runs: RunResult[];
  /** Mittel der Tage bis zum Ziel über alle Läufe, die es erreichen. */
  goalDay: number | null;
  reached: number;
  resets: number;
}

export function runVariants(policy: PolicyId): PolicySummary {
  const runs: RunResult[] = [];
  for (let v = 0; v < GATE.variants; v++) {
    runs.push(runPolicy(policy, { maxDays: GATE.maxDays, firstSession: v, seed: v + 1 }));
  }
  const done = runs.filter((r) => r.goalDay !== null);
  return {
    policy,
    runs,
    goalDay: done.length ? done.reduce((a, r) => a + r.goalDay!, 0) / done.length : null,
    reached: done.length,
    resets: runs.reduce((a, r) => a + r.resets.length, 0) / runs.length,
  };
}

export interface GateCheck {
  name: string;
  ok: boolean;
  detail: string;
}

const day = (d: number | null) => (d === null ? 'nicht erreicht' : `Tag ${d.toFixed(2)}`);

export function checkGate(
  results: ReadonlyMap<PolicyId, PolicySummary>,
  journey: JourneyResult,
  deterministic: boolean,
): GateCheck[] {
  const checks: GateCheck[] = [];
  const casual = results.get('casual');
  if (casual) {
    const lo = GATE.casualGoalDay * (1 - GATE.tolerance);
    const hi = GATE.casualGoalDay * (1 + GATE.tolerance);
    const d = casual.goalDay;
    checks.push({
      name: 'casual Zielkurve (§9)',
      ok: d !== null && d >= lo && d <= hi,
      detail: `Ziel-Gebäude im Mittel ${day(d)}, Soll ${lo.toFixed(1)}–${hi.toFixed(1)}`,
    });
    const [rMin, rMax] = GATE.casualResets;
    checks.push({
      name: 'casual Neustarts (§9)',
      ok: casual.resets >= rMin && casual.resets <= rMax,
      detail: `im Mittel ${casual.resets.toFixed(2)}, Soll ${rMin}–${rMax}`,
    });
  }
  const ads = results.get('ads');
  if (casual?.goalDay != null && ads?.goalDay != null) {
    const speedup = 1 - ads.goalDay / casual.goalDay;
    checks.push({
      name: 'Werbung ≤ 25 % schneller (FR-M05)',
      ok: speedup <= GATE.adsMaxSpeedup,
      detail: `${(speedup * 100).toFixed(1)} % schneller als casual`,
    });
  }
  for (const r of results.values()) {
    checks.push({
      name: `${r.policy} erreicht das Ziel`,
      ok: r.reached === r.runs.length,
      detail: `${r.reached}/${r.runs.length} Läufe, im Mittel ${day(r.goalDay)}`,
    });
    const problems = r.runs.flatMap((run, v) => [
      ...run.days
        .filter((d, i) => i > 0 && d.lifetime.lte(run.days[i - 1]!.lifetime))
        .map((d) => `Lauf ${v}: Stillstand an Tag ${d.day.toFixed(0)}`),
      ...run.faults.map((f) => `Lauf ${v}: ${f}`),
    ]);
    checks.push({
      name: `${r.policy} ohne Sackgasse`,
      ok: problems.length === 0,
      detail: problems.length === 0 ? 'jeder Tag mit Fortschritt' : problems.join('; '),
    });
  }
  checks.push({
    name: 'erster Kauf ≤ 60 s (FR-K02)',
    ok: journey.firstPurchase !== null && journey.firstPurchase <= GATE.firstPurchaseS,
    detail: `${journey.firstPurchase?.toFixed(1) ?? '–'} s`,
  });
  checks.push({
    name: 'Kran ≤ 5 Min (M3-Exit)',
    ok: journey.crane !== null && journey.crane <= GATE.craneS,
    detail: `${journey.crane?.toFixed(1) ?? '–'} s`,
  });
  checks.push({
    name: 'Determinismus (NFR-Q07)',
    ok: deterministic,
    detail: deterministic ? 'zwei Läufe identisch' : 'Läufe weichen ab',
  });
  return checks;
}
