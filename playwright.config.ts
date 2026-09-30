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
    // WebGL por software, como la reja de la PWA y `tools/graphics/shot.mjs`.
    // Sin él el relevo a 3D fallaba en silencio en el servidor y los recorridos
    // que esperan al valle en 3D —el trato, el carro, la tormenta— se quedaban
    // mirando un lienzo de 300 px (30 sep 2026). Los que miden la interfaz
    // sobre Canvas lo siguen pidiendo en la dirección (`?render=canvas`).
    launchOptions: {
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
      ...(!existsSync(bundledChromium) && existsSync(systemChrome) ? { executablePath: systemChrome } : {}),
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
