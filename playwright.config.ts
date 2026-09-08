import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';

const systemChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const bundledChromium = chromium.executablePath();

export default defineConfig({
  testDir: 'tools',
  testMatch: /.*\.shots\.ts/,
  outputDir: 'artifacts/.playwright',
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    launchOptions: !existsSync(bundledChromium) && existsSync(systemChrome)
      ? { executablePath: systemChrome }
      : {},
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
