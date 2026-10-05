/**
 * Tutorial der ersten 10 Minuten (docs/03 §8) als reiner Zustandsautomat.
 * D-038: ereignisgesteuert statt nach Uhrzeit, der Kauf-Schritt folgt dem Engpass-Vorschlag
 * der Sim (zuerst meist der Kran), damit Coach und Peek-Zeile dasselbe sagen (Lehre 5).
 */
import type { Notice } from '@ptp/sim';

export const STEPS = [
  'tapBoat',
  'keepTapping',
  'firstBuy',
  'bottleneck',
  'buyAmount',
  'waitMilestone',
  'milestone',
  'waitLighthouse',
  'lighthouse',
  'goal',
  'done',
] as const;
export type TutorialStep = (typeof STEPS)[number];

/** Schritte ohne sichtbaren Coach (warten auf ein Ereignis). */
export const SILENT: ReadonlySet<TutorialStep> = new Set([
  'waitMilestone',
  'waitLighthouse',
  'done',
]);

export interface TutorialInput {
  notices: readonly Notice[];
  /** Engpass-Vorschlag ist bezahlbar. */
  affordable?: boolean;
  /** Spieler bestätigt („Weiter“). */
  ack?: boolean;
  skip?: boolean;
  tabOpened?: string;
}

const has = (i: TutorialInput, ref: string, building?: string) =>
  i.notices.some(
    (n) => n.ref === ref && (building === undefined || n.args['building'] === building),
  );

/** Überspringbar ab Schritt 2 (docs/03 §8). */
export const canSkip = (s: TutorialStep) => s !== 'tapBoat' && s !== 'done';

export function nextStep(s: TutorialStep, i: TutorialInput): TutorialStep {
  if (s === 'done') return s;
  if (i.skip && canSkip(s)) return 'done';
  const lighthouse = has(i, 'building.unlocked', 'lighthouse');
  switch (s) {
    case 'tapBoat':
      if (has(i, 'buy.done')) return 'bottleneck';
      return has(i, 'tap.unloaded') ? 'keepTapping' : s;
    case 'keepTapping':
      if (has(i, 'buy.done')) return 'bottleneck';
      return i.affordable ? 'firstBuy' : s;
    case 'firstBuy':
      return has(i, 'buy.done') ? 'bottleneck' : s;
    case 'bottleneck':
      return i.ack || has(i, 'buy.done') ? 'buyAmount' : s;
    case 'buyAmount':
      return i.ack ? 'waitMilestone' : s;
    case 'waitMilestone':
      if (lighthouse) return 'lighthouse';
      return has(i, 'milestone.reached') ? 'milestone' : s;
    case 'milestone':
      return i.ack ? 'waitLighthouse' : s;
    case 'waitLighthouse':
      return lighthouse ? 'lighthouse' : s;
    case 'lighthouse':
      return i.ack ? 'goal' : s;
    case 'goal':
      return i.tabOpened === 'goals' || i.ack ? 'done' : s;
  }
}
