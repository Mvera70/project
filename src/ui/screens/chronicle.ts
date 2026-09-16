// M-22 · The chronicle, full screen. design.md §9.2, §11.2, §17 M-22.
//
// A scrollable list by year, newest first — the question the player opens
// this for is "what just happened", not "what happened in year one". The
// welcome digest of a return from absence (§9.2, §13.2) is M-23's `sinceTick`
// to spend; today it only decides where the list opens.

import { CATALOG } from '@engine/crossroads/catalog';
import { namesOf } from '@engine/crossroads/resolve';
import { renderChronicleYear, renderEntry, renderUiText } from '@engine/chronicle/render';
import { makeBundle, type RngBundle } from '@engine/rng';
import type { ArchivedGame, ChronicleEntry, GameState, HappeningRecord, PendingCrossroad } from '@engine/state';
import { yearOf } from '@engine/time';
import type { App } from '../app';
import { roman } from '../app';
import { recogniseGesture, type Point } from '../gestures';
import { illustrationFor } from '../redesign/chronicle-art';
import {
  ENTRY_DIAMOND, ORNAMENT_VIEWBOX, PAGE_VINE, YEAR_FLOURISH, type OrnamentName,
} from '../redesign/chronicle-ornaments';
import type { PanelFactory, UiActions, UiSnapshot } from '../redesign/contracts';

const STYLE_ID = 'valley-chronicle-style';
// UI-V3 · La piel de `docs/ui-redesign/piel/plan-piel.md` §3.2: la página de
// pergamino subiendo desde el valle, no un velo oscuro de pantalla completa.
// Los colores y medidas son los del kit (`redesign/{tokens,skin}.css`,
// UI-V0) — este bloque sólo compone el LAYOUT propio de la crónica (dónde
// va cada cosa), nunca redefine un color ni una fuente.
const STYLE = `
/* El velo en sí es transparente: el valle (y su cabecera, ajena a esta
   ronda) se siguen viendo detrás en todo momento, a cualquier posición de
   desplazamiento — no sólo arriba del todo. */
.chronicle-scrim { position: fixed; inset: 0; z-index: 13; overflow: auto; overflow-x: hidden;
  box-sizing: border-box; padding: 0 0 calc(74px + env(safe-area-inset-bottom));
  color: var(--skin-ink); font-family: var(--skin-font-read); pointer-events: auto; }
/* La página empieza en y 379 y se funde con el valle en 60px (§3.2): del
   borde superior transparente a \`--skin-page\` opaco en y 439. El degradado
   **va dentro del contenido que se desplaza** (el primer hijo de
   \`.chronicle-body\`, no un fondo de \`.chronicle-scrim\`): un fondo puesto en
   el velo queda fijo respecto a su propio marco (\`background-attachment\`
   por defecto, \`scroll\`, es «fijo respecto al elemento», no «fijo respecto
   al contenido») y **no se va al leer hacia abajo** — se vio en una captura:
   una franja fantasma de degradado se quedaba flotando a media lectura,
   oscureciendo texto que ya no tenía ningún valle detrás. Como parte del
   contenido, esta franja sube con el resto y desaparece en cuanto se lee más
   allá — que es lo que promete el plan («la página sube desde el valle»),
   no una mirilla que reaparece a mitad de año. */
.chronicle-fade { height: 439px; margin-bottom: -1px;
  background: linear-gradient(to bottom, transparent 0, transparent 379px, var(--skin-page) 439px); }
/* La página en sí: \`--skin-page\` **con su textura** (§3.2), no un color
   plano — \`.skin-paper\`/\`.skin-paper--page\` son del kit (\`skin.css\`, UI-V0)
   y se componen tal cual él las deja, sin redefinir nada aquí. */
/* El selector de partidas anteriores (§2.4 del plan de rediseño): en flujo
   normal, ya dentro de la página — no flotaba en el prototipo, y flotar
   sobre el valle transparente de arriba no tendría dónde apoyarse. */
.chronicle-source { display: grid; gap: 6px; margin: 0 27px 18px; padding: 10px 12px;
  background: var(--skin-parchment-deep); border: 1px solid var(--skin-parchment-aged);
  color: var(--skin-ink-soft); font: 600 12px/1.2 var(--skin-font-voice); }
.chronicle-source select { box-sizing: border-box; width: 100%; min-height: 44px; padding: 9px 34px 9px 11px;
  border: 1px solid var(--skin-parchment-aged); border-radius: 4px; background: var(--skin-parchment);
  color: var(--skin-ink); font: 14px/1.2 var(--skin-font-read); }
/* U-14 · **La salida, visible.** Las dos pantallas se cerraban sólo deslizando
   hacia abajo, y el velo tapaba la barra de destinos: quien entraba a ver a los
   aldeanos o la crónica se quedaba dentro. Lo dijo el dueño del diseño el 15
   sep 2026: «no hay forma de volver atrás». Ahora hay un botón y la barra de
   abajo sigue a la vista, que es lo que un dedo espera de una barra de
   pestañas. El deslizamiento se queda: era correcto, sólo estaba solo.
   Fijo (no \`sticky\`) porque ya no hay un padding superior del que colgar: el
   botón flota sobre el valle, igual que la píldora de \`screens/crossroad.ts\`
   (\`.crossroad-marker\`) con la que convive arriba a la derecha. */
.chronicle-close { position: fixed; top: max(10px, env(safe-area-inset-top)); right: 12px; z-index: 2;
  min-height: 40px; padding: 6px 14px; border: 1px solid var(--skin-parchment-aged); border-radius: 8px;
  background: var(--skin-parchment); color: var(--skin-ink); font: 600 13px/1 var(--skin-font-voice);
  box-shadow: var(--skin-shadow); cursor: pointer; -webkit-tap-highlight-color: transparent; }
.chronicle-close:active { background: var(--skin-parchment-deep); }
/* UI-R3 · desde esta ronda la crónica puede vivir anidada dentro de la
   bandeja de la carcasa (\`shell.content\`, que UI-R2 ya deja con
   \`pointer-events: auto\`). Se declara aquí también, explícito, para que la
   piel de la crónica no dependa de una regla ajena que un día podría
   cambiar — el mismo criterio que \`shell.css\` ya sigue consigo mismo.

   -------------------------------------------------------------- año y capitular */
.chronicle-year { padding: 28px 0 4px; }
.chronicle-year-head { display: flex; align-items: center; gap: 14px; padding: 0 34px 0 30px; }
/* UI-V3b · **El capitular es una pintura, no una letra en un cuadrado.**
   La ronda anterior lo dejó como la primitiva del kit —recuadro rojo y una
   \`A\` de Cinzel en oro— y el dueño del diseño resumió la página así: «la
   estética sigue siendo muy mala». Lo que le faltaba era el marco doble de
   oro, la filigrana de dentro y la estrella, y todo eso ya estaba pintado en
   el prototipo: se recorta con \`tools/ui/cut-art.py\` (modo \`plain\`, que
   conserva su propio fondo rojo) en vez de imitarlo.

   La letra es siempre la misma —\`app.year\` del banco es «Anno …», así que la
   inicial es una \`A\` en cualquier año— y por eso una sola imagen sirve. El
   texto del año lo sigue leyendo el \`<h2>\` de al lado, de modo que la imagen
   es pura decoración y va con \`alt=""\`. */
.chronicle-capital { flex: 0 0 62px; width: 62px; height: 64px; }
.chronicle-capital img { display: block; width: 100%; height: 100%; }
.chronicle-anno { margin: 0; font-size: var(--skin-text-anno); color: var(--skin-ink); }
/* El filete del año muere en una palmeta de oro, como en el prototipo: el
   filete crece y el adorno se queda a su derecha, a la altura de la línea. */
.chronicle-year-rule { display: flex; align-items: center; gap: 2px;
  margin: 14px 34px 0 30px; }
.chronicle-year-rule hr { flex: 1 1 auto; margin: 0; }
.chronicle-year-rule svg { flex: 0 0 auto; display: block; height: 15px; width: auto;
  color: var(--skin-gold); margin-top: -1px; }

/* ------------------------------------------------------------- línea de tiempo */
.chronicle-timeline { position: relative; margin-top: 4px; }
/* El filete vertical de x 46 del prototipo (§3.2). A 20px de rama en el
   canalón, se deja en 22: dos de aire entre la orla y la línea de tiempo,
   que es lo que el prototipo tiene — sin ese hueco las hojas se metían
   entre las cuentas y las dos cosas se leían como una sola. */
.chronicle-timeline::before { content: ''; position: absolute; left: 22px; top: 8px; bottom: 8px;
  width: 1px; background: var(--skin-gold); }
/* El filete entre dos entradas lleva un rombo de oro en el centro (§3.2, y
   está en el prototipo): dos hairlines que crecen y el adorno en medio. */
.chronicle-entry-sep { display: flex; align-items: center; gap: 6px;
  margin: 0 34px 0 38px; }
.chronicle-entry-sep hr { flex: 1 1 auto; margin: 0; }
.chronicle-entry-sep svg { flex: 0 0 auto; display: block; height: 7px; width: auto;
  color: var(--skin-gold); }
.chronicle-entry { position: relative; display: flex; align-items: flex-start; gap: 16px;
  padding: 16px 34px 16px 38px; }
/* **La cuenta es un anillo, no un punto.** En el prototipo cada entrada se
   marca con una arandela de oro con su centro más oscuro, y un disco plano es
   lo que hacía que la línea de tiempo pareciera una lista con viñetas. El
   papel de dentro tapa el filete que pasa por detrás, que es lo que le da el
   relieve. */
.chronicle-entry-dot { position: absolute; left: 16px; top: 23px; width: 13px; height: 13px;
  box-sizing: border-box; border: 2px solid var(--skin-gold); border-radius: 50%;
  background: var(--skin-gold-deep, #9A7B36); box-shadow: 0 0 0 2px var(--skin-page); }
.chronicle-entry-art { flex: 0 0 100px; width: 100px; height: 66px; overflow: hidden; }
/* La viñeta va **sobre el papel, sin marco y sin recuadro**, como en el
   prototipo: es un aguado a pluma, no una foto en una tarjeta. Se recorta con
   \`tools/ui/cut-art.py\` en modo \`wash\`, que tira el papel del prototipo y
   guarda el dibujo como alfa — así se compone encima de nuestro pergamino sin
   que se vea un rectángulo de otro tono. */
.chronicle-entry-art img { display: block; width: 100%; height: 100%; object-fit: contain; }
/* Sin dibujo listado en \`public/ui/art/index.json\` (hoy, siempre): la hoja de
   roble del sprite sobre un óvalo — el respaldo obligatorio del plan §3.2.
   Una entrada nunca se queda sin su hueco. */
.chronicle-entry-art--fallback { border-radius: 50%; background-color: var(--skin-parchment-aged);
  display: flex; align-items: center; justify-content: center; color: var(--skin-ink-soft); }
.chronicle-entry-art--fallback .skin-icon { width: 24px; height: 24px; }
.chronicle-entry-text { flex: 1 1 auto; margin: 0; }

/* -------------------------------------------------------- la rama del borde */
/* UI-V3b · La rama de hojas que baja por el canto izquierdo de la página, y
   que es medio aspecto de la página del prototipo. Calcada
   (\`chronicle-ornaments.ts\`) y azulejada en vertical: el tramo se repite, que
   es lo que hace una orla sin tener que calcar la página entera.

   Va en el canalón de la izquierda, delante del capitular (que empieza en
   x 30) y detrás de todo lo demás, para que no le quite ancho al texto en una
   pantalla de 390. La imagen viene del módulo por una propiedad
   personalizada: un adorno calcado es un \`<path>\`, y un fondo de CSS
   necesita una URL, así que \`chronicle.ts\` la compone en \`data:\` una sola
   vez al montar. */
.chronicle-body { position: relative; }
.chronicle-body::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 20px;
  background-image: var(--chronicle-vine); background-repeat: repeat-y;
  background-size: 20px auto; background-position: left top;
  opacity: .42; pointer-events: none; }

/* --------------------------------------------------- decisión: tarjeta y sello */
/* Una decisión ya resuelta (\`crossroad_posed\` de otro año, \`crossroad_taken\`,
   \`consequence\`): tarjeta plana, sin sello — «ya se decidieron» (§3.2). */
.chronicle-flat-card { flex: 1 1 auto; padding: 14px 16px; }
.chronicle-flat-card p { margin: 0; }
/* La decisión pendiente: el documento sellado, tocable — abre la encrucijada
   de siempre (\`actions.navigate({kind:'valley'})\`: un panel no abre pantallas
   por su cuenta, \`contracts.ts\`). */
.chronicle-sealed { display: block; flex: 1 1 auto; border: 0; padding: 22px 18px 18px 76px;
  text-align: left; font: inherit; color: inherit; cursor: pointer; position: relative;
  -webkit-tap-highlight-color: transparent; }
.chronicle-sealed-seal { position: absolute; left: 10px; top: -14px; }
.chronicle-sealed-title { margin: 0 0 6px; font-size: 18px; color: var(--skin-red-ink); }
.chronicle-sealed-body { margin: 0; }
.chronicle-sealed:focus-visible { outline: 2px solid var(--skin-gold); outline-offset: 2px; }

/* UI-R5 · el nombre de un vivo dentro de una línea de crónica, cuando el
   motor da un identificador real (ver \`personLinksFor\`, más abajo): un
   trazo de texto en línea, nunca un botón en bloque — es una palabra dentro
   de una frase, no una fila de lista. Subrayado de oro, tinta normal (§3.2:
   «subrayado 1px --skin-gold, color --skin-ink»), nunca al revés: es una
   palabra de la crónica que resulta que se puede tocar, no un enlace de
   sistema. */
.chronicle-name-link { display: inline; margin: 0; padding: 0; border: 0; background: transparent;
  color: var(--skin-ink); font: inherit; text-decoration: underline; text-decoration-color: var(--skin-gold);
  text-underline-offset: 2px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.chronicle-name-link:hover, .chronicle-name-link:focus-visible { color: var(--skin-red-ink); }
.chronicle-name-link:focus-visible { outline: 2px solid var(--skin-gold); outline-offset: 2px; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

/**
 * UI-V3 · El índice de arte (`public/ui/art/index.json`, UI-V0), cacheado
 * tras la primera lectura. Hoy está vacío a propósito: todo cae al respaldo
 * de la hoja de roble hasta que una ronda de arte añada dibujos (§3.6 del
 * plan, §4). `public/` no pasa por el empaquetador —sólo lo que `index.html`
 * referencia por `src`/`href` se precachea en la instalación (§13.4)—, así
 * que se lee por red la primera vez, igual que `public/ui/icons.svg`; si no
 * hay red todavía (una recarga sin conexión antes de la primera visita), el
 * `catch` la deja vacía y el respaldo se queda puesto — nunca un hueco roto.
 */
let artIndex: ReadonlySet<string> | null = null;
function ensureArtIndex(): void {
  if (artIndex !== null) return;
  artIndex = new Set(); // evita relanzar la petición mientras está en vuelo
  void fetch('./ui/art/index.json')
    .then((response) => (response.ok ? response.json() : { art: [] }))
    .then((data: { art?: readonly { file?: string }[] }) => {
      artIndex = new Set((data.art ?? []).map((a) => a.file).filter((f): f is string => typeof f === 'string'));
    })
    .catch(() => { /* sin red o sin fichero: el respaldo se queda puesto */ });
}
function hasArt(file: string | null): file is string {
  return file !== null && (artIndex?.has(file) ?? false);
}

interface ChronicleSource {
  chronicle: readonly ChronicleEntry[];
  rng: RngBundle;
  lastTick: number;
  /**
   * UI-R5 · sólo la partida en curso lo trae — `ArchivedGame` no guarda
   * `happenings` (§13.1: el archivo guarda la crónica, no los registros
   * efímeros del tick) —, así que enlazar un nombre a su ficha sólo
   * funciona leyendo «esta partida», nunca una archivada. `undefined` es
   * «no hay con qué enlazar», no «no enlaces nada a propósito»: las dos se
   * comportan igual (`linkChronicleNames` no hace nada sin esto).
   */
  happenings?: readonly HappeningRecord[];
  /**
   * UI-V3 · el estado completo de la partida en curso, sólo para resolver
   * el reparto de una decisión pendiente (`namesOf` necesita algo más que
   * `rng`). Ausente en una crónica archivada —ya no hay decisión pendiente,
   * `ArchivedGame` no guarda `crossroad`— y en el camino del epitafio (fuera
   * de esta ronda): en los dos casos, sencillamente no hay documento
   * sellado que construir.
   */
  live?: GameState;
}

/**
 * UI-V3b · Un adorno calcado, como elemento.
 *
 * El módulo da el contenido del `<svg>` y su `viewBox`; el color y el tamaño
 * los pone el CSS. Va `aria-hidden`: es adorno, y lo que dice la página ya lo
 * dicen el `<h2>` del año y el texto de cada entrada.
 */
function ornament(name: OrnamentName, markup: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', ORNAMENT_VIEWBOX[name]);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = markup;
  return svg;
}

/**
 * UI-V3b · El color de la hoja de la rama del borde, `#665F49`.
 *
 * Muestreado del prototipo 02 (media del 12 % más oscuro del recuadro de la
 * rama), no elegido a ojo, y literal y no `currentColor` por una razón
 * técnica: la rama se pinta como **fondo de CSS**, y dentro de una
 * `data:` URI no hay `currentColor` que heredar. Es el único color de esta
 * ronda que no sale de `tokens.css`, y sale de la misma medida con la que se
 * hizo la paleta.
 */
const VINE_INK = '#665F49';

/**
 * Deja la rama del canto izquierdo puesta en la página, azulejada.
 *
 * **Va como pseudoelemento (`.chronicle-body::before`) y no como hijo, y es a
 * propósito:** `renderSource` y `fullRender` vacían el cuerpo con
 * `replaceChildren()` cada vez que cambia la fuente, y un `<div>` de adorno
 * desaparecería con el resto —el mismo tropiezo que llevó el degradado a ser
 * hermano del cuerpo y no hijo—. Un pseudoelemento no es un nodo hijo, así que
 * sobrevive a cada repintado sin que nadie tenga que acordarse de reponerlo.
 *
 * El adorno calcado es un `<path>` y un fondo de CSS necesita una URL, así que
 * el `<svg>` entero se escribe en una `data:` URI y se deja en una propiedad
 * personalizada del elemento. Se codifica con `encodeURIComponent` y no a
 * mano: un `#` o un `"` sin escapar dentro de una `url()` rompe la
 * declaración completa, y en silencio.
 */
function paintVine(body: HTMLElement): void {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ORNAMENT_VIEWBOX.PAGE_VINE}">`
    + `${PAGE_VINE.replace('currentColor', VINE_INK)}</svg>`;
  body.style.setProperty('--chronicle-vine', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}

/**
 * La fila del filete entre dos entradas (§3.2), con su rombo de oro en el
 * centro — dos hairlines que crecen y el adorno en medio.
 */
function timelineSep(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'chronicle-entry-sep';
  const left = document.createElement('hr');
  left.className = 'skin-rule';
  const right = document.createElement('hr');
  right.className = 'skin-rule';
  row.append(left, ornament('ENTRY_DIAMOND', ENTRY_DIAMOND), right);
  return row;
}

/**
 * UI-V3b · La viñeta que lleva toda entrada mientras no haya una por suceso.
 *
 * **Una sola, repetida, y es decisión del dueño del diseño** (17 sep 2026:
 * «lo de generar una imagen para cada suceso lo dejamos para más adelante,
 * haz uno de momento y que se repita»). Es el aguado a pluma del prototipo 02
 * recortado con `tools/ui/cut-art.py`, y sustituye al óvalo con la hoja de
 * roble: el óvalo cumplía como respaldo pero se leía como un hueco vacío, y
 * la página entera parecía sin terminar.
 *
 * **No pasa por `hasArt`**, a diferencia del arte por suceso: ese índice se
 * lee por red (`ensureArtIndex`) y bajo `file://` la petición la bloquea CORS,
 * así que una viñeta condicionada al índice no saldría nunca en las capturas
 * con las que se verifica esta ronda. Ésta es un fichero que el empaquetador
 * copia siempre, y se pide siempre.
 */
const ENTRY_VIGNETTE = './ui/art/entry.png';

/** Una entrada normal: hueco de ilustración (o su respaldo) + texto. */
function timelineRow(text: string, art: string | null): HTMLElement {
  const row = document.createElement('div');
  row.className = 'chronicle-entry';
  const dot = document.createElement('span');
  dot.className = 'chronicle-entry-dot';
  const hole = document.createElement('div');
  hole.className = 'chronicle-entry-art';
  const img = document.createElement('img');
  img.src = hasArt(art) ? `./ui/art/${art}` : ENTRY_VIGNETTE;
  img.alt = '';
  img.loading = 'lazy';
  // Último recurso si la imagen no llega: el óvalo con la hoja de roble del
  // sprite, que es el respaldo que el plan exige (§3.2) — una entrada nunca
  // se queda sin su hueco. El sprite va incrustado en `index.html` (un `<use>`
  // a un fichero externo lo bloquea Chromium bajo `file://`), así que la
  // referencia es sólo la almohadilla y el id, sin ruta por delante.
  img.addEventListener('error', () => {
    hole.classList.add('chronicle-entry-art--fallback');
    hole.innerHTML = '<svg class="skin-icon" aria-hidden="true" focusable="false"><use href="#oak-leaf"/></svg>';
  }, { once: true });
  hole.append(img);
  const p = document.createElement('p');
  p.className = 'chronicle-entry-text skin-read';
  p.textContent = text;
  row.append(dot, hole, p);
  return row;
}

/**
 * La tarjeta plana de una decisión ya resuelta (§3.2): sin sello, sin
 * ilustración — `crossroad_posed` de un año que ya pasó, `crossroad_taken`,
 * `consequence`. «Ya se decidieron.»
 */
function flatCard(text: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'chronicle-entry';
  const dot = document.createElement('span');
  dot.className = 'chronicle-entry-dot';
  const plate = document.createElement('div');
  plate.className = 'skin-plate skin-plate--card chronicle-flat-card';
  const p = document.createElement('p');
  p.className = 'skin-read';
  p.textContent = text;
  plate.append(p);
  row.append(dot, plate);
  return row;
}

/**
 * El documento sellado de la decisión pendiente (§3.2): título y subtítulo
 * salen del propio catálogo (`CATALOG`, `namesOf`) — el mismo texto que
 * `screens/crossroad.ts` pondría en su cabecera, no una frase inventada.
 * Tocarlo pide ir al valle: un panel no abre pantallas por su cuenta
 * (`contracts.ts`), y es donde `app.ts` ya sabe mostrar la decisión
 * pendiente (`paint()`, la comprobación de `state.crossroad`) — la misma
 * puerta a la que ya lleva deslizar hacia abajo para aplazarla.
 */
function sealedCard(state: GameState, pending: PendingCrossroad, actions: UiActions): HTMLElement | null {
  const template = CATALOG.find((t) => t.id === pending.templateId);
  if (template === undefined) return null;
  const params = { year: yearOf(pending.posedTick), ...namesOf(state, pending.cast) };
  const title = renderEntry({ tick: pending.posedTick, kind: 'crossroad_posed', templateKey: template.title, params, weight: 3 }, state.rng);
  const body = renderEntry({ tick: pending.posedTick, kind: 'crossroad_posed', templateKey: template.body, params, weight: 3 }, state.rng);

  const row = document.createElement('div');
  row.className = 'chronicle-entry';
  const dot = document.createElement('span');
  dot.className = 'chronicle-entry-dot';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'skin-plate skin-plate--sealed chronicle-sealed';
  button.setAttribute('aria-label', `${renderUiText('crossroad.waiting')}. ${title}. ${body}`);
  const seal = document.createElement('div');
  seal.className = 'skin-seal chronicle-sealed-seal';
  seal.setAttribute('aria-hidden', 'true');
  // Mismo motivo que el respaldo de ilustración: referencia local al sprite
  // incrustado en `index.html`, nunca a un fichero (`file://` la bloquea).
  seal.innerHTML = '<svg class="skin-icon" aria-hidden="true" focusable="false"><use href="#seal-tree"/></svg>';
  const h3 = document.createElement('h3');
  h3.className = 'skin-inscription chronicle-sealed-title';
  h3.textContent = title;
  const p = document.createElement('p');
  p.className = 'skin-read--aside chronicle-sealed-body';
  p.textContent = body;
  button.append(seal, h3, p);
  button.addEventListener('click', (event) => {
    event.stopPropagation(); // no además el gesto de deslizar/cerrar del velo
    actions.navigate({ kind: 'valley' });
  });
  row.append(dot, button);
  return row;
}

/**
 * Un bloque de año: la cabecera «ANNO …» con su capitular, la línea de
 * tiempo con una entrada por línea de crónica —ilustrada según
 * `illustrationFor` (§3.6), o como tarjeta plana si es una decisión ya
 * resuelta— y, si `year` es el año en curso y hay una decisión pendiente
 * (`source.live.crossroad`), el documento sellado al final.
 *
 * `actions` es opcional porque el camino del epitafio (`openChronicle`, más
 * abajo) no lo tiene — y tampoco le hace falta: sin `source.live` nunca hay
 * documento sellado que tocar.
 */
function yearBlock(source: ChronicleSource, year: number, actions?: UiActions): HTMLElement | null {
  ensureArtIndex();
  const lines = renderChronicleYear(source.chronicle, source.rng, year);
  const pending = source.live?.crossroad ?? null;
  const posingThisYear = pending !== null && yearOf(pending.posedTick) === year;
  if (lines.length === 0 && !posingThisYear) return null;

  const section = document.createElement('section');
  section.className = 'chronicle-year';
  const head = document.createElement('div');
  head.className = 'chronicle-year-head';
  const headingText = renderUiText('app.year', { year: roman(year + 1) });
  // UI-V3b · el capitular ilustrado del prototipo, recortado. Ver el
  // comentario de `.chronicle-capital`: la inicial es siempre una `A`, así
  // que una imagen sirve para cualquier año, y el año lo dice el `<h2>`.
  const capital = document.createElement('div');
  capital.className = 'chronicle-capital';
  const capitalArt = document.createElement('img');
  capitalArt.src = './ui/art/capital-anno.png';
  capitalArt.alt = '';
  // Si la imagen no llega, la primitiva del kit: recuadro rojo con la inicial.
  capitalArt.addEventListener('error', () => {
    capital.className = 'skin-capital';
    capital.setAttribute('aria-hidden', 'true');
    capital.textContent = headingText.charAt(0);
  }, { once: true });
  capital.append(capitalArt);
  const heading = document.createElement('h2');
  heading.className = 'chronicle-anno skin-inscription';
  heading.textContent = headingText;
  head.append(capital, heading);
  const rule = document.createElement('div');
  rule.className = 'chronicle-year-rule';
  const ruleLine = document.createElement('hr');
  ruleLine.className = 'skin-rule';
  rule.append(ruleLine, ornament('YEAR_FLOURISH', YEAR_FLOURISH));

  const timeline = document.createElement('div');
  timeline.className = 'chronicle-timeline';
  const happenings = source.happenings ?? [];

  // Empareja cada línea ya renderizada con la entrada que la escribió, en el
  // mismo orden ascendente de tick que produce `renderChronicleYear` — el
  // mismo truco que `linkChronicleNames` usa para localizar un párrafo, aquí
  // generalizado a toda entrada (no sólo `happening`). Una línea agregada
  // (`yearKey`, `chronicle/events.ts`: nacimientos/muertes anónimos,
  // construcciones, llegadas/salidas en bloque) no encuentra pareja exacta —
  // cae al respaldo, que es exactamente lo que §3.2 pide para lo que falte.
  const claimed = new Set<number>();
  const entryForLine = (line: string): ChronicleEntry | null => {
    for (let i = 0; i < source.chronicle.length; i += 1) {
      if (claimed.has(i)) continue;
      const candidate = source.chronicle[i];
      if (candidate === undefined || candidate.weight < 2 || yearOf(candidate.tick) !== year) continue;
      if (renderEntry(candidate, source.rng, i) === line) { claimed.add(i); return candidate; }
    }
    return null;
  };

  let any = false;
  const append = (el: HTMLElement): void => {
    if (any) timeline.append(timelineSep());
    timeline.append(el);
    any = true;
  };
  for (const line of lines) {
    const matched = entryForLine(line);
    // La entrada que planteó la decisión pendiente no se repite como línea
    // normal: ya lleva su propio documento sellado, más abajo.
    if (matched !== null && posingThisYear && pending !== null
      && matched.tick === pending.posedTick && matched.kind === 'crossroad_posed') continue;
    if (matched !== null
      && (matched.kind === 'crossroad_posed' || matched.kind === 'crossroad_taken' || matched.kind === 'consequence')) {
      append(flatCard(line));
    } else {
      append(timelineRow(line, matched === null ? null : illustrationFor(matched, happenings)));
    }
  }
  if (posingThisYear && pending !== null && source.live !== undefined && actions !== undefined) {
    const sealed = sealedCard(source.live, pending, actions);
    if (sealed !== null) append(sealed);
  }

  section.append(head, rule, timeline);
  return section;
}

/**
 * UI-R5 · El único identificador real y estable que una entrada de la
 * crónica puede llevar hasta hoy, y por qué no es un texto adivinado.
 *
 * `ChronicleEntry.params` (`src/engine/state.ts`) es texto ya compuesto —
 * nombres, no ids—; UI-R3 lo comprobó (§3.4 de su informe) y no enlazó nada
 * por eso. Pero un suceso del valle (R-1, `kind: 'happening'`) sí deja un
 * rastro con id de verdad: `sim.ts`, paso 2b, empuja **en el mismo tick** la
 * línea de crónica (`say(fated.entry)`) y el registro (`state.happenings.
 * push(fated.record)`), y `world/fate.ts` sólo llena `record.who` —
 * `VillagerId[]`, nunca un nombre— para `quarrel_in_the_square` (los dos
 * implicados) y `child_lost` cuando el niño está nombrado. Como el motor
 * tira `fate` como mucho una vez por semana (`FATE.MIN_GAP_WEEKS`), el tick
 * identifica el registro sin ambigüedad: no hace falta comparar texto para
 * saber a quién pertenece.
 *
 * Empareja cada nombre de `entry.params` (`A`, `B`, en ese orden, el mismo
 * en que `fate.ts` los escribe) con el id que ocupa su misma posición en
 * `record.who` — la convención que hoy siguen los dos únicos sucesos que
 * nombran a alguien. Si algún día un suceso nuevo no la sigue, esta función
 * simplemente no encuentra pareja para ese nombre y no enlaza nada: el
 * fallo seguro es no enlazar, nunca enlazar mal.
 */
export function personLinksFor(
  entry: ChronicleEntry,
  record: HappeningRecord,
): readonly { readonly name: string; readonly id: number }[] {
  const links: { name: string; id: number }[] = [];
  (['A', 'B'] as const).forEach((key, index) => {
    const name = entry.params[key];
    const id = record.who[index];
    if (typeof name === 'string' && name.length > 0 && id !== undefined) links.push({ name, id });
  });
  return links;
}

/**
 * Envuelve cada aparición de un nombre enlazable dentro de un párrafo ya
 * escrito, sin tocar el resto del texto. No es "analizar la frase para
 * adivinar quién es quién" (lo que el brief prohíbe): el párrafo ya viene
 * emparejado uno a uno con la entrada exacta que lo escribió (ver
 * `linkChronicleNames`), así que cualquier aparición literal de ese nombre
 * dentro de **este** párrafo concreto es, con certeza, esa persona — el
 * mismo nombre puede repetirse dentro de una sola plantilla (`{A} ... {A}`,
 * `fate.child_lost.named`) y las dos tienen que enlazar igual.
 *
 * Los nombres más largos se prueban antes que los cortos para que un nombre
 * que sea prefijo de otro (poco frecuente, pero el catálogo de nombres no lo
 * prohíbe) no se coma la mitad del más largo.
 */
function linkNamesInParagraph(
  p: HTMLParagraphElement,
  links: readonly { readonly name: string; readonly id: number }[],
  actions: UiActions,
): void {
  const names = [...links].sort((a, b) => b.name.length - a.name.length);
  const pattern = new RegExp(`(${names.map((n) => n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const text = p.textContent ?? '';
  const parts = text.split(pattern);
  if (parts.length <= 1) return; // ninguna coincidencia: el párrafo se deja tal cual
  const idByName = new Map(names.map((n) => [n.name, n.id] as const));
  p.replaceChildren(...parts.map((part) => {
    const id = idByName.get(part);
    if (id === undefined) return document.createTextNode(part);
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'chronicle-name-link';
    link.textContent = part;
    link.setAttribute('aria-label', renderUiText('chronicle.person.link', { name: part }));
    // No debe disparar además el gesto de deslizar/cerrar del contenedor.
    link.addEventListener('click', (event) => {
      event.stopPropagation();
      actions.navigate({ kind: 'inspect', target: { kind: 'villager', id }, from: 'valley' });
    });
    return link;
  }));
}

/**
 * Recorre un bloque de año ya construido (`yearBlock`, sin tocar) y enlaza
 * los nombres que tengan un id real detrás. Para cada suceso del valle de
 * ese año con alguien implicado, calcula el texto exacto que
 * `renderChronicleYear` habría producido para él —`renderEntry` con el
 * mismo índice absoluto en `source.chronicle`, porque un suceso de §7.10
 * nunca se agrupa (`yearKey`, `chronicle/events.ts`, no reconoce ninguna
 * plantilla `fate.*`: siempre sale en su propia línea, palabra por
 * palabra)— y busca el único párrafo que dice exactamente eso. Sin
 * `source.happenings` (una partida archivada) no hay nada que hacer.
 */
function linkChronicleNames(
  block: HTMLElement,
  source: ChronicleSource,
  year: number,
  actions: UiActions,
): void {
  const happenings = source.happenings;
  if (happenings === undefined || happenings.length === 0) return;
  const paragraphs = [...block.querySelectorAll('p')];
  const claimed = new Set<HTMLParagraphElement>();
  for (const entry of source.chronicle) {
    if (entry.kind !== 'happening' || entry.weight < 2 || yearOf(entry.tick) !== year) continue;
    const record = happenings.find((h) => h.tick === entry.tick);
    if (record === undefined) continue;
    const links = personLinksFor(entry, record);
    if (links.length === 0) continue;
    const index = source.chronicle.indexOf(entry);
    const expected = renderEntry(entry, source.rng, index);
    const p = paragraphs.find((el) => !claimed.has(el) && el.textContent === expected);
    if (p === undefined) continue; // agrupado o ya reclamado por otra entrada idéntica: no se enlaza
    claimed.add(p);
    linkNamesInParagraph(p, links, actions);
  }
}

let open: HTMLElement | null = null;
/** A quién avisar cuando esta pantalla se cierre, se cierre como se cierre. */
let closed: (() => void) | null = null;

/** Cierra la pantalla si está abierta. La barra de destinos la usa (U-14). */
export function closeChronicle(): void {
  open?.remove();
  open = null;
  const tell = closed;
  closed = null;
  tell?.();
}

function archivedSource(game: ArchivedGame): ChronicleSource {
  return { chronicle: game.chronicle, rng: makeBundle(game.seed), lastTick: game.endedTick };
}

/**
 * Opens the chronicle. `sinceTick`, when given, is where the list scrolls to
 * once mounted — the most recent year still renders in full above it, since a
 * year is never split by the tick that happened to open the screen.
 */
export function openChronicle(app: App, sinceTick?: number, onClose?: () => void): void {
  if (open !== null) return;
  ensureStyle();
  closed = onClose ?? null;
  const state = app.state();
  const previous = app.archive()
    .map((game, index) => ({ game, index }))
    .filter(({ game }) => !(game.seed === state.seed && game.endedTick === state.ended?.tick));
  const scrim = document.createElement('div');
  scrim.className = 'chronicle-scrim';
  // Hermano de `body`, no hijo: `renderSource` vacía `body` con
  // `replaceChildren()` en cada cambio de fuente, y el degradado no es parte
  // de ninguna fuente — se perdería si viviera dentro.
  const fade = document.createElement('div');
  fade.className = 'chronicle-fade';

  const body = document.createElement('div');
  body.className = 'chronicle-body skin-paper skin-paper--page';
  paintVine(body);
  const current: ChronicleSource = { chronicle: state.chronicle, rng: state.rng, lastTick: state.tick };
  const renderSource = (source: ChronicleSource, scrollSince?: number): HTMLElement | null => {
    body.replaceChildren();
    let scrollTarget: HTMLElement | null = null;
    for (let year = yearOf(source.lastTick); year >= 0; year -= 1) {
      const block = yearBlock(source, year);
      if (block === null) continue;
      body.append(block);
      if (scrollSince !== undefined && scrollTarget === null && year <= yearOf(scrollSince)) scrollTarget = block;
    }
    return scrollTarget;
  };

  if (previous.length > 0) {
    const label = document.createElement('label');
    label.className = 'chronicle-source';
    label.textContent = renderUiText('chronicle.source');
    const select = document.createElement('select');
    select.setAttribute('aria-label', renderUiText('chronicle.source'));
    const currentOption = document.createElement('option');
    currentOption.value = 'current';
    currentOption.textContent = renderUiText('chronicle.current');
    select.append(currentOption);
    for (const { game, index } of [...previous].reverse()) {
      const option = document.createElement('option');
      option.value = `archive:${index}`;
      option.textContent = renderUiText('chronicle.archived', {
        number: index + 1,
        years: yearOf(game.endedTick),
        peak: game.peakPeople,
      });
      select.append(option);
    }
    select.addEventListener('change', () => {
      const index = Number(select.value.split(':')[1]);
      const game = app.archive()[index];
      renderSource(select.value === 'current' || game === undefined ? current : archivedSource(game));
      scrim.scrollTop = 0;
    });
    label.append(select);
    scrim.append(label);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'chronicle-close';
  close.textContent = renderUiText('app.close');
  close.addEventListener('click', closeChronicle);
  scrim.append(fade, close, body);
  const scrollTarget = renderSource(current, sinceTick);

  const trace: Point[] = [];
  scrim.addEventListener('pointerdown', (event) => {
    trace.length = 0;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
  });
  scrim.addEventListener('pointerup', (event) => {
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    if (recogniseGesture({ points: trace }) === 'swipe_down') closeChronicle();
  });

  document.body.append(scrim);
  open = scrim;
  scrollTarget?.scrollIntoView();
}

/**
 * UI-R3 · La crónica migrada de verdad al contenedor común (`shell.content`),
 * como un `PanelFactory`. Reutiliza `ensureStyle`/`STYLE`/`yearBlock`/
 * `ChronicleSource`/`archivedSource` de arriba: la piel y el renderizado de un
 * año son los mismos que el camino del epitafio (`openChronicle`), que sigue
 * vivo sin tocar — `screens/epitaph.ts` está fuera del alcance de esta ronda,
 * lo llama directamente y no pasa por la barra de navegación.
 *
 * **Por qué la bandeja se destapa a mano, y no es un olvido.**
 * `contentRouteFor` (`redesign/shell.ts`, UI-R1) sólo conoce `orders` e
 * `inspect` — el propio comentario de esa ronda dice que crónica y gente
 * «siguen sirviéndose por los adaptadores de pantalla completa… que
 * UI-R3/UI-R4 migran», y `shell.ts`/`contracts.ts` están fuera del alcance de
 * este brief. `app.ts` (el único enganche que este brief concede) destapa
 * `.ui-shell-content` a mano tras `shell.setRoute`, exactamente por la misma
 * vía que UI-R1 ya usó para la ranura del mensaje
 * (`shell.element.querySelector` sobre una clase pública y estable, nunca una
 * API nueva de `shell.ts`). Visualmente no cambia nada: `.chronicle-scrim`
 * sigue siendo `position: fixed; inset: 0` con el mismo z-index (13) de
 * siempre, así que cubre la pantalla entera igual que cuando colgaba
 * directamente de `document.body` — la barra de navegación (z-index 14)
 * sigue viéndose encima, que es lo que exige U-14.
 *
 * **Por qué una entrada nueva no roba el desplazamiento.** `update` no
 * reconstruye la lista entera en cada fotograma (se llama uno por uno desde
 * el bucle de pintado de `app.ts` mientras esta ruta esté activa): sólo lo
 * hace cuando la fuente cambia de verdad —otra partida, no sólo «actual» vs.
 * «archivada»: `chronicleIdentity` lleva la semilla, porque una sucesora
 * (`foundSuccessor`) sigue siendo «la partida actual» con una crónica
 * distinta de cero, y confundir las dos mezclaría dos aldeas en una lista—.
 * Con la misma fuente, sólo se toca el bloque del año en curso: los años
 * cerrados no cambian nunca (§9 del diseño, la crónica no reescribe el
 * pasado), así que no hace falta ni tocarlos. Y si quien lee no está pegado
 * arriba del todo (`element.scrollTop > 2`), se compensa el alto que ese
 * bloque haya ganado para que el texto que tenía bajo el dedo siga ahí.
 */

/**
 * Pura: qué identidad tiene la fuente que se está leyendo. Distinta semilla
 * ⇒ distinta identidad aunque las dos sean «la partida actual» — una
 * sucesora tras el epitafio (`foundSuccessor`) sigue siendo «actual» con una
 * crónica que empieza de cero, y tratarla como la misma fuente mezclaría dos
 * aldeas en una sola lista. Separada de `chroniclePanel` porque este
 * proyecto no trae `jsdom` (UI-R1 §4, UI-R2 §7.4): es la parte que una
 * prueba rápida puede examinar sin levantar DOM.
 */
export function chronicleIdentity(selectedArchive: number | null, currentSeed: number): string {
  return selectedArchive === null ? `current:${currentSeed}` : `archive:${selectedArchive}`;
}

/**
 * Pura: qué partidas archivadas puede elegir el selector, y en qué orden
 * (más reciente primero, como ya hacía la pantalla vieja). Excluye la que
 * coincide con la partida actual —misma semilla, mismo tick de cierre—, que
 * ya se ve bajo «This valley» y no necesita una segunda entrada.
 */
export function selectableArchive(
  archive: readonly ArchivedGame[],
  currentSeed: number,
  currentEndedTick: number | undefined,
): readonly { readonly game: ArchivedGame; readonly index: number }[] {
  return archive
    .map((game, index) => ({ game, index }))
    .filter(({ game }) => !(game.seed === currentSeed && game.endedTick === currentEndedTick))
    .reverse();
}

export const chroniclePanel: PanelFactory = (actions) => {
  ensureStyle();
  const element = document.createElement('div');
  element.className = 'chronicle-scrim';

  // Hermano de `body`, no hijo: `fullRender` vacía `body` con
  // `replaceChildren()` cada vez que la fuente cambia de identidad, y el
  // degradado no es parte de ninguna fuente — se perdería si viviera dentro.
  const fade = document.createElement('div');
  fade.className = 'chronicle-fade';

  const body = document.createElement('div');
  body.className = 'chronicle-body skin-paper skin-paper--page';
  paintVine(body);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'chronicle-close';
  close.textContent = renderUiText('app.close');
  close.addEventListener('click', () => { actions.navigate({ kind: 'valley' }); });

  element.append(fade, close, body);

  // El mismo gesto que el resto del valle (S-05, U-14): deslizar hacia abajo
  // cierra, y siempre por `actions.navigate` — nunca un callback propio, que
  // es lo que hacía la pantalla vieja (`closed`, arriba) porque no tenía un
  // propietario único de la navegación a quien avisar.
  const trace: Point[] = [];
  element.addEventListener('pointerdown', (event) => {
    trace.length = 0;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
  });
  element.addEventListener('pointerup', (event) => {
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    if (recogniseGesture({ points: trace }) === 'swipe_down') actions.navigate({ kind: 'valley' });
  });

  let sourceLabel: HTMLLabelElement | null = null;
  let archiveCount = -1;
  let selectedArchive: number | null = null;
  let renderedIdentity: string | null = null;
  let renderedYear: number | null = null;
  let renderedTick: number | null = null;

  const sourceFor = (snapshot: UiSnapshot): ChronicleSource => {
    const game = selectedArchive === null ? undefined : snapshot.archive[selectedArchive];
    if (game !== undefined) return archivedSource(game);
    // UI-R5 · `happenings` viaja aquí y sólo aquí (nunca en `archivedSource`,
    // que no lo tiene) — es lo que permite enlazar un nombre real a su
    // ficha (`linkChronicleNames`), sólo para la partida que se está jugando.
    // UI-V3 · `live` viaja igual, y por el mismo motivo: sólo la partida en
    // curso puede tener una decisión pendiente que documentar (§3.2).
    return {
      chronicle: snapshot.state.chronicle,
      rng: snapshot.state.rng,
      lastTick: snapshot.state.tick,
      happenings: snapshot.state.happenings,
      live: snapshot.state,
    };
  };

  const fullRender = (source: ChronicleSource): void => {
    body.replaceChildren();
    for (let year = yearOf(source.lastTick); year >= 0; year -= 1) {
      const block = yearBlock(source, year, actions);
      if (block !== null) { linkChronicleNames(block, source, year, actions); body.append(block); }
    }
    renderedYear = yearOf(source.lastTick);
    renderedTick = source.lastTick;
  };

  /**
   * Sólo el bloque del año en curso, o los que hayan empezado desde el
   * último pintado — nunca los años ya cerrados, que no vuelven a cambiar.
   */
  const refreshCurrentYear = (source: ChronicleSource): void => {
    const year = yearOf(source.lastTick);
    const beforeHeight = element.scrollHeight;
    const beforeScroll = element.scrollTop;
    const atTop = beforeScroll <= 2;
    if (year === renderedYear) {
      const block = yearBlock(source, year, actions);
      if (block !== null) {
        linkChronicleNames(block, source, year, actions);
        const first = body.firstElementChild;
        if (first !== null) first.replaceWith(block); else body.prepend(block);
      }
    } else {
      // Uno o más años nuevos empezaron: se anteponen en orden (el más nuevo
      // queda arriba), y el año que antes estaba «en curso» se deja tal cual.
      const blocks: HTMLElement[] = [];
      for (let y = year; y > (renderedYear ?? -1); y -= 1) {
        const block = yearBlock(source, y, actions);
        if (block !== null) { linkChronicleNames(block, source, y, actions); blocks.push(block); }
      }
      if (blocks.length > 0) body.prepend(...blocks);
    }
    renderedYear = year;
    renderedTick = source.lastTick;
    // No se toca el scroll de quien está pegado arriba: sigue viendo crecer
    // el año en curso de primera mano, que es lo que se espera al leer «lo
    // que acaba de pasar». Quien ya había bajado a leer historia conserva su
    // sitio: se compensa exactamente el alto que el bloque de arriba ganó.
    if (!atTop) element.scrollTop = beforeScroll + (element.scrollHeight - beforeHeight);
  };

  const rebuildSourcePicker = (snapshot: UiSnapshot): void => {
    sourceLabel?.remove();
    sourceLabel = null;
    const state = snapshot.state;
    const previous = selectableArchive(snapshot.archive, state.seed, state.ended?.tick);
    if (previous.length === 0) return;
    const label = document.createElement('label');
    label.className = 'chronicle-source';
    label.textContent = renderUiText('chronicle.source');
    const select = document.createElement('select');
    select.setAttribute('aria-label', renderUiText('chronicle.source'));
    const currentOption = document.createElement('option');
    currentOption.value = 'current';
    currentOption.textContent = renderUiText('chronicle.current');
    select.append(currentOption);
    // `previous` ya viene del más reciente al más antiguo (`selectableArchive`).
    for (const { game, index } of previous) {
      const option = document.createElement('option');
      option.value = `archive:${index}`;
      option.textContent = renderUiText('chronicle.archived', {
        number: index + 1, years: yearOf(game.endedTick), peak: game.peakPeople,
      });
      select.append(option);
    }
    select.value = selectedArchive === null ? 'current' : `archive:${selectedArchive}`;
    select.addEventListener('change', () => {
      selectedArchive = select.value === 'current' ? null : Number(select.value.split(':')[1]);
      element.scrollTop = 0;
      // La identidad cambió: el próximo `update` reconstruye entero.
      renderedIdentity = null;
    });
    label.append(select);
    sourceLabel = label;
    element.insertBefore(label, close);
  };

  return {
    element,
    update(snapshot: UiSnapshot): void {
      // El selector de archivo sólo se reconstruye cuando de verdad hay una
      // partida nueva archivada — no en cada fotograma.
      if (snapshot.archive.length !== archiveCount) {
        archiveCount = snapshot.archive.length;
        rebuildSourcePicker(snapshot);
      }
      const identity = chronicleIdentity(selectedArchive, snapshot.state.seed);
      const source = sourceFor(snapshot);
      if (identity !== renderedIdentity) {
        fullRender(source);
        element.scrollTop = 0;
        renderedIdentity = identity;
        return;
      }
      // Una partida archivada no cambia nunca; sólo la actual avanza.
      if (selectedArchive === null && source.lastTick !== renderedTick) refreshCurrentYear(source);
    },
    // Como `orders.ts` (UI-R2 §7.2): sólo `addEventListener` sobre elementos
    // propios. Quitar `element` del árbol basta.
    dispose(): void { /* ver el comentario de arriba */ },
  };
};
