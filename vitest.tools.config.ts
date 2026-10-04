import { defineConfig } from 'vitest/config';

// Tests für Prüfwerkzeuge (tools/) und Grafik-Generatoren (art/).
export default defineConfig({
  test: { include: ['tools/test/**/*.test.ts', 'art/test/**/*.test.ts'] },
});
