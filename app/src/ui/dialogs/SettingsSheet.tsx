/**
 * Einstellungen, Grundumfang M3 (docs/05 § Einstellungen): Sprache, Grafik, Bildrate,
 * Animationen reduzieren, Haptik, Zahlenformat, Tutorial wiederholen, Spielstand zurücksetzen
 * (archiviert, Doppelbestätigung), Version, Lizenzen. Werbe-Einwilligung, Export und
 * Fehlerbericht folgen mit M8.
 */
import { useState } from 'preact/hooks';
import oflText from '../fonts/OFL-Atkinson.txt?raw';
import { t } from '../../l10n/index.ts';
import { Icon } from '../components/Icon.tsx';
import { settings, updateSettings, type Settings } from '../settings.ts';
import { ui, useApp } from '../state.ts';

function Choice<K extends keyof Settings>(props: {
  label: string;
  field: K;
  options: readonly { value: Settings[K]; label: string }[];
}) {
  const current = settings.value[props.field];
  return (
    <fieldset class="choice">
      <legend>{props.label}</legend>
      <div class="choice-row">
        {props.options.map((o) => (
          <button
            type="button"
            key={String(o.value)}
            class={`btn-small ${o.value === current ? 'frame-primary' : 'frame-secondary'}`}
            aria-pressed={o.value === current}
            onClick={() => updateSettings({ [props.field]: o.value } as Partial<Settings>)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const onOff = () =>
  [
    { value: true, label: t('settings.on') },
    { value: false, label: t('settings.off') },
  ] as const;

export function SettingsSheet() {
  const { session, platform } = useApp();
  const [confirm, setConfirm] = useState(0);
  const [licenses, setLicenses] = useState(false);
  const close = () => (ui.dialog.value = null);

  const reset = async () => {
    if (confirm < 1) {
      setConfirm(1);
      return;
    }
    await session.halt();
    await platform.store.archive(platform.clock.now());
    updateSettings({ tutorial: 'tapBoat' });
    window.location.reload();
  };

  return (
    <div class="dialog-backdrop" role="presentation">
      <section
        class="dialog dialog-full frame-high"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        data-testid="settings"
      >
        <button type="button" class="dialog-close" aria-label={t('dialog.close')} onClick={close}>
          <Icon name="close" />
        </button>
        <h2 id="settings-title" class="px-title">
          {t('settings.title')}
        </h2>
        <div class="settings-list">
          <Choice
            label={t('settings.language')}
            field="language"
            options={[
              { value: 'system', label: t('settings.language.system') },
              { value: 'de', label: 'Deutsch' },
              { value: 'en', label: 'English' },
            ]}
          />
          <Choice
            label={t('settings.quality')}
            field="quality"
            options={[
              { value: 'auto', label: t('settings.quality.auto') },
              { value: 'high', label: t('settings.quality.high') },
              { value: 'medium', label: t('settings.quality.medium') },
              { value: 'low', label: t('settings.quality.low') },
            ]}
          />
          <Choice
            label={t('settings.fps')}
            field="fps"
            options={[
              { value: 60, label: '60' },
              { value: 30, label: '30' },
            ]}
          />
          <Choice label={t('settings.reducedMotion')} field="reducedMotion" options={onOff()} />
          <Choice label={t('settings.haptics')} field="haptics" options={onOff()} />
          <Choice
            label={t('settings.notation')}
            field="notation"
            options={[
              { value: 'short', label: t('settings.notation.short') },
              { value: 'scientific', label: t('settings.notation.scientific') },
            ]}
          />
          <button
            type="button"
            class="btn frame-secondary"
            onClick={() => {
              updateSettings({ tutorial: 'tapBoat' });
              ui.tutorial.value = 'tapBoat';
              close();
            }}
          >
            <span class="px">{t('settings.tutorial')}</span>
          </button>
          <div class="settings-danger">
            <p class="muted">{t(confirm ? 'settings.reset.confirm' : 'settings.reset.hint')}</p>
            <button
              type="button"
              class={`btn ${confirm ? 'frame-danger' : 'frame-secondary'}`}
              data-testid="settings-reset"
              onClick={() => void reset()}
            >
              <span class="px">{t(confirm ? 'settings.reset.really' : 'settings.reset')}</span>
            </button>
          </div>
          <button type="button" class="btn frame-secondary" onClick={() => setLicenses(!licenses)}>
            <span class="px">{t('settings.licenses')}</span>
          </button>
          {licenses && (
            <div class="licenses" data-testid="licenses">
              <p>{t('licenses.m6x11')}</p>
              <p>{t('licenses.atkinson')}</p>
              <details>
                <summary>{t('licenses.ofl')}</summary>
                <pre>{oflText}</pre>
              </details>
              <p>{t('licenses.pierPixel')}</p>
              <p>{t('licenses.libs')}</p>
            </div>
          )}
          <p class="muted">{t('app.version', { version: __APP_VERSION__ })}</p>
        </div>
      </section>
    </div>
  );
}
