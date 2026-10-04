import { describe, expect, it } from 'vitest';
import { createTranslator, resolveLocale } from './i18n.ts';

const de = { 'a.hello': 'Hallo {name}', 'a.plain': 'Text' };
const en = { 'a.hello': 'Hello {name}', 'a.plain': 'Text' };

describe('createTranslator', () => {
  it('setzt ICU-Platzhalter ein', () => {
    const t = createTranslator({ de, en }, 'de');
    expect(t('a.hello', { name: 'Elias' })).toBe('Hallo Elias');
  });

  it('nutzt die gewählte Sprache', () => {
    const t = createTranslator({ de, en }, 'en');
    expect(t('a.hello', { name: 'Ann' })).toBe('Hello Ann');
  });

  it('zeigt bei unbekanntem Schlüssel den Schlüssel statt leer', () => {
    const t = createTranslator({ de, en }, 'de');
    expect(t('missing.key')).toBe('missing.key');
  });

  it('lässt fehlende Parameter sichtbar stehen', () => {
    const t = createTranslator({ de, en }, 'de');
    expect(t('a.hello')).toBe('Hallo {name}');
  });
});

describe('resolveLocale', () => {
  it('wählt de für deutsche Systemsprachen', () => {
    expect(resolveLocale(['de-AT', 'en'])).toBe('de');
  });
  it('fällt sonst auf en zurück', () => {
    expect(resolveLocale(['fr-FR'])).toBe('en');
    expect(resolveLocale([])).toBe('en');
  });
});
