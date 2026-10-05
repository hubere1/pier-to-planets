/**
 * Sprache zur Laufzeit (FR-X04: Wechsel ohne Neustart). `t()` liest das Signal `locale`,
 * dadurch zeichnen sich Komponenten bei einem Wechsel neu.
 */
import { signal } from '@preact/signals';
import type { Num } from '@ptp/sim';
import de from './de.json';
import en from './en.json';
import { formatMoney, formatNum, formatRate, type FormatOptions } from './format.ts';
import { createTranslator, resolveLocale, type Locale, type Params } from './i18n.ts';

export type { Locale } from './i18n.ts';

export const catalogs: Record<Locale, Record<string, string>> = { de, en };
export const systemLocale: Locale = resolveLocale(navigator.languages);
export const locale = signal<Locale>(systemLocale);
/** Einstellung Zahlenformat (docs/05 § Einstellungen). */
export const notation = signal<'short' | 'scientific'>('short');

const translators = {
  de: createTranslator(catalogs, 'de'),
  en: createTranslator(catalogs, 'en'),
};

export function t(key: string, params?: Params): string {
  return translators[locale.value](key, params);
}

const opts = (o?: FormatOptions): FormatOptions => ({ notation: notation.value, ...o });

/** Zahl im aktuellen Format. */
export const num = (v: Num | number, o?: FormatOptions) => formatNum(v, locale.value, opts(o));
/** Betrag mit Ära-Währung („42.380 Taler“). */
export const money = (v: Num | number, era = 'harbor') =>
  formatMoney(v, locale.value, t(`currency.${era}`), opts());
export const rate = (v: Num | number) => formatRate(v, locale.value, opts());

/** Dauer „3 h 12 min“ / „45 s“. */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return t('time.hm', { h, m });
  if (m > 0) return t('time.m', { m });
  return t('time.s', { s });
}
