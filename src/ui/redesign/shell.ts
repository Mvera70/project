// UI-R1 · La carcasa: un canvas, una bandeja, una navegación.
// docs/ui-redesign/implementation-plan.md §2.2, §4; design.md §11.2.
//
// **Un único propietario del estado de navegación.** Antes de esta ronda,
// `app.ts` decidía qué pestaña estaba encendida en tres sitios distintos —la
// función `showing()`, cada manejador de clic de la barra, y `showPanel` al
// abrir una ficha— y ninguno de los tres sabía de los otros dos. `createShell`
// concentra esa decisión en un solo sitio: `setRoute` es la única función que
// cambia la ruta activa, y es pura respecto al DOM que no le pertenece — no
// toca el lienzo, no toca el estado del motor, no consume azar.
//
// **La pila del mensaje**, y desde VZ-02 con un solo dueño: el hueco de la voz
// (`voice` en el handle) es lo único que habla, y qué dice lo decide la cola de
// `../voice.ts`. Antes de eso había cuatro emisores con dos arbitrajes que no
// se conocían, y el fallo que UI-R1 arregló —el aviso y la pista pisándose con
// dos offsets fijos, `docs/life-rounds/evidencia-capturas.md` §3— podía volver
// por cualquiera de los otros dos caminos.
//
// **UI-V2 · la piel de la bandeja y la navegación** (`docs/ui-redesign/piel/
// plan-piel.md` §3.4). Los tres iconos de la barra ya no son los trazos de
// `../icons` (`NAV_ICONS`, U-05): son los mismos cuatro dibujos del sprite
// grabado de UI-V0 (`public/ui/icons.svg`). Y la navegación
// cambia de piel según la ruta —papel con subrayado en el valle, placa de
// madera en la crónica, madera entera en la gente/la ficha—, que es lo que
// los tres prototipos hacen y `navSkinFor` es esa regla, pura y probada sin
// DOM como sus vecinas `navTabFor`/`contentRouteFor`.
//
// **Los iconos salen del sprite incrustado en `index.html`.** UI-V2 midió que
// `<use href="./ui/icons.svg#id">` no carga cuando la página se abre con
// `file://` —Chromium bloquea la referencia entre documentos— y así es como
// `shot.mjs` abre la demo para las capturas de cada ronda. La primera versión
// de esta ronda lo sorteó copiando los trazos a mano aquí; el coordinador puso
// el sprite dentro del documento, que deja **una sola fuente** y hace que
// cualquier ronda escriba sólo `<use href="#id">`.

import { renderUiText } from '@engine/chronicle/render';
import type { SheetRoute, UiActions, ShellHandle } from './contracts';

/** Las tres pestañas de la barra. Encrucijada y epitafio no son rutas (§11.2). */
export type NavTab = 'valley' | 'chronicle' | 'people';
const NAV_TABS: readonly NavTab[] = ['valley', 'chronicle', 'people'];

/**
 * Qué pestaña debe leerse «aquí estás» para una ruta dada.
 *
 * Pura, y es lo que hace comprobable sin DOM la regla del plan («pestaña y
 * contenido coinciden», AC-05): `chronicle` y `people` son ellas mismas;
 * `valley` y `orders` vuelven a `valley`, porque las órdenes se abren desde
 * ahí (design.md §11.2, punto 1: «arriba a la izquierda, el reloj; abajo a la
 * derecha, los controles de velocidad» — la hoja de órdenes es del valle, no
 * un destino propio). `inspect` seŕa la pestaña de donde vino: una ficha
 * abierta desde People sigue enseñando People encendida, exactamente como
 * `showPanel`/`closePeople` se comportaban antes de esta ronda.
 */
export function navTabFor(route: SheetRoute): NavTab {
  switch (route.kind) {
    case 'chronicle': return 'chronicle';
    case 'people': return 'people';
    case 'inspect': return route.from;
    case 'orders':
    case 'valley':
    default: return 'valley';
  }
}

/**
 * Si el contenedor de la bandeja (`content`) debe estar visible para esta
 * ruta, y cuál.
 *
 * **UI-R5.** Hasta esta ronda sólo conocía `orders`/`inspect`: `chronicle` y
 * `people` ya vivían dentro de `shell.content` desde UI-R3/UI-R4, pero esas
 * rondas no podían tocar este fichero (congelado mientras corrían en
 * paralelo sobre el mismo contrato) y tuvieron que destapar la bandeja a
 * mano desde `app.ts` —`shell.element.querySelector('.ui-shell-content')` +
 * `hidden = false`—, dos rodeos documentados en `docs/ui-redesign/
 * rounds/UI-R3.md` §3.2 y `UI-R4.md` §5.1. El integrador de UI-R5 sí puede
 * tocar `shell.ts`, así que las cuatro rutas que montan algo dentro de la
 * carcasa quedan aquí, en un solo sitio, y `app.ts` deja de leer el DOM de
 * la carcasa por su cuenta para decidir su propia visibilidad. `valley` es
 * la única ruta que no monta nada: es el valle mismo, sin bandeja encima.
 */
export function contentRouteFor(route: SheetRoute): 'orders' | 'inspect' | 'chronicle' | 'people' | null {
  return route.kind === 'valley' ? null : route.kind;
}

/**
 * Qué piel lleva la barra de navegación para esta ruta (plan-piel.md §3.4,
 * §3.2, §3.3): pergamino con el subrayado de ocre por defecto (prototipo 01,
 * el valle y las órdenes, que se abren desde ahí); una placa de madera en la
 * pestaña activa cuando la ruta es la crónica (prototipo 02); y madera
 * entera cuando es la gente o una ficha —de persona o de edificio, el plan no
 * distingue— (prototipo 03). Pura, como `navTabFor`, de la que es vecina.
 */
export type NavSkin = 'default' | 'plaque' | 'wood';
export function navSkinFor(route: SheetRoute): NavSkin {
  switch (route.kind) {
    case 'chronicle': return 'plaque';
    case 'people':
    case 'inspect': return 'wood';
    default: return 'default';
  }
}

/**
 * VZ-02 · **`resolveMessageSlot` se retira, y con ella el arbitraje a dos.**
 *
 * Era la regla de visual-reference §5 hecha función pura, y valía: el aviso
 * gana, la pista cede sin marcarse vista y vuelve sola. Lo que no valía era su
 * alcance —sólo sabía de dos voces de las cuatro que había— ni el rodeo que
 * `app.ts` necesitaba para usarla: un `MutationObserver` espiando el atributo
 * `hidden` del aviso. Las cuatro voces, sus prioridades y sus caducidades viven
 * ahora en `../voice.ts`, con la misma pureza y sin nadie espiando a nadie.
 */

/** Qué símbolo del sprite lleva cada pestaña. Los ids son los de `icons.svg`. */
const NAV_TAB_ICON: Record<NavTab, string> = {
  valley: 'mountains',
  chronicle: 'book',
  people: 'people',
};
const OAK_LEAF = 'oak-leaf';
const SEAL_TREE = 'seal-tree';

/**
 * Un icono del sprite del documento. `id`, no trazos: ver la cabecera.
 *
 * `viewBox` va aquí y no en el `<use>` porque el `<symbol>` ya lo trae y el
 * navegador lo hereda; dejarlo puesto no estorba y hace que el hueco mida lo
 * mismo antes de que el sprite resuelva.
 */
const inlineIcon = (id: string): string =>
  `<svg class="skin-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#${id}"/></svg>`;

const tapButton = (label: string, icon: string, className: string): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.innerHTML = inlineIcon(icon);
  const caption = document.createElement('span');
  caption.className = 'skin-label';
  caption.textContent = label;
  button.append(caption);
  button.setAttribute('aria-label', label);
  return button;
};

/**
 * Monta la carcasa y devuelve el mando único de navegación.
 *
 * `element` lleva la navegación y la bandeja (`content`); no lleva el lienzo
 * — el lienzo es de `app.ts`, que lo conserva al cambiar de ruta como pide el
 * plan («un solo canvas»). `element` se inserta **encima** del lienzo y debajo
 * de la encrucijada/epitafio, que siguen mandando sobre cualquier ruta.
 *
 * El contenedor de mensaje (`.ui-shell-message`) es la ranura que `app.ts`
 * pasa a `mountNotices` y donde reubica la pista del inicio guiado — no es
 * parte del contrato `ShellHandle` (que es literal, plan §4) sino un detalle
 * del DOM que construye este módulo; se localiza por su clase estable.
 */
export function createShell(actions: UiActions): ShellHandle {
  const element = document.createElement('div');
  element.className = 'ui-shell';

  const content = document.createElement('section');
  // UI-V9 · **el mismo papel que la crónica, y por ser la misma clase y no una
  // copia de sus valores.** Hasta esta ronda esta hoja se pintaba con
  // `--ui-paper-bg`, un token de U-01 anterior al rediseño y sin textura, así
  // que la gente y la ficha salían en un papel y la crónica en otro. Lo dijo
  // el dueño del diseño: «los fondos que hay detrás de los textos, usa siempre
  // el mismo; el de la crónica es el bueno». `skin-paper--page` es ese papel.
  content.className = 'ui-shell-content skin-paper skin-paper--page skin-torn-top';
  content.hidden = true;
  content.tabIndex = -1;
  // Región etiquetada, no un modal (plan §3): no atrapa el foco, y quien
  // navega con teclado la encuentra por su papel y no por adivinar el DOM.
  content.setAttribute('role', 'region');
  content.setAttribute('aria-label', renderUiText('app.sheet'));

  const contentClose = document.createElement('button');
  contentClose.type = 'button';
  contentClose.className = 'ui-shell-content-close';
  contentClose.setAttribute('aria-label', renderUiText('app.close'));
  contentClose.textContent = '×';
  contentClose.addEventListener('click', () => { actions.navigate({ kind: 'valley' }); });
  content.append(contentClose);

  const contentBody = document.createElement('div');
  contentBody.className = 'ui-shell-content-body';
  content.append(contentBody);

  const stack = document.createElement('div');
  stack.className = 'ui-shell-stack';

  // El hueco del mensaje: `notice.ts` y la pista del inicio guiado se montan
  // aquí desde `app.ts` (`shell.element.querySelector('.ui-shell-message')`),
  // y `resolveMessageSlot` decide cuál de los dos se ve. UI-V2 le añade el
  // borde curvado de la bandeja y el ornamento (plan §3.4): los dos son
  // decorativos y van **antes** que el aviso/la pista en el DOM, para que se
  // pinten arriba del todo del hueco compartido — `notice.ts`/`app.ts` siguen
  // usando `root.append(...)`/`messageSlot.append(hint)`, que añaden al
  // final, así que el orden de pintado queda: borde, hoja, aviso o pista.
  const message = document.createElement('div');
  // VZ-2 · el canto rasgado, igual que la hoja de gente y la página de la
  // crónica: una sola clase para las tres superficies (`skin.css`).
  message.className = 'ui-shell-message skin-torn-top';

  const trayEdge = document.createElement('div');
  trayEdge.className = 'skin-scroll-edge';

  /**
   * VZ-03 · el ornamento tiene dos caras.
   *
   * La hoja de roble del prototipo 01 es lo normal, y no se toca: es decoración
   * (`aria-hidden`). Con una decisión aplazada, el sello de lacre de UI-V5c
   * ocupa su sitio y **el ornamento se vuelve el acceso a la decisión**. Antes
   * eso era una píldora `position: fixed` a 92 px del techo, ajustada a mano en
   * dos rondas; aquí no tiene geometría propia y está donde el jugador ya mira.
   *
   * Es un `<button>` siempre, con `disabled` cuando lleva la hoja: así el DOM no
   * cambia de forma entre los dos estados y no hay dos árboles que mantener.
   */
  const ornament = document.createElement('button');
  ornament.type = 'button';
  ornament.className = 'skin-ornament';
  let ornamentTap: (() => void) | null = null;
  ornament.addEventListener('click', () => { ornamentTap?.(); });
  const setOrnament = (kind: 'leaf' | 'seal', onTap?: () => void): void => {
    ornamentTap = kind === 'seal' ? onTap ?? null : null;
    ornament.classList.toggle('skin-ornament--seal', kind === 'seal');
    ornament.disabled = kind === 'leaf';
    if (kind === 'seal') {
      ornament.removeAttribute('aria-hidden');
      ornament.setAttribute('aria-label', renderUiText('crossroad.waiting'));
      ornament.innerHTML = `<span class="skin-seal" aria-hidden="true">${inlineIcon(SEAL_TREE)}</span>`;
    } else {
      ornament.setAttribute('aria-hidden', 'true');
      ornament.removeAttribute('aria-label');
      ornament.innerHTML = inlineIcon(OAK_LEAF);
    }
  };
  setOrnament('leaf');

  /**
   * VZ-02 · el hueco de la voz: **un párrafo, y siempre el mismo alto.**
   *
   * `aria-live="polite"` porque es lo que era el aviso: algo que aparece sin
   * que nadie lo haya pedido y que un lector de pantalla tiene que anunciar sin
   * interrumpir. `data-role` dice qué voz habla, y con eso la hoja de estilo
   * pone el acento del hito (la hoja de roble en oro) sin que nadie toque una
   * clase desde JavaScript.
   */
  const voice = document.createElement('p');
  voice.className = 'valley-voice';
  voice.setAttribute('aria-live', 'polite');
  /**
   * La frase va en un hijo, y no es capricho: el párrafo **centra** (es una caja
   * flex, para que una frase de una línea quede a media altura del hueco de dos)
   * y en una caja flex un pseudo-elemento es **otro ítem**, no texto en línea.
   * Con el `›` de la pista puesto en el párrafo salía flotando a la derecha, a
   * media altura y separado de la última palabra. Dentro de esta línea, el `›`
   * es lo que tiene que ser: el final de la frase.
   */
  const voiceLine = document.createElement('span');
  voiceLine.className = 'valley-voice-line';
  voice.append(voiceLine);

  message.append(trayEdge, ornament, voice);

  const nav = document.createElement('nav');
  // `ui-shell-nav` sólo aporta ya el respiro del área segura (`shell.css`);
  // toda la piel —papel, filetes, la placa o la madera de la pestaña activa—
  // es `skin-nav` y sus variantes, del kit de UI-V0.
  nav.className = 'ui-shell-nav skin-nav';
  nav.setAttribute('aria-label', renderUiText('nav.bar'));

  const buttons = new Map<NavTab, HTMLButtonElement>();
  // Los filetes verticales entre celdas (plan §3.4): `.skin-rule-v` ya existe
  // en el kit de UI-V0, sólo hacía falta usarlo aquí, entre cada dos botones
  // (dos filetes para tres pestañas, ninguno en los bordes exteriores).
  const rules: HTMLDivElement[] = [];
  // UI-V7 · **Las tres celdas viven en un envoltorio, y la barra sigue siendo
  // la barra.** En una tablet la barra cruza 1240 px y sus tres pestañas se
  // separaban medio palmo; acotar la barra entera la habría convertido en una
  // isla flotante y el prototipo la tiene cruzando la pantalla. Así que el
  // papel y los filetes siguen siendo de la barra y lo que se acota y se centra
  // es esto de dentro (`skin.css`, la sección de la columna de lectura).
  const cells = document.createElement('div');
  cells.className = 'skin-nav-cells';
  const labels: Record<NavTab, string> = {
    valley: renderUiText('nav.valley'),
    chronicle: renderUiText('nav.chronicle'),
    people: renderUiText('nav.people'),
  };
  NAV_TABS.forEach((tabName, index) => {
    if (index > 0) {
      const rule = document.createElement('div');
      rule.className = 'skin-rule-v';
      cells.append(rule);
      rules.push(rule);
    }
    const button = tapButton(labels[tabName], NAV_TAB_ICON[tabName], 'skin-nav-tab');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => { actions.navigate({ kind: tabName }); });
    cells.append(button);
    buttons.set(tabName, button);
  });

  nav.append(cells);
  stack.append(message, nav);
  element.append(content, stack);

  /**
   * UI-V2b · **Lo alto que es la bandeja, publicado como `--ui-stack-height`.**
   *
   * El rincón de velocidad (`.valley-hud-right`, `index.html`) se colocaba con
   * `bottom: 60px`, que era la altura de la barra estrecha de antes del
   * rediseño. Con la bandeja de UI-V2 —hueco de mensaje más navegación— la
   * medida dejó de valer y los dos círculos caían **dentro** de la bandeja:
   * medido en el juego empaquetado a 390 × 844, la bandeja ocupaba de 669 a
   * 844 y los círculos de 740 a 784, tapados por el papel y encima de la
   * navegación.
   *
   * No se arregla con otro número fijo porque **la bandeja no tiene una altura
   * fija**: el hueco del mensaje crece con lo que haya que decir —una frase de
   * actividad de dos líneas, un aviso de la crónica, la pista del inicio
   * guiado— y se encoge a nada cuando no hay nada. Así que se mide y se
   * publica, y quien necesite quedarse por encima la lee.
   *
   * `ResizeObserver` y no un cálculo al montar: la altura cambia sola, sin que
   * nadie navegue ni toque nada, cada vez que el texto del hueco cambia.
   */
  const publishStackHeight = (height: number): void => {
    document.documentElement.style.setProperty('--ui-stack-height', `${Math.round(height)}px`);
  };
  publishStackHeight(stack.getBoundingClientRect().height);
  const stackWatcher = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry !== undefined) publishStackHeight(entry.contentRect.height);
  });
  stackWatcher?.observe(stack);

  const paintRoute = (route: SheetRoute): void => {
    const active = navTabFor(route);
    for (const [tabName, button] of buttons) button.setAttribute('aria-pressed', String(tabName === active));
    // U-14 (design.md §11.2): de toda ruta se sale, y `data-screen` es con lo
    // que un recorrido comprueba desde fuera qué pantalla está activa. Sólo
    // vale una de las tres pestañas: `contentRouteFor` decide aparte si la
    // bandeja de esta carcasa tiene algo que enseñar.
    document.documentElement.dataset.screen = active;
    const inShell = contentRouteFor(route);
    content.hidden = inShell === null;
    // UI-V2 · la piel de la navegación sigue a la ruta, no a la pestaña
    // encendida: `chronicle`/`people`/`inspect` tienen cada una su prototipo
    // (§3.2, §3.3), y `valley`/`orders` comparten el pergamino por defecto.
    const skin = navSkinFor(route);
    nav.classList.toggle('skin-nav--plaque', skin === 'plaque');
    nav.classList.toggle('skin-nav--wood', skin === 'wood');
    for (const rule of rules) rule.classList.toggle('skin-rule-v--on-wood', skin === 'wood');
  };
  paintRoute({ kind: 'valley' });

  return {
    element,
    content: contentBody,
    voice,
    voiceLine,
    setOrnament,
    setRoute: paintRoute,
    // Los botones no llevan más que `addEventListener`: quitar `element` del
    // árbol basta para que dejen de recibir toques y para que el recolector
    // se los lleve en cuanto nadie más los referencie. El observador de la
    // altura sí hay que soltarlo: vive fuera del árbol, colgado del elemento.
    dispose(): void {
      stackWatcher?.disconnect();
      document.documentElement.style.removeProperty('--ui-stack-height');
      element.remove();
    },
  };
}
