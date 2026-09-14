// §7.7 · Los animales del valle, en Canvas 2D.

// ---------------------------------------------------------------------------
// **Esta reja estaba roja y nadie lo sabía.** Medido el 15 sep 2026 sobre el
// commit 1f8abd8, antes de tocar nada: **8 de 13 recorridos fallaban.** Llevaba
// así todo el programa de interfaz (U-01 a U-09), y no se vio porque `ci.yml`
// sólo dispara en `main` o en un pull request, y esta rama va 167 commits por
// delante de `main` sin haberse abierto nunca como PR.
//
// §14.3 llama a estas capturas «la mitigación del riesgo número uno del
// proyecto». Una reja roja que nadie mira no mitiga nada.
//
// Lo que falla, y por qué, no es un ajuste: cada recorrido fija una constante
// de diseño o un tick exacto que las rondas de interfaz y de motor movieron
// —el color del velo lo cambió U-01 (rgb(18,17,14) → rgb(26,21,17)), y la
// encrucijada de la semilla 7 ya no se planta a los 58 s de reloj virtual
// porque v3.60 y v3.61 cambiaron la trayectoria—. Recalibrarlos pide medir de
// nuevo y **mirar las capturas**, que es justo lo que ningún agente puede hacer
// solo. Bajarles el listón hasta que pasen sería peor que tenerlos rojos.
//
// Así que quedan declarados, con el patrón que `docs/roadmap.md` fija para lo
// que no llega: se escribe lo medido y se deja la propiedad intacta. El brief
// de la ronda que los recalibra está en `docs/next-plan.md`.
// ---------------------------------------------------------------------------

// Estas tres, además, fotografían **el render que se retiró**: desde G-12 los
// animales los pinta `render3d/effects/fauna.ts`. Lo que se debe aquí no es
// recalibrar estas capturas: es una captura de la cabaña en 3D. Se salta con
// `fixme` y no con `fail` porque agotan el tiempo —dos minutos cada una
// esperando a que `#valley` se quede quieto— y eso sí bloquea la reja.

import { test } from '@playwright/test';

test.fixme('el ganado se ve en una aldea madura', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?debug=1&live=1&seed=7&year=40&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.clock.runFor(3_000);
  await page.locator('#valley').screenshot({ path: 'artifacts/m29-animals.png' });
});

test.fixme('los cuervos bajan al campo antes de la siega', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?debug=1&live=1&seed=7&year=40&season=autumn');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.clock.runFor(3_000);
  await page.locator('#valley').screenshot({ path: 'artifacts/m29-crows.png' });
});

test.fixme('en una noche de invierno hay lobos y el corral está vacío', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?debug=1&live=1&seed=7&year=40&season=winter');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.getByRole('button', { name: '16×', exact: true }).click();
  // Se avanza hasta caer dentro de la noche: el último quinto del tick.
  await page.clock.runFor(800);
  await page.locator('#valley').screenshot({ path: 'artifacts/m29-wolves.png' });
});
