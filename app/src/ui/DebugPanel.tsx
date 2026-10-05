import { CAM_RANGE } from '../render/camera.ts';
import { debug, type Quality } from '../render/debugState.ts';
import { t } from '../l10n/index.ts';

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

function Choice<T extends string | number | boolean>(props: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset class="dbg-choice">
      <legend>{props.label}</legend>
      {props.options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          aria-pressed={o.value === props.value}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}

export function DebugPanel() {
  if (debug.hidden.value) return null;
  const open = debug.open.value;
  const hour = debug.hour.value;
  const s = debug.stats.value;
  return (
    <div class="dbg">
      <button
        type="button"
        class="dbg-toggle"
        aria-expanded={open}
        onClick={() => (debug.open.value = !open)}
      >
        {t('debug.toggle')}
      </button>
      {open && (
        <section class="dbg-panel" aria-label={t('debug.title')}>
          <label class="dbg-time">
            {t('debug.time', { time: `${pad(hour)}:${pad((hour % 1) * 60)}` })}
            <input
              type="range"
              min={0}
              max={23.99}
              step={0.05}
              value={hour}
              onInput={(e) => (debug.hour.value = Number(e.currentTarget.value))}
            />
          </label>
          <Choice
            label={t('debug.speed')}
            value={debug.speed.value}
            options={[
              { value: 0, label: t('debug.speed.pause') },
              { value: 1, label: t('debug.speed.real') },
              { value: 60, label: t('debug.speed.fast') },
            ]}
            onChange={(v) => (debug.speed.value = v)}
          />
          <Choice<Quality>
            label={t('debug.quality')}
            value={debug.quality.value}
            options={[
              { value: 'high', label: t('debug.quality.high') },
              { value: 'medium', label: t('debug.quality.medium') },
              { value: 'low', label: t('debug.quality.low') },
            ]}
            onChange={(v) => (debug.quality.value = v)}
          />
          <Choice
            label={t('debug.lighting')}
            value={debug.lighting.value}
            options={[
              { value: true, label: t('debug.on') },
              { value: false, label: t('debug.off') },
            ]}
            onChange={(v) => (debug.lighting.value = v)}
          />
          <Choice
            label={t('debug.stage')}
            value={debug.warehouseStage.value}
            options={[0, 1, 2].map((n) => ({
              value: n,
              label: t('debug.stage.value', { n: n + 1 }),
            }))}
            onChange={(v) => (debug.warehouseStage.value = v)}
          />
          <label class="dbg-time">
            {t('debug.camera', { x: debug.camera.value })}
            <input
              type="range"
              min={-CAM_RANGE}
              max={CAM_RANGE}
              step={1}
              value={debug.camera.value}
              onInput={(e) => (debug.camera.value = Number(e.currentTarget.value))}
            />
          </label>
          <p class="dbg-stats" data-testid="debug-stats">
            {t('debug.stats', { fps: s.fps, p95: s.p95, cpu: s.cpu })}
            <br />
            {t('debug.layout', {
              scale: s.scale,
              gameH: s.gameH,
              sharp: s.sharp ? t('debug.sharp') : '',
            })}
          </p>
        </section>
      )}
    </div>
  );
}
