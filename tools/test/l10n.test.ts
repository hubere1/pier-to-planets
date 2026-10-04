import { describe, expect, it } from 'vitest';
import { compareCatalogs } from '../lib/l10n.ts';

const kinds = (de: Record<string, unknown>, en: Record<string, unknown>) =>
  compareCatalogs(de, en).map((p) => `${p.kind}:${p.key}`);

describe('compareCatalogs (AGENTS Regel 13)', () => {
  it('akzeptiert gleiche Schlüssel und Platzhalter', () => {
    expect(kinds({ a: 'Hallo {n}' }, { a: 'Hello {n}' })).toEqual([]);
  });

  it('meldet fehlende und überzählige Schlüssel', () => {
    expect(kinds({ a: 'x', b: 'y' }, { a: 'x', c: 'z' })).toEqual([
      'missing-in-en:b',
      'extra-in-en:c',
    ]);
  });

  it('meldet abweichende Platzhalter', () => {
    expect(kinds({ a: '{n} Taler' }, { a: '{count} Thaler' })).toEqual(['placeholder-mismatch:a']);
  });

  it('meldet leere Texte und Nicht-Strings', () => {
    expect(kinds({ a: '', b: 1 }, { a: 'x', b: 'y' })).toEqual(['empty:a', 'not-a-string:b']);
  });

  it('meldet Steuerzeichen (Lehre 13)', () => {
    expect(kinds({ a: 'x\u0007' }, { a: 'x' })).toEqual(['control-char:a']);
  });

  it('erlaubt geschütztes Leerzeichen und Zeilenumbruch', () => {
    expect(kinds({ a: '4,2 Mio.\nZeile' }, { a: '4.2 M\nline' })).toEqual([]);
  });
});
