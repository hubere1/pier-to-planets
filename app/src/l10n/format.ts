/**
 * Zahlenformat (docs/06 §10, AGENTS Lehre 12, D-033). Einzige Stelle für Zahlen in der UI.
 * Unter 1 Mio. voll mit Tausendertrenner; ab 1 Mio. eine Nachkommastelle + Kurzform,
 * immer abgerundet (nie mehr anzeigen, als da ist). Geschütztes Leerzeichen vor Einheiten.
 */
import { Num } from '@ptp/sim';
import type { Locale } from './i18n.ts';

const NBSP = ' ';

/** Tausendergruppen ab 1e6 (Index = Exponent / 3). */
const NAMED: Record<Locale, readonly string[]> = {
  de: ['Mio.', 'Mrd.', 'Bio.'],
  en: ['M', 'B', 'T'],
};
/** Ab 1e15 in beiden Sprachen gleich (Genre-üblich), danach aa … zz. */
const SHARED = ['Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
const FIRST_LETTER_GROUP = 12; // 1e36
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

const SEP: Record<Locale, { thousands: string; decimal: string }> = {
  de: { thousands: '.', decimal: ',' },
  en: { thousands: ',', decimal: '.' },
};

export interface FormatOptions {
  notation?: 'short' | 'scientific';
  /** Nachkommastellen unter 1 Mio. (Standard 0). */
  decimals?: number;
}

function suffixFor(group: number, locale: Locale): string | undefined {
  if (group < 2) return undefined;
  const named = NAMED[locale][group - 2];
  if (named) return named;
  const shared = SHARED[group - 5];
  if (shared) return shared;
  const k = group - FIRST_LETTER_GROUP;
  if (k < 0 || k >= LETTERS.length ** 2) return undefined;
  return LETTERS[Math.floor(k / LETTERS.length)]! + LETTERS[k % LETTERS.length]!;
}

/** Abrunden auf `places` Stellen mit Toleranz gegen Gleitkomma-Rauschen (4,2 · 10 = 41,999…). */
function truncate(x: number, places: number): number {
  const f = 10 ** places;
  return Math.floor(x * f + 1e-7) / f;
}

function plain(x: number, locale: Locale, decimals: number): string {
  const sep = SEP[locale];
  const t = truncate(Math.abs(x), decimals);
  const int = Math.floor(t);
  const grouped = String(int).replace(/\B(?=(\d{3})+(?!\d))/g, sep.thousands);
  const frac = decimals > 0 ? sep.decimal + (t - int).toFixed(decimals).slice(2) : '';
  return (x < 0 ? '-' : '') + grouped + frac;
}

export function formatNum(value: Num | number, locale: Locale, opts: FormatOptions = {}): string {
  const n = typeof value === 'number' ? Num.of(value) : value;
  const { mantissa, exponent } = n.parts();
  if (exponent < 6) return plain(n.toNumber(), locale, opts.decimals ?? 0);

  const dec = SEP[locale].decimal;
  const sign = mantissa < 0 ? '-' : '';
  const m = Math.abs(mantissa);
  const scientific = () => `${sign}${truncate(m, 1).toFixed(1).replace('.', dec)}e${exponent}`;
  if (opts.notation === 'scientific') return scientific();

  const group = Math.floor(exponent / 3);
  const suffix = suffixFor(group, locale);
  if (!suffix) return scientific();
  const scaled = truncate(m * 10 ** (exponent - group * 3), 1);
  return `${sign}${scaled.toFixed(1).replace('.', dec)}${NBSP}${suffix}`;
}

/** Betrag mit Währung: „42.380 Taler“, „4,2 Mio. Taler“. */
export function formatMoney(
  value: Num | number,
  locale: Locale,
  unit: string,
  opts?: FormatOptions,
): string {
  return `${formatNum(value, locale, opts)}${NBSP}${unit}`;
}

/** Rate „1,2/s“; unter 100 eine Nachkommastelle. */
export function formatRate(value: Num | number, locale: Locale, opts: FormatOptions = {}): string {
  const n = typeof value === 'number' ? Num.of(value) : value;
  const decimals = opts.decimals ?? (n.lt(100) ? 1 : 0);
  return `${formatNum(n, locale, { ...opts, decimals })}/s`;
}
