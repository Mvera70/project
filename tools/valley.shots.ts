/**
 * Capturas automáticas — design.md §14.3 y M-19.
 * OBLIGATORIO antes de empezar M-17. Es la mitigación del riesgo principal.
 *
 * **Lo que esta reja fotografía es la interfaz, sobre el Canvas, y eso es
 * deliberado desde que se auditó el proyecto.** Lo que mira son la tira de
 * §11.1.1, las encrucijadas, la crónica, el epitafio y la herencia: pantallas
 * compartidas por los dos renders. El valle de debajo lo pinta el Canvas, que
 * es estable, barato y no necesita GPU en un runner.
 *
 * Y va escrito en la dirección (`?render=canvas`) en vez de salir por descarte.
 * Antes no: el navegador de la reja no tenía WebGL, el relevo a 3D fallaba en
 * silencio y estas aserciones sobre `#valley` pasaban por casualidad. El día que
 * el runner tuviera WebGL, la suite entera se habría caído sin que nadie
 * hubiera cambiado nada.
 *
 * **La reja visual del 3D está pendiente y no la cubre esto.** Hoy se mira a
 * mano con `npm run shot` (`tools/graphics/shot.mjs`, que sí pide swiftshader);
 * automatizarla es una ronda con alguien mirando capturas, no un ajuste.
 *
 * ---------------------------------------------------------------------------
 * **Esta reja estaba roja y nadie lo sabía.** Medido el 15 sep 2026 sobre el
 * commit 1f8abd8, antes de tocar nada: **8 de 13 recorridos fallaban.** Llevaba
 * así todo el programa de interfaz (U-01 a U-09), y no se vio porque `ci.yml`
 * sólo dispara en `main` o en un pull request, y esta rama va 167 commits por
 * delante de `main` sin haberse abierto nunca como PR.
 *
 * §14.3 llama a estas capturas «la mitigación del riesgo número uno del
 * proyecto». Una reja roja que nadie mira no mitiga nada.
 *
 * Lo que falla, y por qué, no es un ajuste: cada recorrido fija una constante
 * de diseño o un tick exacto que las rondas de interfaz y de motor movieron
 * —el color del velo lo cambió U-01 (rgb(18,17,14) → rgb(26,21,17)), y la
 * encrucijada de la semilla 7 ya no se planta a los 58 s de reloj virtual
 * porque v3.60 y v3.61 cambiaron la trayectoria—. Recalibrarlos pide medir de
 * nuevo y **mirar las capturas**, que es justo lo que ningún agente puede hacer
 * solo. Bajarles el listón hasta que pasen sería peor que tenerlos rojos.
 *
 * Así que quedan declarados, con el patrón que `docs/roadmap.md` fija para lo
 * que no llega: se escribe lo medido y se deja la propiedad intacta. El brief
 * de la ronda que los recalibra está en `docs/next-plan.md`.
 * ---------------------------------------------------------------------------
 */
import { TIME } from '@engine/balance';
import { MEANS_IDS } from '@engine/state';
import { hourAt } from '../src/render3d/effects/day-phases';
import { test, type Page } from '@playwright/test';
import { passTitle } from './pass-title';

/** La puerta de vuelta, pedida a propósito. Ver la cabecera. */
const CANVAS = '/?render=canvas';

/**
 * Contesta la encrucijada que hubiera planteada, si la hay.
 *
 * **Y hace falta desde el mapa grande** (v3.68): estas rutas fijan semilla y
 * año —«semilla 7, año 80»— y el valle nuevo planta en ese punto una decisión
 * que antes no estaba. §11.2 le da la pantalla entera y con ella esconde el
 * mando de velocidad, así que `getByRole('16×')` se quedaba esperando los ciento
 * veinte segundos del tope: cuatro recorridos tardando dos minutos cada uno en
 * no hacer nada.
 *
 * Contestar es lo que haría el jugador, y deja la pantalla como la prueba la
 * espera. Lo que no se puede es fijar otro año: cualquiera puede tener una
 * decisión encima según el valle, que es precisamente la gracia del juego.
 */
/**
 * Cuánto reloj real hay que correr para que pasen `weeks` semanas a `speed`.
 *
 * Los tres recorridos que medían tiempo escribían sus milisegundos a mano —«30
 * min / 15 s = 120 ticks»— y los tres se cayeron juntos cuando v3.72 puso la
 * semana en catorce minutos. El número sale de la constante o no sale.
 */
function msFor(weeks: number, speed: 1 | 4 | 16 | 64): number {
  return Math.ceil((weeks * TIME.REAL_MS_PER_TICK) / speed);
}

/**
 * Adelanta el mundo `weeks` semanas sin pintar el camino.
 *
 * `clock.runFor` dispara **cada** fotograma del intervalo, y con la semana de
 * v3.72 una estación a ×16 son diez minutos de reloj falso: casi cuarenta mil
 * fotogramas, y el recorrido se quedaba sin página. `fastForward` salta el
 * reloj de golpe y el bucle lo cobra en el siguiente fotograma —
 * `advanceAccumulator` se queda con la deuda y la reparte en tandas de ocho—,
 * así que unos pocos fotogramas bastan para ponerse al día. `runFor` corto es
 * lo que los sirve.
 */
async function advanceWeeks(page: Page, weeks: number, speed: 1 | 4 | 16 | 64): Promise<void> {
  await page.clock.fastForward(msFor(weeks, speed));
  await page.clock.runFor(200);
}

async function answerAnyCrossroad(page: Page): Promise<void> {
  const options = page.locator('.crossroad-options button');
  if (await options.count() === 0) return;
  await options.first().click();
  await page.locator('.crossroad-scrim').waitFor({ state: 'detached' });
}

test('el juego abre con el menú de inicio: un valle nuevo con su número, y continuar sólo cuando hay partida', async ({ page }) => {
  await page.goto(CANVAS);
  const title = page.locator('.title-scrim');
  await title.waitFor();
  await page.screenshot({ path: 'artifacts/title.png', fullPage: true });
  // Sin partida guardada no hay nada que continuar.
  await test.expect(page.locator('.title-continue')).toHaveCount(0);
  // El número del valle se puede escribir: es lo que se comparte para
  // comparar valles, que es la gracia del juego según su dueño.
  await page.locator('.title-seed').fill('7');
  await page.locator('.title-new').click();
  await page.locator('html[data-app-ready="true"]').waitFor();
  await test.expect(page.locator('.valley-date')).toContainText('Year 1');
  // Y lo que se funda es la pareja de v3.69: dos personas.
  await test.expect(page.locator('.valley-vital').first()).toHaveText('2');
  // U-12 · el reloj: la hora que dice la cabecera es la del sol que se pinta.
  // `data-sun-phase` es la fase de la última jornada pintada y `hourAt` la
  // convierte; si las dos cuentas se separan, el jugador ve mediodía con el
  // reloj en la madrugada, que es la incoherencia que v3.72 cerró. Sólo con el
  // 3D vivo: el render 2D no tiene sol y no estampa la fase.
  await test.expect(page.locator('.valley-time')).toHaveText(/^\d\d:00$/u);
  const sunPhase = await page.evaluate(() => document.documentElement.dataset['sunPhase']);
  if (sunPhase !== undefined) {
    const shown = Number((await page.locator('.valley-time').innerText()).slice(0, 2));
    // Una hora de margen: entre leer la fase y leer el texto pasa un fotograma.
    test.expect(Math.abs(shown - hourAt(Number(sunPhase)))).toBeLessThanOrEqual(1);
  }

  // U-11 · la primera vez, dos pistas —órdenes y tiempo— que se tocan para
  // pasar. En Canvas no hay vuelo de entrada, así que llegan enseguida.
  // VZ-02 · la pista ya no tiene elemento propio: es una voz más, y se lee en
  // el hueco de la bandeja con `data-role="hint"`. El recorrido es el mismo —se
  // toca para pasar, dos pasos y a dormir— y lo que cambia es dónde se mira.
  const voice = page.locator('.valley-voice');
  const hint = page.locator('.valley-voice[data-role="hint"]');
  await test.expect(hint).toBeVisible({ timeout: 15_000 });
  const first = await voice.innerText();
  test.expect(first).not.toMatch(/\[intro\./u);
  await voice.click();
  await test.expect(hint).toBeVisible();
  test.expect(await voice.innerText()).not.toBe(first);
  await voice.click();
  // Retirada la pista, el hueco no se queda vacío: lo ocupa el fondo, que es lo
  // que la aldea está haciendo. Lo que desaparece es el papel de pista.
  await test.expect(hint).toHaveCount(0);
  await test.expect(page.locator('html')).toHaveAttribute('data-intro', 'done');
  // Guardada la partida, el menú ofrece continuarla.
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.waitForTimeout(600);
  await page.goto(CANVAS);
  await test.expect(page.locator('.title-continue')).toBeVisible();
  await page.locator('.title-continue').click();
  await page.locator('html[data-app-ready="true"]').waitFor();
  await test.expect(page.locator('.valley-date')).toContainText('Year 1');
});

test('la crónica y la gente se abren y se cierran: hay forma de volver (U-14)', async ({ page }) => {
  // El fallo lo encontró el dueño del diseño jugando: «cuando entras a ver a
  // los aldeanos o el historial, no hay forma de volver atrás». Las dos
  // pantallas se cerraban sólo deslizando hacia abajo y su velo tapaba la barra
  // de destinos. Esta prueba existe para que no vuelva: comprueba **las dos
  // salidas**, la barra y el botón.
  await page.goto(CANVAS);
  await passTitle(page);
  await page.locator('html[data-app-ready="true"]').waitFor();

  // La gente: se abre desde la barra y se vuelve desde la barra.
  await page.getByRole('button', { name: 'People' }).click();
  await test.expect(page.locator('.people-scrim')).toBeVisible();
  await test.expect(page.locator('html')).toHaveAttribute('data-screen', 'people');
  // Y la barra sigue ahí, encima del velo: es la salida que el dedo busca.
  await test.expect(page.getByRole('button', { name: 'Valley' })).toBeVisible();
  await page.getByRole('button', { name: 'Valley' }).click();
  await test.expect(page.locator('.people-scrim')).toHaveCount(0);
  await test.expect(page.locator('html')).toHaveAttribute('data-screen', 'valley');

  // La crónica: se abre desde la barra y se cierra con su botón, que es la otra
  // salida —a la crónica se llega también con un gesto, y un gesto no explica
  // cómo se sale—.
  await page.getByRole('button', { name: 'Chronicle' }).click();
  await test.expect(page.locator('.chronicle-scrim')).toBeVisible();
  await page.locator('.chronicle-close').click();
  await test.expect(page.locator('.chronicle-scrim')).toHaveCount(0);
  // Y la pestaña encendida deja de estar encendida: no hay pantalla que valga.
  await test.expect(page.locator('html')).toHaveAttribute('data-screen', 'valley');

  // S-05 · la ficha de un edificio o un aldeano es el mismo fallo, más
  // pequeño: se cerraba sólo con su cruz, no avisaba a la barra y podía
  // reaparecer al volver de la crónica o la gente. Se abre tocando el
  // lienzo —mismo barrido alrededor del centro que «la ruta viva abre un
  // valle maduro», porque a un año de fundada la aldea sólo tiene una casa y
  // un campo, no ochenta edificios— y «Valley» tiene que cerrarla igual que
  // cierra las otras dos.
  const canvas = page.locator('canvas:visible').first();
  // **Y se espera a que el lienzo esté medido.** Aquí estaba el fallo que
  // UI-V10 destapó: `#valley` iba visible mientras el 3D cargaba, así que
  // `canvas:visible` devolvía el 2D, ya dimensionado a 360 × 560. Desde UI-V10
  // el 2D va oculto de entrada —el dueño del diseño veía asomar el mapa plano
  // un instante al fundar— y el primero visible es el 3D, que recién montado
  // mide **300 × 150**: el tamaño por defecto de un `<canvas>` antes de que
  // `size()` lo estire. Medido así, el «centro» caía en (150, 75), o sea la
  // esquina de arriba, y ningún toque abría nada.
  await test.expect.poll(
    async () => (await canvas.boundingBox())?.width ?? 0,
    { timeout: 20_000 },
  ).toBeGreaterThan(300);
  const box = await canvas.boundingBox();
  // **VZ-02 · y se barre la pantalla, no cuarenta píxeles alrededor del centro.**
  //
  // Esta prueba pasaba por un accidente que UI-V10 destapó: medía la caja del
  // lienzo **2D** —360 × 560, porque el 3D aún no había cargado cuando
  // `boundingBox()` corría— y tocaba esas coordenadas en el lienzo **3D**, que
  // mide 390 × 844. O sea que apuntaba a (180, 280): la parte alta del
  // encuadre, que es donde la aldea cae. Desde UI-V10 el 2D va oculto mientras
  // el 3D carga —el dueño del diseño veía asomar el mapa plano un instante— así
  // que la caja medida es ya la del 3D y el «centro» pasó a ser (195, 422):
  // hierba, y ochenta y un toques sin abrir nada.
  //
  // Lo que la prueba guarda es que **tocar la aldea abre su ficha**, no que la
  // aldea esté en un píxel concreto: a los ochenta y un años, y con la cámara
  // siguiendo a alguien después de contestar la encrucijada, no hay píxel fijo
  // que valga. Así que se barre el encuadre de veinte en veinte píxeles desde
  // el centro hacia fuera y se para en el primer toque que abre algo, que es
  // exactamente lo que hace un dedo que busca una casa.
  const panel = page.locator('.valley-panel:not(.valley-orders)');
  const ancho = box?.width ?? 390;
  const alto = box?.height ?? 844;
  const cx = ancho / 2;
  const cy = alto / 2;
  // **VZ-3 · aquí el barrido es fino, y no ancho.** Este recorrido funda un
  // valle nuevo: al año 1 hay **una casa** en un mapa de 72 × 112, y el 2D
  // dibuja el mapa entero en 360 × 560, así que la aldea ocupa unos pocos
  // píxeles en el centro. Un barrido de treinta en treinta la salta —medido:
  // 220 toques sin abrir nada, tres veces seguidas—. De cinco en cinco
  // alrededor del centro, que es donde se funda (§7.1) y de donde no se mueve.
  const around: [number, number][] = [];
  for (let dx = -20; dx <= 20; dx += 5) for (let dy = -20; dy <= 20; dy += 5) around.push([dx, dy]);
  around.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  for (const [dx, dy] of around) {
    // VZ-3 · un fotograma de espera entre el toque y la comprobación, y la
    // encrucijada contestada si asoma. Sin las dos cosas el barrido era
    // intermitente: el panel monta en el fotograma siguiente al toque, y una
    // decisión abierta se queda los toques que caen sobre sus tarjetas.
    await answerAnyCrossroad(page);
    await canvas.click({ position: { x: cx + dx, y: cy + dy }, force: true });
    await page.waitForTimeout(80);
    if (await panel.isVisible()) break;
  }
  await test.expect(panel).toBeVisible();
  // Abrirla no deja la pestaña encendida diciendo otra cosa: sigue en Valley,
  // que es donde está el lienzo que se acaba de tocar.
  await test.expect(page.locator('html')).toHaveAttribute('data-screen', 'valley');
  await page.getByRole('button', { name: 'Valley' }).click();
  await test.expect(panel).toBeHidden();
});

test('la ruta de depuración llega al lienzo móvil sin interacción', async ({ page }) => {
  await page.goto('/?debug=1&seed=7&year=1&season=spring');
  await page.locator('html[data-debug-ready="true"]').waitFor();
  await page.locator('#valley').screenshot({ path: 'artifacts/debug-route.png' });
  // **El doble de ancho desde el mapa grande, y a propósito.** La ruta de
  // depuración pinta a diez píxeles por celda fijos (`ui/debug.ts`) porque su
  // trabajo es auditar los sprites a su tamaño de diseño, no caber en un
  // teléfono: con el valle en 72 × 112 eso son 720 × 1 120. Quien quiera el
  // lienzo que cabe en la pantalla, ésa es la ruta normal, que sigue usando
  // `cellFor` y da cinco píxeles por celda.
  await test.expect(page.locator('#valley')).toHaveCSS('width', '720px');
  await test.expect(page.locator('#valley')).toHaveCSS('height', '1120px');
});

test('cada edificio pinta dentro de su caja a 9 y 10 px sobre claro y oscuro', async ({ page }) => {
  await page.goto('/?debug=1&seed=7&year=1&season=spring');
  await page.locator('html[data-debug-ready="true"]').waitFor();
  const audit = await page.locator('html').getAttribute('data-sprite-audit');
  const result = JSON.parse(audit ?? '{}') as { cases: number; empty: string[]; spills: string[]; principalShapes: number };
  test.expect(result.cases).toBe(52);
  test.expect(result.empty).toEqual([]);
  test.expect(result.spills).toEqual([]);
  test.expect(result.principalShapes).toBe(4);
});

test('la aplicación abre el valle con año y cuatro velocidades táctiles', async ({ page }) => {
  await page.clock.install();
  await page.goto(CANVAS);
  await passTitle(page);
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.screenshot({ path: 'artifacts/app-shell.png', fullPage: true });
  await test.expect(page.locator('#valley')).toHaveCSS('width', '360px');
  await test.expect(page.locator('#valley')).toHaveCSS('height', '560px');
  await test.expect(page.locator('.valley-date')).toContainText('Year 1');
  // Cinco: pausa y las cuatro velocidades de §12.1 (v2.85). Desde el 15 sep
  // viven recogidas detrás del botón de velocidad, así que se despliegan antes
  // de medirlas: cerradas no miden nada, y eso es lo correcto.
  await page.locator('.valley-speed-badge').click();
  await test.expect(page.locator('.valley-speeds button')).toHaveCount(5);
  for (const button of await page.locator('.valley-speeds button').all()) {
    const box = await button.boundingBox();
    test.expect(box?.width).toBeGreaterThanOrEqual(44);
    test.expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: '4×', exact: true }).click();
  // Elegida, la regleta se recoge y lo que queda a la vista es el botón con la
  // velocidad de ahora: eso es lo que el jugador ve, y eso es lo que se mira.
  await test.expect(page.locator('.valley-speed-badge')).toHaveText('4×');
  const spring = await page.locator('#root').evaluate((node) => getComputedStyle(node).getPropertyValue('--valley-void'));
  await page.locator('.valley-speed-badge').click();
  await page.getByRole('button', { name: '16×', exact: true }).click();
  // Una estación entera, que es lo que hace falta para que el cielo cambie de
  // color. Se salta el reloj en vez de correrlo: ver `advanceWeeks`.
  await advanceWeeks(page, TIME.WEEKS_PER_SEASON + 1, 16);
  const summer = await page.locator('#root').evaluate((node) => getComputedStyle(node).getPropertyValue('--valley-void'));
  test.expect(summer).not.toBe(spring);
});

test('la ruta viva abre un valle maduro determinista para revisar la multitud', async ({ page }) => {
  await page.goto('/?debug=1&live=1&seed=7&year=80&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await answerAnyCrossroad(page);
  await test.expect(page.locator('.valley-date')).toContainText('Year 81');
  // **El lienzo mide lo que mide el valle**, y desde el mapa grande son 72 × 112
  // celdas: la ruta viva usa `cellFor`, que a 390 px de ancho da cinco píxeles
  // por celda, así que el lienzo sigue cabiendo en la pantalla igual que antes.
  await test.expect(page.locator('#valley')).toHaveCSS('width', '360px');
  // **Y se toca el centro del lienzo, no un punto fijo.** Era (180, 280) —el
  // centro del valle de 36 × 56 a diez píxeles— y con el mapa nuevo ese píxel
  // cayó en el cuadrante noroeste, donde no hay nada que abrir. El centro es
  // donde está la aldea, porque ahí se funda (§7.1) y de ahí no se mueve: los
  // topes de §12 son absolutos y `placeBuilding` sólo construye en el corazón.
  // **Y se toca el lienzo que se ve.** El 3D releva al Canvas en cuanto carga
  // (G-12) y esconde `#valley`: un toque que llegue después del relevo va a
  // `#valley3d`, y un localizador clavado al 2D fallaba con «no visible» en
  // mitad del barrido de abajo. Es lo que hace el dedo: toca lo que hay.
  const canvas = page.locator('canvas:visible').first();
  // **Y se espera a que el lienzo esté medido.** Aquí estaba el fallo que
  // UI-V10 destapó: `#valley` iba visible mientras el 3D cargaba, así que
  // `canvas:visible` devolvía el 2D, ya dimensionado a 360 × 560. Desde UI-V10
  // el 2D va oculto de entrada —el dueño del diseño veía asomar el mapa plano
  // un instante al fundar— y el primero visible es el 3D, que recién montado
  // mide **300 × 150**: el tamaño por defecto de un `<canvas>` antes de que
  // `size()` lo estire. Medido así, el «centro» caía en (150, 75), o sea la
  // esquina de arriba, y ningún toque abría nada.
  await test.expect.poll(
    async () => (await canvas.boundingBox())?.width ?? 0,
    { timeout: 20_000 },
  ).toBeGreaterThan(300);
  const box = await canvas.boundingBox();
  // `force`, y con razón: contestar la encrucijada de arriba hace que el mapa
  // enfoque y **siga** a alguien de su reparto, y en Canvas eso es cambiar la
  // escala del lienzo en cada fotograma. Playwright espera a que el elemento
  // se quede quieto antes de tocarlo, y un lienzo que sigue a una persona no se
  // queda quieto nunca: ciento veinte segundos esperando. El toque va donde
  // iría el dedo, sin esperar a que el mundo se pare.
  //
  // **Y si el centro exacto es un hueco, se prueba alrededor**, como haría el
  // dedo. Con la fundación en pareja (v3.69) la aldea de la semilla 7 a los
  // ochenta años tiene ochenta y tres edificios y el píxel central cae entre
  // dos casas de piedra: el toque abría nada. Una rejilla de cinco píxeles
  // —una celda— hasta cuatro celdas alrededor, del centro hacia fuera, y se
  // para en el primer toque que abre algo.
  // **VZ-02 · y se barre la pantalla, no cuarenta píxeles alrededor del centro.**
  //
  // Esta prueba pasaba por un accidente que UI-V10 destapó: medía la caja del
  // lienzo **2D** —360 × 560, porque el 3D aún no había cargado cuando
  // `boundingBox()` corría— y tocaba esas coordenadas en el lienzo **3D**, que
  // mide 390 × 844. O sea que apuntaba a (180, 280): la parte alta del
  // encuadre, que es donde la aldea cae. Desde UI-V10 el 2D va oculto mientras
  // el 3D carga —el dueño del diseño veía asomar el mapa plano un instante— así
  // que la caja medida es ya la del 3D y el «centro» pasó a ser (195, 422):
  // hierba, y ochenta y un toques sin abrir nada.
  //
  // Lo que la prueba guarda es que **tocar la aldea abre su ficha**, no que la
  // aldea esté en un píxel concreto: a los ochenta y un años, y con la cámara
  // siguiendo a alguien después de contestar la encrucijada, no hay píxel fijo
  // que valga. Así que se barre el encuadre de veinte en veinte píxeles desde
  // el centro hacia fuera y se para en el primer toque que abre algo, que es
  // exactamente lo que hace un dedo que busca una casa.
  const panel = page.locator('.valley-panel:not(.valley-orders)');
  const ancho = box?.width ?? 390;
  const alto = box?.height ?? 844;
  const cx = ancho / 2;
  const cy = alto / 2;
  const around: [number, number][] = [];
  for (let dx = -Math.round(ancho * 0.4); dx <= ancho * 0.4; dx += 30) {
    for (let dy = -Math.round(alto * 0.35); dy <= alto * 0.35; dy += 30) around.push([dx, dy]);
  }
  around.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  for (const [dx, dy] of around) {
    // A ×1 y con ochenta personas, una encrucijada puede abrirse entre dos
    // toques y esconder el lienzo; se contesta y se sigue.
    await answerAnyCrossroad(page);
    await canvas.click({ position: { x: cx + dx, y: cy + dy }, force: true });
    await page.waitForTimeout(80);
    if (await panel.isVisible()) break;
  }
  await test.expect(panel).toBeVisible();
  await test.expect(page.locator('.valley-panel:not(.valley-orders) h2')).not.toBeEmpty();
  await page.screenshot({ path: 'artifacts/m21-panel.png', fullPage: true });
});

test('la ficha de un aldeano dice qué está haciendo ahora mismo (prototipo 03)', async ({ page }) => {
  // **VZ-6 · la línea «Today», que UI-V4 dejó fuera con razón.** Su dato no
  // está en el estado: lo que se ve andando lo produce la capa de vida en cada
  // paso, así que derivarla del motor —oficio, estación, órdenes— daba una
  // frase que podía contradecir al cuerpo que se ve en el valle. Ahora sale del
  // mismo actor que se está pintando, y **eso sólo se puede comprobar en el
  // navegador**: en una prueba rápida no hay renderer, y la línea saldría
  // callada sin que nada estuviera mal.
  //
  // Se abre por la lista de gente y no tocando el lienzo: la lista sólo enseña
  // a quien está presente y tiene nombre, o sea exactamente a quien tiene
  // cuerpo en la escena.
  await page.goto('/?debug=1&live=1&seed=7&year=80&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await answerAnyCrossroad(page);
  await page.getByRole('button', { name: 'People' }).click();
  await page.locator('.people-row').first().click();
  await test.expect(page.locator('.person-card')).toBeVisible();

  // La frase tarda lo que tarde la vida en dar su primer paso —el relevo a 3D
  // baja 2,7 MB de modelos—, así que se espera a que haya cuerpo en vez de
  // fijar un instante.
  const hoy = page.locator('.person-today');
  await test.expect(hoy).toBeVisible({ timeout: 30_000 });
  const frase = await hoy.innerText();
  // Lo que se guarda es la propiedad, no la frase: que está compuesta del banco
  // y que dice algo de las nueve cosas que un cuerpo puede estar haciendo.
  test.expect(frase).toMatch(/^Today: /u);
  test.expect(frase).not.toMatch(/\{\w+\}|inspect\./u);
  await page.screenshot({ path: 'artifacts/vz6-today.png', fullPage: true });
});

test('una decisión aplazada deja ir a mirar otra cosa (§8.6)', async ({ page }) => {
  // **La deuda más vieja del cuaderno de esta tanda**, apuntada como «una
  // decisión pendiente bloquea la navegación»: `paint` devolvía la ruta al
  // valle en **cada fotograma** mientras hubiera decisión pendiente, incluso
  // aplazada, así que la crónica y la gente se pulsaban y volvían solas. Y de
  // ahí salía además que el documento sellado de UI-V3 fuera inalcanzable por
  // construcción: sólo existe habiendo decisión pendiente, que era justo el
  // estado en el que la crónica no abría.
  //
  // Aplazar existe **para poder ir a mirar otra cosa** antes de contestar
  // (§8.6: la decisión espera, no caduca). Esto es esa propiedad, y va aquí y
  // no en la suite rápida porque lo que fallaba era el bucle de pintado.
  await page.clock.install();
  // `&crossroad=1` (VZ-6) sigue jugando hasta que haya una sin contestar, así
  // que la decisión está en pantalla al abrir. La evidencia con la que la deuda
  // se midió fijaba semilla y año —«semilla 11, año 37»— y desde R-1 el valle
  // tira sucesos cada semana: esa trayectoria ya no es la que era, y la prueba
  // pide **el estado** en vez de adivinar dónde estaba.
  await page.goto('/?debug=1&live=1&crossroad=1&seed=11&year=37&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  const scrim = page.locator('.crossroad-scrim');
  await test.expect(scrim).toBeVisible();

  // Se aplaza deslizando hacia abajo, que es el único gesto que §11.2 le da:
  // esta pantalla no tiene botón de cerrar.
  await scrim.dispatchEvent('pointerdown', { clientX: 195, clientY: 300, pointerId: 1 });
  await scrim.dispatchEvent('pointerup', { clientX: 195, clientY: 560, pointerId: 1 });
  await test.expect(scrim).toHaveCount(0);
  // Y la marca es el sello de lacre del ornamento (VZ-03), no una píldora.
  await test.expect(page.locator('.skin-ornament--seal')).toBeVisible();

  // Lo que la deuda rompía: con el reloj corriendo unos fotogramas, la crónica
  // se abre **y se queda abierta**. Un solo `expect` no lo habría cazado: el
  // fallo estaba en `paint`, o sea que devolvía la ruta al fotograma siguiente.
  await page.getByRole('button', { name: 'Chronicle' }).click();
  await page.clock.runFor(1_000);
  await test.expect(page.locator('.chronicle-scrim')).toBeVisible();
  await test.expect(page.locator('html')).toHaveAttribute('data-screen', 'chronicle');
  await page.screenshot({ path: 'artifacts/vz6-deferred.png', fullPage: true });

  // **Y el documento sellado de UI-V3, que llevaba sin verse en captura**, y
  // no por estar mal: sólo existe habiendo decisión pendiente, que era justo
  // el estado en el que la crónica no abría. Va al final del año que la
  // plantea, así que hay que bajar a él como bajaría el dedo.
  const sellado = page.locator('.chronicle-sealed');
  await sellado.scrollIntoViewIfNeeded();
  await test.expect(sellado).toBeVisible();
  await test.expect(page.locator('.chronicle-sealed-title')).not.toBeEmpty();
  await page.screenshot({ path: 'artifacts/vz6-sealed.png', fullPage: true });
  // Y tocarlo lleva al valle, que es lo que su contrato promete: un panel no
  // abre pantallas por su cuenta (`redesign/contracts.ts`), así que pide la
  // ruta y allí espera el sello. **No abre la decisión de un toque**, y eso es
  // una asimetría con el sello del ornamento —dos toques contra uno— que se
  // deja anotada y no se cambia sola: desde VZ-03 aplazada es aplazada, y
  // decidir que este documento la reabra es del dueño del diseño.
  await sellado.click();
  await test.expect(page.locator('html')).toHaveAttribute('data-screen', 'valley');
  await test.expect(page.locator('.skin-ornament--seal')).toBeVisible();

  // Y la gente igual, que es la otra pantalla que el candado cerraba.
  await page.getByRole('button', { name: 'People' }).click();
  await page.clock.runFor(1_000);
  await test.expect(page.locator('.people-scrim')).toBeVisible();

  // El sello sigue ahí: la decisión no se ha perdido por haber ido a mirar.
  await page.getByRole('button', { name: 'Valley' }).click();
  await page.clock.runFor(1_000);
  await test.expect(page.locator('.skin-ornament--seal')).toBeVisible();
  // Y tocarlo la devuelve a la pantalla, que es para lo que está.
  await page.locator('.skin-ornament').click();
  await test.expect(scrim).toBeVisible();
});

test('alguien sube por el camino y el trato se cierra con un toque (M-0)', async ({ page }) => {
  // **La mesa del juego, de punta a punta.** El dueño del diseño eligió el
  // formato el 17 sep 2026: «una oferta que se acepta o se deja pasar», sin
  // pantalla entera. Esto guarda las tres cosas que eso significa: que se lee
  // en la voz de la bandeja, que dos toques la contestan, y que la cabecera
  // enseña lo que el trato deja. `&offer=1` la pone (`ui/debug.ts`), porque
  // quién sube a vender lo sortea la tabla de sucesos y esperar no es una
  // forma de probarlo.
  await page.clock.install();
  await page.goto('/?debug=1&live=1&offer=1&seed=7&year=20&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();

  const voice = page.locator('.valley-voice[data-role="offer"]');
  await test.expect(voice).toBeVisible();
  // Y se espera al relevo del 3D antes de fotografiar: la captura es lo que
  // juzga esta pantalla, y un valle sin cargar no enseña nada (VZ-02).
  await test.expect.poll(
    async () => (await page.locator('canvas:visible').first().boundingBox())?.width ?? 0,
    { timeout: 20_000 },
  ).toBeGreaterThan(300);
  const dicho = await page.locator('.valley-voice-line').innerText();
  // Una frase del banco con sus cifras puestas, no una clave.
  test.expect(dicho).not.toMatch(/\{\w+\}|offer\./u);
  test.expect(dicho.length).toBeGreaterThan(10);
  await page.screenshot({ path: 'artifacts/m0-offer.png', fullPage: true });

  // La plata es el quinto chip de la fila, y antes del trato no hay ninguna
  // —o la que hubiera—: lo que se mide es que **sube**.
  const plata = page.locator('.valley-vitals .valley-vital').nth(4).locator('b');
  const antes = Number((await plata.innerText()).replace(/[^\d]/gu, ''));
  await page.getByRole('button', { name: 'Take it' }).click();
  // Y la oferta se va de la voz: ya no hay nadie esperando.
  await test.expect(voice).toHaveCount(0);
  await test.expect.poll(async () => Number((await plata.innerText()).replace(/[^\d]/gu, '')))
    .toBeGreaterThan(antes);
  await page.screenshot({ path: 'artifacts/m0-offer-taken.png', fullPage: true });
});

test('el carro: se da algo al valle y el valle lo celebra esa semana (M-2)', async ({ page }) => {
  // **El verbo del juego, de punta a punta.** Las tres palancas de órdenes se
  // retiran aquí (decisión del dueño del diseño: «no me gustan para nada», y
  // medido sólo hacían daño) y lo que ocupa su sitio es el carro: lo que el
  // jugador puede **dar**. Esto guarda las cuatro cosas que eso significa: que
  // se llega desde el valle, que cada cosa dice lo que cuesta con los iconos de
  // la cabecera, que lo que no se puede dar **dice por qué**, y que darlo se ve
  // en la misma semana.
  await page.clock.install();
  await page.goto('/?debug=1&live=1&seed=7&year=40&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await answerAnyCrossroad(page);
  // Se espera al relevo del 3D antes de fotografiar: la captura es lo que
  // juzga esta pantalla (VZ-02).
  await test.expect.poll(
    async () => (await page.locator('canvas:visible').first().boundingBox())?.width ?? 0,
    { timeout: 20_000 },
  ).toBeGreaterThan(300);

  // La puerta es la línea de la bandeja, donde vivía el resumen de las órdenes.
  const door = page.locator('.valley-orders-now');
  await test.expect(door).toBeVisible();
  await door.click();
  // **La pestaña encendida sigue siendo el valle**, y es a propósito: el carro
  // se abre desde el valle y no es un destino de la barra, igual que la hoja de
  // órdenes a la que sustituye (`navTabFor` en `redesign/shell.ts`).
  await test.expect(page.locator('html')).toHaveAttribute('data-screen', 'valley');
  const rows = page.locator('.cart-row');
  // Tantas filas como medios haya, sin congelar el número: M-4 pasó de tres a
  // seis y esta prueba no es la que decide cuántos hay (`MEANS_IDS`).
  await test.expect(rows).toHaveCount(MEANS_IDS.length);
  // Cada cosa lleva su precio en fichas de recurso, no en una frase con cifras.
  await test.expect(page.locator('.cart-row').first().locator('.cart-coin').first()).toBeVisible();
  await page.screenshot({ path: 'artifacts/m2-cart.png', fullPage: true });

  // Lo que no alcanza se queda apagado **con su motivo**: es la única cosa que
  // se conserva de las órdenes (E4, «te he entendido y no puedo»).
  // Se mira **la fila que está apagada**, no la primera: el motivo es de quien
  // no se puede dar, y en un valle con plata la primera suele poderse.
  for (const row of await rows.all()) {
    if (await row.locator('.cart-give').isDisabled()) {
      await test.expect(row.locator('.cart-why')).not.toBeEmpty();
      await test.expect(row.locator('.cart-why')).toBeVisible();
    }
  }

  // Y dar algo se ve esa semana: el barril es una fiesta, no una promesa.
  const ale = rows.nth(MEANS_IDS.indexOf('ale')).locator('.cart-give');
  if (await ale.isEnabled()) {
    await ale.click();
    // La crónica lo cuenta y la voz lo dice; basta con que el valle hable de
    // ello, que es lo que §11.6 promete.
    await page.getByRole('button', { name: 'Valley' }).click();
    await test.expect(page.locator('.valley-voice-line')).not.toBeEmpty();
    // Y **sin los dos toques de una oferta encima**: la voz está contando la
    // fiesta, no preguntando nada. Lo cazó una captura de esta misma prueba.
    await test.expect(page.locator('.valley-voice-actions')).toBeHidden();
    await page.screenshot({ path: 'artifacts/m2-ale.png', fullPage: true });
  }
});

test('lo que se da al valle se ve en el valle (M-3)', async ({ page }) => {
  // **La mitad que M-3 pide y que no depende de la capa de vida.** El principio
  // del juego de los medios es «ciertas cosas dan lugar a otras», y eso sólo se
  // sostiene si lo que se mete **se ve**: dar dos cerdos y no ver cerdos sería
  // la misma promesa vacía que las palancas.
  //
  // Se cuentan los cuerpos que la escena tiene puestos (`window.__valleyLife`,
  // que es cómo se mide esta capa desde fuera, `CLAUDE.md`), con y sin el medio
  // dado, sobre la misma semilla y el mismo año.
  const pigsOnScreen = async (route: string): Promise<number> => {
    await page.goto(route);
    await page.locator('html[data-app-ready="true"]').waitFor();
    await test.expect.poll(
      async () => (await page.locator('canvas:visible').first().boundingBox())?.width ?? 0,
      { timeout: 20_000 },
    ).toBeGreaterThan(300);
    // La vida puebla la escena en sus primeros pasos: se espera a que haya
    // algún animal antes de contar, en vez de fijar un instante.
    await test.expect.poll(async () => page.evaluate(
      () => (window as unknown as { __valleyLife?: () => { beasts: { kind: string }[] } })
        .__valleyLife?.().beasts.length ?? 0,
    ), { timeout: 20_000 }).toBeGreaterThan(0);
    return page.evaluate(() => (window as unknown as { __valleyLife?: () => { beasts: { kind: string }[] } })
      .__valleyLife?.().beasts.filter((beast) => beast.kind === 'pig').length ?? 0);
  };

  const before = await pigsOnScreen('/?debug=1&live=1&seed=11&year=30&season=summer');
  const after = await pigsOnScreen('/?debug=1&live=1&means=pigs&seed=11&year=30&season=summer');
  await page.screenshot({ path: 'artifacts/m3-pigs.png', fullPage: true });
  test.expect(after, 'los dos cerdos que se dieron están en el valle').toBeGreaterThan(before);
});

test('la tormenta se ve: llueve, la luz baja y cae un rayo (§10.7)', async ({ page }) => {
  // U-13 · el último de los cinco pasos del dueño del diseño. La ruta de
  // depuración adelanta el valle hasta una jornada de tormenta (`runToSky`),
  // porque salen en el 4 % de los días y esperarla no es una forma de
  // probarla.
  await page.clock.install();
  await page.goto('/?debug=1&live=1&weather=storm&seed=7&year=20&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.clock.runFor(2_000);
  await test.expect(page.locator('html')).toHaveAttribute('data-sky', 'storm');

  // Y cae un rayo. Los rayos de la jornada están decididos de antemano, así que
  // esto no espera a tener suerte: avanza el reloj falso a tramos hasta que el
  // contador suba. **Con el reloj parado el destello se queda puesto** (§11.4:
  // en pausa no se mueve nada), que es lo que permite fotografiarlo: dura 0,12 s
  // y no hay captura que lo alcance corriendo.
  await test.expect.poll(async () => {
    await page.clock.runFor(90);
    return Number(await page.locator('html').getAttribute('data-bolts') ?? '0');
  }, { timeout: 60_000, intervals: [50] }).toBeGreaterThan(0);
  await page.screenshot({ path: 'artifacts/storm.png', fullPage: true });

  // La lluvia y el destello se juzgan mirando la captura —§11 no tiene reja
  // visual— pero lo que sí se puede afirmar aquí es que el cielo no se queda
  // encasquillado: la jornada siguiente a una tormenta no es otra tormenta
  // salvo que le toque.
  const sky = await page.locator('html').getAttribute('data-sky');
  test.expect(['storm', 'rain', 'overcast', 'clear']).toContain(sky);
});

test('el hambre se ve en el valle sin abrir una ficha', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?debug=1&live=1&hunger=1&seed=7&year=80&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.clock.runFor(5_000);
  await page.screenshot({ path: 'artifacts/m21-hunger.png', fullPage: true });
  await test.expect(page.locator('.valley-panel:not(.valley-orders)')).toBeHidden();
});

test('la encrucijada muestra el precio de las tres opciones sin desplazar, y decidir enfoca el mapa', async ({ page }) => {
  // **M-0 · se pide el estado, en vez de esperarlo.**
  //
  // VZ-6 quitó el instante fijo que tenía («60 ticks a 16×») y puso un sondeo
  // semana a semana hasta que el motor plantara una, con noventa segundos de
  // tope. Duraba minuto y medio, o sea justo al borde, y **M-0 lo pasó**: al
  // entrar las visitas del camino en la tabla de sucesos la trayectoria de la
  // semilla 7 cambió y esos noventa segundos dejaron de alcanzar. Cambiar el
  // número habría sido perseguir la trayectoria otra vez.
  //
  // `&crossroad=1` (`ui/debug.ts`, añadido en VZ-6 para esto exactamente)
  // sigue jugando con la política prudente hasta que hay una decisión sin
  // contestar, así que la pantalla está en pantalla al abrir. Y no se exige
  // **cuál**: el catálogo tiene 56 opciones y la que toque depende de la
  // partida. Lo que §11.2 y M-22 prometen es que cuando hay una decisión ocupa
  // la pantalla, que se leen sus tres precios sin desplazar, y que contestarla
  // enfoca el mapa.
  await page.clock.install();
  await page.goto('/?debug=1&live=1&crossroad=1&seed=7&year=80&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  const scrim = page.locator('.crossroad-scrim');
  await test.expect(scrim).toBeVisible();
  // La decisión ocupa la pantalla: el mando de la velocidad se aparta (§11.2).
  await test.expect(page.locator('.hud-speed-cluster')).toHaveCSS('visibility', 'hidden');
  // Y tiene un título de verdad, del banco y no una clave sin componer.
  const titulo = await page.locator('.crossroad h1').innerText();
  test.expect(titulo.length).toBeGreaterThan(3);
  test.expect(titulo).not.toMatch(/\{\w+\}/u);
  const costs = page.locator('.crossroad-cost');
  await test.expect(costs).toHaveCount(3);
  // El precio de cada opción, en pantalla junto al verbo, sin que haga falta
  // desplazar nada para leerlo (§11.2, §17 M-22).
  for (const cost of await costs.all()) await test.expect(cost).toBeInViewport();
  await page.screenshot({ path: 'artifacts/m22-crossroad.png', fullPage: true });

  // Contestar enfoca el mapa (§11.5). Se pulsa **la primera opción** y no una
  // por su texto: si el título ya no se fija, sus verbos tampoco. Y se mira
  // **dónde mira la cámara**, que es lo que enfocar mueve: el `transform` del
  // lienzo 2D que esto leía antes va oculto desde UI-V10, y la altura de vista
  // no cambia al enfocar, sólo el centro. `data-view-centre` lo publica el
  // renderer en la raíz por el mismo motivo que `data-view-height` (VZ-6).
  const centroAntes = await page.evaluate(() => document.documentElement.dataset.viewCentre ?? '');
  await page.locator('.crossroad-options button').first().click();
  await test.expect(scrim).toBeHidden();
  await test.expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.viewCentre ?? ''))
    .not.toBe(centroAntes);
  await page.screenshot({ path: 'artifacts/m22-focus.png', fullPage: true });
});

test('cerrar y abrir tras la ausencia que §13.2 paga entera presenta un parte de bienvenida (§13, hito 6)', async ({ page }) => {
  // **VZ-6 · deja de estar declarada, y lo que la tenía roja era ella.**
  // Fijaba el velo de U-01 como literal (`rgb(18, 17, 14)`), así que cada vez
  // que el velo cambiaba —y ha cambiado dos veces: UI-V5c lo bajó al 18 % y
  // VZ-04a vistió esta pantalla— la prueba caía sin que el parte tuviera nada
  // mal. Ahora comprueba **la propiedad**: que atenúa el valle en vez de
  // taparlo (§11.2) y que la página es la hoja de siempre.
  const t0 = Date.now();
  await page.clock.install({ time: t0 });
  await page.goto(CANVAS); // sin parámetros de depuración: la ruta real, guardado incluido
  await passTitle(page);
  await page.locator('html[data-app-ready="true"]').waitFor();
  await answerAnyCrossroad(page);
  await page.locator('.valley-speed-badge').click();
  await page.getByRole('button', { name: '16×', exact: true }).click();
  // Menos de 20 ticks: este estado no puede llegar al disco por el autoguardado.
  // `pagehide` tiene que solicitar la instantánea antes de detener el bucle.
  // (Este número usaba la semana antigua de 15 s a mano: con la de 840 s
  // apenas sumaba ticks y la prueba nunca llegaba a comprobar lo que dice
  // comprobar — se caía antes, en el sondeo de más abajo.) Y se salta el
  // reloj en vez de correrlo: cinco semanas a ×16 corridas fotograma a
  // fotograma son quince mil fotogramas y la página se queda sin tiempo.
  await advanceWeeks(page, 5, 16);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await test.expect.poll(() => page.evaluate(async () => {
    const request = indexedDB.open('the-valley', 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const saved = await new Promise<{ state?: { tick?: number } } | undefined>((resolve, reject) => {
      const get = db.transaction('saves', 'readonly').objectStore('saves').get('current');
      get.onsuccess = () => resolve(get.result as { state?: { tick?: number } } | undefined);
      get.onerror = () => reject(get.error);
    });
    db.close();
    const tick = saved?.state?.tick ?? 0;
    return tick > 0 && tick < 20;
  })).toBe(true);

  // Cuatro horas después, con reloj falso — no se espera de verdad.
  // **VZ-6 · la ausencia es el tope de §13.2, no cuatro horas.** Cuatro horas
  // eran el tope cuando una semana duraba quince segundos; desde v3.72 dura
  // catorce minutos, así que cuatro horas se cobran en diecisiete ticks y la
  // cota de más abajo —«más de 900»— no se alcanzaba nunca. El tope son 960
  // ticks y sigue siendo el mismo (`LETHARGY_CAP_MS`); lo que cambió es cuánto
  // reloj de pared valen: nueve días y medio. Se lee de `balance.ts` para que
  // el día que la semana vuelva a cambiar esto no vuelva a mentir.
  await page.clock.setSystemTime(t0 + TIME.LETHARGY_CAP_MS);
  await page.reload();
  await passTitle(page); // U-10: al volver, el menú ofrece continuar
  await page.locator('html[data-app-ready="true"]').waitFor();

  const welcome = page.locator('.welcome');
  await welcome.waitFor({ timeout: 15_000 });
  // §11.2 pide el valle **atenuado y no tapado**: el velo tiene que dejarse ver
  // a través. Se lee su alfa en vez de su color, que es lo que la sección dice.
  const velo = await page.locator('.welcome-scrim').evaluate((el) => getComputedStyle(el).backgroundColor);
  const alfa = Number(/rgba?\([^)]*?([\d.]+)\)/u.exec(velo)?.[1] ?? '1');
  test.expect(velo, 'el velo sale de la paleta, no es un gris cualquiera').toMatch(/^rgba\(/u);
  test.expect(alfa, `el velo atenúa y no tapa (${velo})`).toBeLessThan(0.5);
  test.expect(alfa).toBeGreaterThan(0);
  // Y la página es la hoja de siempre: el papel de la crónica con su canto
  // rasgado, que es el estándar de VZ-2 para las seis superficies.
  await test.expect(welcome).toHaveClass(/skin-paper--page/u);
  await test.expect(welcome).toHaveClass(/skin-torn-top/u);
  await page.screenshot({ path: 'artifacts/m23-welcome.png', fullPage: true });
  const text = await welcome.innerText();
  test.expect(text).not.toMatch(/\{\w+\}/);
  // VZ-6 · **y la ausencia puede venir en años.** El patrón sólo cubría las
  // tres plantillas de semanas, y con el tope de §13.2 —960 semanas— el banco
  // usa a propósito las de años: «960 weeks passed» no es una frase que nadie
  // pueda sentir, y eso lo dice el propio comentario del banco. Lo que la
  // prueba guarda es que **el parte diga cuánto tiempo ha pasado**, en la
  // unidad que el banco elija.
  test.expect(text).toMatch(/\d+ (weeks|years) passed|has been \d+ (weeks|years)|(weeks|years), and nobody|went \d+ years without/u);

  // The completed catch-up is itself a persistence boundary. Without this
  // write, closing on the welcome screen can reload the pre-catch-up state;
  // a partial visibility save used to make that loss permanent.
  const persistedCatchUp = (): Promise<{
    savedAtMs: number | undefined; tick: number | undefined;
  } | undefined> => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('the-valley', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const save = await new Promise<{ savedAtMs?: number; state?: { tick?: number } } | undefined>((resolve, reject) => {
      const request = db.transaction('saves', 'readonly').objectStore('saves').get('current');
      request.onsuccess = () => resolve(request.result as { savedAtMs?: number; state?: { tick?: number } } | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return save === undefined ? undefined : { savedAtMs: save.savedAtMs, tick: save.state?.tick };
  });
  const returnAt = t0 + TIME.LETHARGY_CAP_MS;
  await test.expect.poll(async () => (await persistedCatchUp())?.savedAtMs ?? 0)
    .toBeGreaterThanOrEqual(returnAt);
  await test.expect.poll(async () => (await persistedCatchUp())?.savedAtMs ?? Number.POSITIVE_INFINITY)
    .toBeLessThan(returnAt + 2_000);
  await test.expect.poll(async () => (await persistedCatchUp())?.tick ?? 0).toBeGreaterThan(900);

  // El letargo no decide por el jugador ni deja de correr el juego: la
  // encrucijada, si había una pendiente, sigue exactamente donde estaba
  // (§1, §13.2) — se comprueba dejando pasar el parte y comprobando que el
  // valle sigue vivo, no que haya (o no) una encrucijada, que depende de la
  // partida real que haya tocado esta vez.
  await welcome.click();
  await test.expect(welcome).toBeHidden();
  await test.expect(page.locator('.valley-date')).not.toContainText('Year 1');
});

test('una aldea terminada deja epitafio y una fundación nueva conserva sus ruinas (§13.3)', async ({ page }) => {
  await page.goto('/?debug=1&live=1&ended=1&seed=7&year=80&season=autumn');
  await page.locator('html[data-app-ready="true"]').waitFor();
  const epitaph = page.locator('.epitaph-scrim');
  await test.expect(epitaph).toBeVisible();
  await test.expect(epitaph.getByRole('heading')).toHaveText('The valley is empty');
  await test.expect(epitaph).toContainText('The last households left in year 81.');
  // **VZ-6 · el máximo de población no se congela.** Decía «82 people at its
  // height» y la semilla 7 a los ochenta años da 39: es una cifra del motor, y
  // CLAUDE.md lo dice desde v3.75 —«un cambio del motor mueve todas las
  // pruebas que midan una aldea hecha»—. Lo que §13.3 promete es que el
  // epitafio diga **cuánto duró y cuánto llegó a ser**, no un número concreto.
  await test.expect(epitaph).toContainText(/80 years\. \d+ people at its height\./u);
  await test.expect(page.locator('.valley-speeds')).toHaveCSS('visibility', 'hidden');
  await page.screenshot({ path: 'artifacts/m25-epitaph.png', fullPage: true });

  await epitaph.getByRole('button', { name: 'Read the chronicle' }).click();
  const chronicle = page.locator('.chronicle-scrim');
  await test.expect(chronicle).toBeVisible();
  await test.expect.poll(() => page.evaluate(() =>
    document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('.chronicle-scrim') !== null,
  )).toBe(true);
  await page.screenshot({ path: 'artifacts/m25-epitaph-chronicle.png', fullPage: true });
  await chronicle.dispatchEvent('pointerdown', { clientX: 200, clientY: 200, pointerId: 1 });
  await chronicle.dispatchEvent('pointerup', { clientX: 200, clientY: 420, pointerId: 1 });
  await test.expect(chronicle).toBeHidden();

  await epitaph.getByRole('button', { name: 'Begin again' }).click();
  await test.expect(epitaph).toBeHidden();
  await test.expect(page.locator('.valley-date')).toContainText('Year 1');
  // **VZ-6 · el mando vuelve, no la fila.** `.valley-speeds` es la fila de las
  // cuatro velocidades, y desde UI-V2b vive **recogida** detrás de su botón:
  // pedirla visible era pedir el estado de antes de esa ronda. Lo que §13.3
  // promete es que la aldea nueva se juega, y eso es que el mando esté ahí.
  await test.expect(page.locator('.hud-speed-cluster')).toBeVisible();
  await page.screenshot({ path: 'artifacts/m25-inherited-valley.png', fullPage: true });
  // **VZ-6 · aquí había medio recorrido midiendo cosas que ya no existen**, y
  // era lo que tenía esta prueba declarada como fallo:
  //
  // - Medía `#valley`, el lienzo 2D, para tocar con el ratón sobre él. Desde
  //   UI-V10 ese lienzo va oculto en cuanto el 3D releva, así que no da caja y
  //   `boundingBox()` devuelve `null`. Ése era el «no da caja al refundar» de
  //   la nota, y la causa no era refundar: era el relevo.
  // - Y abría el **selector de crónicas de varios valles** para leer la del
  //   valle anterior. El dueño del diseño lo mandó quitar en UI-V8 —«ese
  //   selector no me gusta nada, hay que quitarlo de ahí»— así que esas cuatro
  //   aserciones comprobaban una pieza deliberadamente borrada.
  //
  // Lo que §13.3 promete y sigue siendo verdad se comprueba igual: el epitafio
  // sale con sus dos acciones, fundar de nuevo abre un valle en el año 1 que se
  // juega, y **el valle anterior se guarda en el archivo**, que es lo que dice
  // la instantánea de más abajo. Lo que ya no se puede comprobar por pantalla
  // es leer su crónica: al retirarse el selector, el archivo se conserva pero
  // dejó de tener puerta. Queda anotado en el cuaderno, no tapado aquí.
  // The archive write and successor write are ordered. Reloading after the
  // latter reaches IndexedDB must never resurrect the old epitaph.
  await test.expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('the-valley', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const save = await new Promise<{ state?: { tick?: number; ended?: unknown }; archive?: unknown[] } | undefined>((resolve, reject) => {
      const request = db.transaction('saves', 'readonly').objectStore('saves').get('current');
      request.onsuccess = () => resolve(request.result as { state?: { tick?: number; ended?: unknown }; archive?: unknown[] } | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return save?.state?.tick === 0 && save.state.ended === null && save.archive?.length === 1;
  })).toBe(true);
  await page.goto(CANVAS);
  await passTitle(page);
  await page.locator('html[data-app-ready="true"]').waitFor();
  await test.expect(page.locator('.epitaph-scrim')).toBeHidden();
});

test('volver de segundo plano recupera el tiempo que la aldea vivió sin mirar (§13.2)', async ({ page }) => {
  // Medido en un Android real: catorce minutos de reloj daban siete años en
  // vez de dieciocho. El letargo solo corría en `boot`, así que una pestaña
  // que solo duerme perdía el tiempo entero.
  const t0 = Date.now();
  await page.clock.install({ time: t0 });
  await page.goto(CANVAS);
  await passTitle(page);
  await page.locator('html[data-app-ready="true"]').waitFor();
  await answerAnyCrossroad(page);
  await page.locator('.valley-speed-badge').click();
  await page.getByRole('button', { name: '16×', exact: true }).click();
  await page.clock.runFor(msFor(1, 16));

  const tickBefore = await page.evaluate(() => Number(document.documentElement.dataset['tick'] ?? '-1'));

  // La pestaña se oculta, pasan treinta minutos y vuelve.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(30 * 60_000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  // Y unos fotogramas para que el letargo se cobre: corre en tandas dentro de
  // `requestAnimationFrame`, y con el reloj falso instalado no hay fotogramas
  // si nadie mueve el reloj.
  await page.clock.runFor(300);

  // Los ticks que esos treinta minutos deben **a la velocidad que estaba
  // puesta** (v3.72, `resumeAfterHidden`): a ×16 son treinta y cuatro semanas.
  // Antes de v3.72 eran ciento veinte y estaban escritos a mano aquí.
  const owed = Math.floor((30 * 60_000 * 16) / TIME.REAL_MS_PER_TICK);
  test.expect(owed).toBeGreaterThan(0);
  await test.expect
    .poll(() => page.evaluate(() => Number(document.documentElement.dataset['tick'] ?? '-1')), { timeout: 20_000 })
    .toBeGreaterThanOrEqual(tickBefore + owed);
});

test('cuando pasa algo, el valle lo dice donde el jugador está mirando (§11.6)', async ({ page }) => {
  // Estuvo declarada rota: el aviso de §11.6 convive con la cartela de hito
  // (U-02) y con la píldora de decisión (U-07), y en la aldea de la semilla 7 a
  // los ochenta años una de las dos le ganaba el sitio. **Pasa desde v3.69
  // sin tocar la interfaz**: la fundación en pareja cambia la trayectoria de
  // ochenta años y con ella lo que la aldea tiene que decir en ese momento. Si
  // vuelve a caer, la causa es la de arriba y no una regresión del aviso.
  await page.clock.install();
  // **Con el granero a cero**, que es lo que hace que pase algo seguro y
  // pronto. Antes esto esperaba a que la aldea tuviera algo que contar por su
  // cuenta, corriendo el reloj de cuatro en cuatro segundos; con la semana de
  // v3.72 esos cuatro segundos son ocho centésimas de semana y la espera no
  // acababa nunca. Lo que la prueba guarda es que **el suceso llega a la
  // pantalla donde el jugador está mirando** (§11.6), no cuánto tarda el valle
  // en tener hambre: `hunger=1` es la misma ruta que usa el recorrido del
  // hambre de más arriba.
  await page.goto('/?debug=1&live=1&hunger=1&seed=7&year=80&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await answerAnyCrossroad(page);
  await page.locator('.valley-speed-badge').click();
  await page.getByRole('button', { name: '64×', exact: true }).click();

  // VZ-02 · el aviso se lee en el hueco de la voz con `data-role="event"`: un
  // solo sitio para las cuatro voces del valle, y ya no hay banda propia.
  const notice = page.locator('.valley-voice[data-role="event"]');
  await test.expect(notice).toBeHidden(); // nada que decir todavía

  // Semana a semana, saltando el reloj: el aviso vive cinco segundos reales
  // (§11.4), así que cada salto va seguido de fotogramas suficientes para
  // verlo antes de que se retire.
  await test.expect.poll(async () => {
    await advanceWeeks(page, 1, 64);
    return notice.isVisible();
  }, { timeout: 60_000, intervals: [100] }).toBe(true);

  const text = await notice.innerText();
  test.expect(text.length).toBeGreaterThan(10);
  test.expect(text).not.toMatch(/\{\w+\}/); // una frase del banco, no una clave
  await page.screenshot({ path: 'artifacts/m28-notice.png', fullPage: true });

  // Y se retira sola: es un aviso, no un panel que haya que cerrar. Su vida es
  // tiempo real (`TIME.NOTICE_MS`, §11.4) y no semanas, así que aquí sí van
  // segundos.
  //
  // **Con el mundo en pausa**, y desde M-2 hace falta: el valle tiene más cosas
  // que contar —los medios abren tres sucesos más— así que a 64× llegaba otro
  // aviso dentro de los seis segundos de la espera y el hueco no se vaciaba
  // nunca. Lo que esta prueba guarda es que **un aviso se retira solo**, no que
  // el valle se quede callado; parando el reloj del juego se mide lo primero.
  await page.locator('.valley-speed-badge').click();
  await page.getByRole('button', { name: 'Pause', exact: false }).first().click().catch(async () => {
    await page.getByRole('button', { name: '0×', exact: true }).click();
  });
  await page.clock.runFor(TIME.NOTICE_MS + 1_000);
  await test.expect(notice).toBeHidden();
});
