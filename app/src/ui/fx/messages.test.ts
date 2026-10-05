import { describe, expect, it } from 'vitest';
import { MessageQueue } from './messages.ts';

const banner = (key: string) => ({ kind: 'banner' as const, key });

describe('MessageQueue (docs/05 § Feedback, Lehre 10)', () => {
  it('zeigt eine Botschaft zur Zeit, der Reihe nach', () => {
    const q = new MessageQueue();
    q.push(banner('a'));
    q.push(banner('b'));
    q.tick(0, false);
    expect(q.current?.key).toBe('a');
    q.tick(2.4, false);
    expect(q.current?.key).toBe('a');
    q.tick(0.2, false);
    expect(q.current?.key).toBe('b');
  });

  it('höchstens 3 warten; die älteste fällt weg', () => {
    const q = new MessageQueue();
    for (const k of ['a', 'b', 'c', 'd']) q.push(banner(k));
    expect(q.pending.map((m) => m.key)).toEqual(['b', 'c', 'd']);
  });

  it('nie über Dialogen: während blockiert läuft keine Zeit und nichts erscheint', () => {
    const q = new MessageQueue();
    q.push(banner('a'));
    q.tick(5, true);
    expect(q.current).toBeNull();
    q.tick(0, false);
    expect(q.current?.key).toBe('a');
  });

  it('Vollbild-Feier bleibt, bis sie geschlossen wird', () => {
    const q = new MessageQueue();
    q.push({ kind: 'fullscreen', key: 'goal' });
    q.tick(0, false);
    q.tick(60, false);
    expect(q.current?.key).toBe('goal');
    q.dismiss();
    expect(q.current).toBeNull();
  });

  it('gleiche Botschaft direkt hintereinander wird zusammengefasst', () => {
    const q = new MessageQueue();
    q.push(banner('a'));
    q.push(banner('a'));
    expect(q.pending).toHaveLength(1);
  });
});
