/**
 * Bottom Sheet mit 3 Höhen (docs/05): Peek 96 dp · Halb 45 % · Voll; darunter die Navigation.
 * Griff antippen oder ziehen wechselt die Höhe; Tab antippen öffnet „Halb“, erneut schließt.
 */
import { useRef } from 'preact/hooks';
import { t } from '../../l10n/index.ts';
import { Icon, type IconName } from '../components/Icon.tsx';
import { openTab, ui, type PanelHeight, type Tab } from '../state.ts';
import { Peek } from './Peek.tsx';
import { BuildTab, ErasTab, GoalsTab } from './Tabs.tsx';

const ORDER: readonly PanelHeight[] = ['peek', 'half', 'full'];
const TABS: readonly { id: Tab; icon: IconName }[] = [
  { id: 'build', icon: 'build' },
  { id: 'goals', icon: 'goal' },
  { id: 'eras', icon: 'eras' },
];

function Handle() {
  const start = useRef<number | null>(null);
  const move = (dir: 1 | -1) => {
    const i = ORDER.indexOf(ui.height.value);
    ui.height.value = ORDER[Math.max(0, Math.min(ORDER.length - 1, i + dir))]!;
  };
  return (
    <button
      type="button"
      class="sheet-handle"
      aria-label={t(ui.height.value === 'full' ? 'panel.collapse' : 'panel.expand')}
      onPointerDown={(e) => (start.current = e.clientY)}
      onPointerUp={(e) => {
        const from = start.current;
        start.current = null;
        if (from === null) return;
        const dy = e.clientY - from;
        if (dy < -24) move(1);
        else if (dy > 24) move(-1);
        else move(ui.height.value === 'full' ? (-2 as 1) : 1);
      }}
    >
      <span />
    </button>
  );
}

export function Panel() {
  const height = ui.height.value;
  const tab = ui.tab.value;
  return (
    <>
      {height === 'full' && <div class="scene-dim" aria-hidden="true" />}
      <section
        class={`sheet sheet-${height} frame-panel`}
        data-testid="sheet"
        aria-label={t('panel.label')}
      >
        <Handle />
        <Peek />
        {height !== 'peek' && (
          <div class="sheet-content" data-testid={`tab-${tab}`}>
            {tab === 'build' && <BuildTab />}
            {tab === 'goals' && <GoalsTab />}
            {tab === 'eras' && <ErasTab />}
          </div>
        )}
      </section>
      <nav class="nav frame-high" aria-label={t('nav.label')}>
        {TABS.map((x) => (
          <button
            type="button"
            key={x.id}
            class={`nav-tab ${tab === x.id && height !== 'peek' ? 'nav-active' : ''}`}
            aria-pressed={tab === x.id && height !== 'peek'}
            data-coach={`tab-${x.id}`}
            onClick={() => openTab(x.id)}
          >
            <Icon name={x.icon} />
            <span class="px-small">{t(`nav.${x.id}`)}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
