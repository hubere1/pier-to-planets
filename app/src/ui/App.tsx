import { t } from '../l10n/index.ts';

export function App() {
  return (
    <main class="boot">
      <h1>{t('app.title')}</h1>
      <p class="subtitle">{t('app.subtitle')}</p>
      <p class="status" data-testid="boot-status">
        {t('app.status.foundation')}
      </p>
      <p class="version">{t('app.version', { version: __APP_VERSION__ })}</p>
    </main>
  );
}
