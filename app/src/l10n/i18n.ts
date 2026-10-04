/**
 * Übersetzung mit ICU-artigen Platzhaltern `{name}` (docs/05-ui-ux-spec.md § Lokalisierung).
 * Quelle ist de.json; check-l10n sichert Parität mit en.json.
 */
export type Locale = 'de' | 'en';
export type Messages = Readonly<Record<string, string>>;
export type Params = Readonly<Record<string, string | number>>;
export type Translate = (key: string, params?: Params) => string;

export function createTranslator(catalogs: Record<Locale, Messages>, locale: Locale): Translate {
  const messages = catalogs[locale];
  return (key, params) => {
    const template = messages[key];
    if (template === undefined) return key;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params?.[name];
      return value === undefined ? match : String(value);
    });
  };
}

export function resolveLocale(preferred: readonly string[]): Locale {
  const first = preferred[0]?.toLowerCase() ?? '';
  return first.startsWith('de') ? 'de' : 'en';
}
