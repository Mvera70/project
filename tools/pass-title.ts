// U-10 · Pasar el menú de inicio como lo pasa el dedo: continuar si hay
// partida, fundar un valle nuevo si no.
//
// Vive en su propio fichero, sin un `test(...)` dentro, a propósito: la
// primera versión de esto importaba la función desde `valley.shots.ts`, y
// **importar un fichero de pruebas de Playwright registra sus pruebas** —
// `test()` se apunta al cargarse el módulo, no al ejecutarse—, así que
// `test:pwa` se puso a correr también la suite entera de capturas, con la
// configuración equivocada (otro servidor, otro puerto, otro `CANVAS`).
// Un módulo sin `test()` es el único que se puede importar sin ese efecto.
import type { Page } from '@playwright/test';

export async function passTitle(page: Page): Promise<void> {
  const title = page.locator('.title-scrim');
  await title.waitFor();
  const cont = page.locator('.title-continue');
  if (await cont.count() > 0) await cont.click();
  else await page.locator('.title-new').click();
  await title.waitFor({ state: 'detached' });
}
