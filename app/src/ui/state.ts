/**
 * UI-Zustand (nur Darstellung, kein Spielzustand): offene Panels, Dialoge, Auswahl.
 */
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { GameSession } from '../loop/session.ts';
import type { Platform } from '../platform/index.ts';
import type { StageHandle } from '../render/stage.ts';
import { MessageQueue } from './fx/messages.ts';
import type { TutorialStep } from './tutorial/tutorial.ts';

export type Tab = 'build' | 'goals' | 'eras';
export type PanelHeight = 'peek' | 'half' | 'full';
export type Dialog = 'prestige' | 'settings' | null;

export const ui = {
  tab: signal<Tab>('build'),
  height: signal<PanelHeight>('peek'),
  dialog: signal<Dialog>(null),
  /** Gewähltes Gebäude (Tipp in der Szene) – Karte im Bauen-Tab hervorheben. */
  selected: signal<string | null>(null),
  tutorial: signal<TutorialStep>('done'),
  messages: new MessageQueue(),
  /** Zähler, damit die Feier-Ebene nach `push` neu zeichnet. */
  messagesTick: signal(0),
  stage: signal<StageHandle | null>(null),
};

export interface AppCtx {
  session: GameSession;
  platform: Platform;
}

export const AppContext = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppContext fehlt');
  return ctx;
}

export function openTab(tab: Tab): void {
  if (ui.tab.value === tab && ui.height.value !== 'peek') {
    ui.height.value = 'peek';
    return;
  }
  ui.tab.value = tab;
  ui.height.value = 'half';
}
