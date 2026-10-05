import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // WebGL läuft per Software (SwiftShader). CI (2 Kerne): nacheinander und mit mehr Zeit.
  // Lokal höchstens 3 parallel – mit 12 Workern bremsen sich die Seiten aus und die
  // zeitabhängigen Kameratests laufen in den Timeout.
  workers: process.env['CI'] ? 1 : 3,
  timeout: process.env['CI'] ? 90_000 : 30_000,
  forbidOnly: !!process.env['CI'],
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    // WebGL im Headless-Chrome über SwiftShader (CI ohne GPU).
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
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
