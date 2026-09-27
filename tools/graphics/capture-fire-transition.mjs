import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function browserExe() {
  const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
  if (existsSync(root)) {
    try {
      for (const dir of readdirSync(root).filter((name) => /^chromium-\d+$/.test(name)).sort().reverse()) {
        const exe = join(root, dir, 'chrome-win64', 'chrome.exe');
        if (existsSync(exe)) return exe;
      }
    } catch { /* Browser cache is outside the workspace sandbox. */ }
  }
  return 'C:/Program Files/Google/Chrome/Application/chrome.exe';
}

const browser = await chromium.launch({ executablePath: browserExe(), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const port = process.env.VITE_PORT ?? '5173';
await page.goto(`http://127.0.0.1:${port}/tools/graphics/fire-transition.html`);
await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
if (await page.evaluate(() => document.querySelector('canvas')?.getContext('webgl2')?.isContextLost())) {
  throw new Error('WebGL context lost: no valid visual capture');
}
const out = 'artifacts/graphics/G-42/fire-transition';
mkdirSync(out, { recursive: true });
for (const [day, name] of [[1, 'burning'], [2.45, 'collapsing'], [3.3, 'ruin']]) {
  await page.evaluate((value) => window.setFireDay(value), day);
  await page.locator('canvas').screenshot({ path: `${out}/${name}.png` });
}
await browser.close();
