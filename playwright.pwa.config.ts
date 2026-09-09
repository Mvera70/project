// §13.4's promises belong to what ships, not to the dev server: the service
// worker is only registered in a production build, so this config serves
// `dist/` through `vite preview` and drives the real artifact.
import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';

const systemChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const bundledChromium = chromium.executablePath();

export default defineConfig({
  testDir: 'tools',
  testMatch: /.*\.pwa\.ts/,
  outputDir: 'artifacts/.playwright-pwa',
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    serviceWorkers: 'allow',
    launchOptions: !existsSync(bundledChromium) && existsSync(systemChrome)
      ? { executablePath: systemChrome }
      : {},
  },
  // Dos servidores: el build en la raíz, y el mismo build bajo `/project/`
  // para el recorrido de subdirectorio. El segundo devuelve 404 hasta que
  // `npm run build` ha dejado dist/, que es justo lo que hace a Playwright
  // esperar por él sin necesidad de ordenarlos a mano.
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'node tools/subpath-server.mjs',
      url: 'http://127.0.0.1:4180/project/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
