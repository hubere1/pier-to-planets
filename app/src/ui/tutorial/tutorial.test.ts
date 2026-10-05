import { describe, expect, it } from 'vitest';
import type { Notice } from '@ptp/sim';
import { canSkip, nextStep, type TutorialStep } from './tutorial.ts';

const n = (ref: string, args: Notice['args'] = {}): Notice => ({ ref, args });

function play(events: Parameters<typeof nextStep>[1][], from: TutorialStep = 'tapBoat') {
  let s = from;
  const seen: TutorialStep[] = [s];
  for (const e of events) {
    const next = nextStep(s, e);
    if (next !== s) seen.push(next);
    s = next;
  }
  return seen;
}

describe('Tutorial (docs/03 §8, D-038: folgt dem Engpass, ereignisgesteuert)', () => {
  it('führt in der Reihenfolge von §8 durch die ersten Minuten', () => {
    const seen = play([
      { notices: [n('tap.unloaded')] },
      { notices: [], affordable: true },
      { notices: [n('buy.done', { building: 'crane' })] },
      { notices: [], ack: true },
      { notices: [], ack: true },
      { notices: [n('milestone.reached', { building: 'warehouse', milestone: 1 })] },
      { notices: [], ack: true },
      { notices: [n('building.unlocked', { building: 'lighthouse' })] },
      { notices: [], ack: true },
      { notices: [], tabOpened: 'goals' },
    ]);
    expect(seen).toEqual([
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
    ]);
  });

  it('der erste Kauf geht auch ohne Tippen weiter (Steg oder Kran, egal welcher)', () => {
    expect(nextStep('keepTapping', { notices: [n('buy.done', { building: 'pier' })] })).toBe(
      'bottleneck',
    );
  });

  it('kommt der Leuchtturm vor dem ersten Meilenstein, wird der Meilenstein-Schritt übersprungen', () => {
    expect(
      nextStep('waitMilestone', { notices: [n('building.unlocked', { building: 'lighthouse' })] }),
    ).toBe('lighthouse');
  });

  it('überspringbar ab Schritt 2, nicht beim ersten Tipp', () => {
    expect(canSkip('tapBoat')).toBe(false);
    expect(canSkip('keepTapping')).toBe(true);
    expect(nextStep('keepTapping', { notices: [], skip: true })).toBe('done');
    expect(nextStep('tapBoat', { notices: [], skip: true })).toBe('tapBoat');
  });

  it('„done“ bleibt fertig', () => {
    expect(nextStep('done', { notices: [n('tap.unloaded')], ack: true })).toBe('done');
  });
});
