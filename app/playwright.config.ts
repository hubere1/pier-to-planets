import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    // Referenzgerät Hochformat (D-002): 360 × 640 CSS-px, DPR 3 = 1080 px Breite.
    {
      name: 'portrait-360',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 360, height: 640 },
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
