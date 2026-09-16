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
// **La pila del mensaje**, y es el fallo concreto que esta ronda tiene que
// dejar imposible (`docs/life-rounds/evidencia-capturas.md` §3): el aviso de
// la crónica (`notice.ts`) y la pista del inicio guiado competían por la
// misma franja con dos offsets fijos y distintos, y en cuanto la pista crecía
// a dos líneas se pisaban. `docs/visual-reference/README.md` §5 da la
// geometría —una sola pila de abajo arriba, y cuando dos mensajes coinciden
// uno cede el sitio y vuelve— y `resolveMessageSlot` es esa regla hecha
// función pura, para el único caso que hoy tiene dos emisores reales.
//
// **UI-V2 · la piel de la bandeja y la navegación** (`docs/ui-redesign/piel/
// plan-piel.md` §3.4). Los tres iconos de la barra ya no son los trazos de
// `../icons` (`NAV_ICONS`, U-05): son los mismos cuatro dibujos del sprite
// grabado de UI-V0 (`public/ui/icons.svg`) — `icons.ts` se queda sin tocar,
// con `NAV_ICONS` vivo pero sin más consumidores que éste. Y la navegación
// cambia de piel según la ruta —papel con subrayado en el valle, placa de
// madera en la crónica, madera entera en la gente/la ficha—, que es lo que
// los tres prototipos hacen y `navSkinFor` es esa regla, pura y probada sin
// DOM como sus vecinas `navTabFor`/`contentRouteFor`.
//
// **Por qué en línea y no `<use href="./ui/icons.svg#…">`, que es lo que el
// plan escribe literal en §13.4.** Medido con el juego empaquetado de verdad
// —`tools/graphics/bundle-game.ts` + `shot.mjs`, que es como esta misma
// ronda se verifica—: un `<use>` que apunta a **otro fichero** no carga bajo
// `file://`. Chromium trata cada URL `file://` como un origen único y
// bloquea la referencia entre documentos («'file:' URLs are treated as
// unique security origins»), y pedir el sprite con `fetch()` en su lugar
// falla igual, por CORS («Cross origin requests are only supported for
// protocol schemes: chrome, …, http, https» — comprobado a mano con un
// arnés mínimo antes de escribir esto, no una hipótesis). El sprite sigue
// siendo la fuente: los cuatro dibujos de abajo (`NAV_TAB_ICON`, `OAK_LEAF`)
// son copia literal de sus `<symbol>` — un cambio de trazo en
// `public/ui/icons.svg` tiene que repetirse aquí a mano hasta que algo
// incruste el sprite en el propio documento (`index.html` o el bundler, los
// dos fuera del alcance de esta ronda). **Esto no es sólo mío**: cualquier
// ronda futura (UI-V1, V3, V4, V5) que use `<use>` contra un fichero externo
// y se verifique con `shot.mjs` va a tropezar con lo mismo — queda dicho en
// el informe de esta ronda para el coordinador.

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
 * La pila del mensaje (visual-reference §5, tabla de coincidencias, primera
 * fila): el aviso de la crónica **cuenta algo que acaba de pasar** y tiene
 * prioridad; la pista del inicio guiado espera **sin marcarse como vista** —
 * quien la mira no ha avanzado su paso, sólo se le ha tapado un instante— y
 * vuelve sola en cuanto el aviso se retira. Pura a propósito: es la regla que
 * hace imposible el pisado de `evidencia-capturas.md` §3, y una prueba puede
 * comprobarla sin montar ni un elemento.
 */
export interface MessageSlotState {
  readonly noticeVisible: boolean;
  readonly hintVisible: boolean;
}
export function resolveMessageSlot(noticeWantsToShow: boolean, hintWantsToShow: boolean): MessageSlotState {
  return { noticeVisible: noticeWantsToShow, hintVisible: hintWantsToShow && !noticeWantsToShow };
}

/**
 * Los cuatro trazos que la barra y el ornamento necesitan, copiados a mano de
 * los `<symbol>` de `public/ui/icons.svg` (ver el porqué en la cabecera del
 * fichero). `.skin-icon` pone `fill`/`stroke`/tamaño; `stroke-width` y las
 * puntas redondeadas del trazo son del propio sprite y van igual aquí.
 */
const NAV_TAB_ICON: Record<NavTab, string> = {
  valley: '<path d="M2 18.5 8.5 7l4.2 7"/><path d="M11 18.5 15.5 10l6.5 8.5z"/>',
  chronicle: '<path d="M12 6.5C10.5 5.2 8.4 4.5 5 4.5v13c3.4 0 5.5.7 7 2 1.5-1.3 3.6-2 7-2v-13'
    + 'c-3.4 0-5.5.7-7 2Z"/><path d="M12 6.5v13"/>',
  people: '<circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.3"/>'
    + '<path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M15 14.2c2.6.2 4.6 2.2 4.6 4.8"/>',
};
const OAK_LEAF = '<path d="M12 21v-7"/><path d="M12 14c-2.6 0-3.8-1.1-3.4-2.4-1.9.2-2.8-1-2.3-2.2'
  + 'C4.5 8.7 4.2 7.3 5.4 6.5 5 5.2 5.9 4 7.4 4.2 8 3 9.6 2.7 10.6 3.6c.5-.6 1.3-.9 1.4-.9s.9.3 1.4.9'
  + 'c1-.9 2.6-.6 3.2.6 1.5-.2 2.4 1 2 2.3 1.2.8.9 2.2-.9 2.9.5 1.2-.4 2.4-2.3 2.2.4 1.3-.8 2.4-3.4 2.4Z"/>';

const inlineIcon = (body: string): string =>
  `<svg class="skin-icon" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

const tapButton = (label: string, iconBody: string, className: string): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.innerHTML = inlineIcon(iconBody);
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
  content.className = 'ui-shell-content';
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
  message.className = 'ui-shell-message';

  const trayEdge = document.createElement('div');
  trayEdge.className = 'skin-scroll-edge';
  const ornament = document.createElement('div');
  ornament.className = 'skin-ornament';
  ornament.setAttribute('aria-hidden', 'true');
  ornament.innerHTML = inlineIcon(OAK_LEAF);
  message.append(trayEdge, ornament);

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
  const labels: Record<NavTab, string> = {
    valley: renderUiText('nav.valley'),
    chronicle: renderUiText('nav.chronicle'),
    people: renderUiText('nav.people'),
  };
  NAV_TABS.forEach((tabName, index) => {
    if (index > 0) {
      const rule = document.createElement('div');
      rule.className = 'skin-rule-v';
      nav.append(rule);
      rules.push(rule);
    }
    const button = tapButton(labels[tabName], NAV_TAB_ICON[tabName], 'skin-nav-tab');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => { actions.navigate({ kind: tabName }); });
    nav.append(button);
    buttons.set(tabName, button);
  });

  stack.append(message, nav);
  element.append(content, stack);

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
    setRoute: paintRoute,
    // Los botones no llevan más que `addEventListener`: quitar `element` del
    // árbol basta para que dejen de recibir toques y para que el recolector
    // se los lleve en cuanto nadie más los referencie.
    dispose(): void { element.remove(); },
  };
}
