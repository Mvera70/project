import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tools',
  testMatch: /.*\.shots\.ts/,
  outputDir: 'artifacts/.playwright',
  timeout: 120_000,
  use: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
