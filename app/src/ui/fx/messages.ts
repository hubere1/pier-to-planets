/**
 * Warteschlange der Feier-Ebene (docs/05 § Feedback): eine Botschaft zur Zeit, höchstens 3
 * wartend, nie über Dialogen (Lehre 10). Lesedauer bleibt auch bei „Animationen reduzieren“
 * gleich lang (Lehre 9).
 */
import type { Params } from '../../l10n/i18n.ts';

export interface Message {
  /** banner: oben, 2,5 s · toast: klein, 2 s · fullscreen: bis zum Schließen. */
  kind: 'banner' | 'toast' | 'fullscreen';
  key: string;
  params?: Params;
  icon?: string;
}

const DURATION: Record<Message['kind'], number> = {
  banner: 2.5,
  toast: 2,
  fullscreen: Number.POSITIVE_INFINITY,
};
const MAX_PENDING = 3;

export class MessageQueue {
  pending: Message[] = [];
  current: Message | null = null;
  private left = 0;

  push(m: Message): void {
    const last = this.pending[this.pending.length - 1] ?? this.current;
    if (last && last.key === m.key && JSON.stringify(last.params) === JSON.stringify(m.params))
      return;
    this.pending.push(m);
    while (this.pending.length > MAX_PENDING) this.pending.shift();
  }

  /** @param blocked Dialog offen → nichts zeigen, keine Zeit verbrauchen. */
  tick(dt: number, blocked: boolean): void {
    if (blocked) {
      if (this.current && this.current.kind !== 'fullscreen') {
        // Laufende Botschaft wartet, bis der Dialog zu ist.
        this.pending.unshift(this.current);
        this.current = null;
      }
      return;
    }
    if (this.current) {
      this.left -= dt;
      if (this.left > 0) return;
      this.current = null;
    }
    const next = this.pending.shift();
    if (next) {
      this.current = next;
      this.left = DURATION[next.kind];
    }
  }

  dismiss(): void {
    this.current = null;
    this.left = 0;
  }
}
