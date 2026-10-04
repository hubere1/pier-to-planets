import de from './de.json';
import en from './en.json';
import { createTranslator, resolveLocale, type Locale } from './i18n.ts';

export const catalogs: Record<Locale, Record<string, string>> = { de, en };
export const locale: Locale = resolveLocale(navigator.languages);
export const t = createTranslator(catalogs, locale);
