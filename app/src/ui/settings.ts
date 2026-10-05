/**
 * Einstellungen (docs/05 § Einstellungen, Grundumfang M3). Gespeichert getrennt vom Spielstand:
 * Android über `@capacitor/preferences`, Browser über `localStorage` (docs/04 § Save).
 * Lesen ist tolerant: Unbekanntes wird ignoriert, Fehlendes bekommt den Standard.
 */
import { effect, signal } from '@preact/signals';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { locale, notation, systemLocale, type Locale } from '../l10n/index.ts';
import { debug, type Quality } from '../render/debugState.ts';
import { STEPS, type TutorialStep } from './tutorial/tutorial.ts';

export interface Settings {
  language: 'system' | Locale;
  quality: 'auto' | Quality;
  fps: 60 | 30;
  reducedMotion: boolean;
  haptics: boolean;
  notation: 'short' | 'scientific';
  buyHintSeen: boolean;
  /** Fortschritt des Tutorials (docs/03 §8); „Tutorial wiederholen“ setzt zurück. */
  tutorial: TutorialStep;
}

export const DEFAULTS: Settings = {
  language: 'system',
  quality: 'auto',
  fps: 60,
  reducedMotion: false,
  haptics: true,
  notation: 'short',
  buyHintSeen: false,
  tutorial: 'tapBoat',
};

const KEY = 'settings';

export const settings = signal<Settings>(DEFAULTS);

export function parseSettings(
  text: string | null | undefined,
  defaults: Settings = DEFAULTS,
): Settings {
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    raw = {};
  }
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const pick = <T>(v: unknown, allowed: readonly T[], d: T): T =>
    allowed.includes(v as T) ? (v as T) : d;
  return {
    language: pick(r['language'], ['system', 'de', 'en'] as const, DEFAULTS.language),
    quality: pick(r['quality'], ['auto', 'high', 'medium', 'low'] as const, DEFAULTS.quality),
    fps: pick(r['fps'], [60, 30] as const, DEFAULTS.fps),
    reducedMotion: typeof r['reducedMotion'] === 'boolean' ? r['reducedMotion'] : false,
    haptics: typeof r['haptics'] === 'boolean' ? r['haptics'] : true,
    notation: pick(r['notation'], ['short', 'scientific'] as const, DEFAULTS.notation),
    buyHintSeen: r['buyHintSeen'] === true,
    tutorial: pick(r['tutorial'], STEPS, defaults.tutorial),
  };
}

async function readRaw(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) return (await Preferences.get({ key: KEY })).value;
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

async function writeRaw(text: string): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) await Preferences.set({ key: KEY, value: text });
    else window.localStorage.setItem(KEY, text);
  } catch {
    // Einstellungen sind Komfort; ein Fehler darf das Spiel nicht stören.
  }
}

/** Lädt die Einstellungen und hält Sprache, Zahlenformat und Darstellung synchron. */
export async function initSettings(opts: { persist: boolean; hasSave: boolean }): Promise<void> {
  // Wer schon spielt (Spielstand ohne Tutorial-Eintrag), bekommt kein Tutorial mehr.
  const defaults: Settings = { ...DEFAULTS, tutorial: opts.hasSave ? 'done' : 'tapBoat' };
  const raw = opts.persist ? await readRaw() : null;
  settings.value = parseSettings(raw, defaults);
  // Erststart sofort festhalten: sonst gälte beim nächsten Start der dann vorhandene Spielstand
  // als „spielt schon“ und das Tutorial fiele weg, obwohl es nie begonnen wurde.
  if (opts.persist && raw === null) await writeRaw(JSON.stringify(settings.value));
  let first = true;
  effect(() => {
    const s = settings.value;
    locale.value = s.language === 'system' ? systemLocale : s.language;
    notation.value = s.notation;
    debug.reducedMotion.value = s.reducedMotion;
    debug.autoQuality.value =
      s.quality === 'auto' && !new URLSearchParams(window.location.search).has('quality');
    if (s.quality !== 'auto') debug.quality.value = s.quality;
    document.documentElement.lang = locale.value;
    document.documentElement.classList.toggle('reduced-motion', s.reducedMotion);
    if (!first && opts.persist) void writeRaw(JSON.stringify(s));
    first = false;
  });
}

export function updateSettings(patch: Partial<Settings>): void {
  settings.value = { ...settings.value, ...patch };
}
