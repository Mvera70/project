// El Chromium con el que fotografían las herramientas gráficas, en cualquier
// máquina. Cada herramienta lo buscaba sólo en ~/AppData/Local/ms-playwright
// (Windows) y fuera de ese portátil reventaba antes de abrir la página: en el
// contenedor de la nube `model-sheet` y el banco de fauna no arrancaban.
//
// Orden: el Playwright de Windows (el más reciente), Chrome o Edge instalados,
// el navegador exacto que pide Playwright y, si falta —no hay red para
// bajarlo—, cualquier Chromium de `PLAYWRIGHT_BROWSERS_PATH`. `undefined` deja
// que Playwright decida, que es lo que hacían antes al no encontrar nada.
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const newestFirst = (root) => {
  try {
    return readdirSync(root).filter((d) => /^chromium-\d+$/u.test(d))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  } catch {
    return [];
  }
};

export function browserExe() {
  const windows = join(homedir(), 'AppData', 'Local', 'ms-playwright');
  for (const dir of newestFirst(windows)) {
    const exe = join(windows, dir, 'chrome-win64', 'chrome.exe');
    if (existsSync(exe)) return exe;
  }
  for (const exe of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ]) if (existsSync(exe)) return exe;
  const wanted = chromium.executablePath();
  if (existsSync(wanted)) return wanted;
  const shared = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (shared) {
    for (const dir of newestFirst(shared)) {
      for (const exe of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        if (existsSync(join(shared, dir, exe))) return join(shared, dir, exe);
      }
    }
  }
  return undefined;
}

/** Las opciones de `chromium.launch` con el ejecutable, si se encontró uno. */
export const withBrowser = (options = {}) => {
  const exe = browserExe();
  return exe === undefined ? options : { ...options, executablePath: exe };
};
