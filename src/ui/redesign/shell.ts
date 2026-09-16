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

import { renderUiText } from '@engine/chronicle/render';
import { NAV_ICONS } from '../icons';
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
 * ruta. Sólo `orders` e `inspect` montan un panel dentro de la carcasa en
 * esta ronda: `chronicle` y `people` siguen sirviéndose por los adaptadores
 * de pantalla completa de `src/ui/screens/`, que UI-R3/UI-R4 migran (plan
 * §6, «los adaptadores existentes siguen atendiendo las pantallas que aún no
 * se han migrado»). Sacarlo a función pura es lo que permite comprobar esa
 * frontera sin levantar DOM.
 */
export function contentRouteFor(route: SheetRoute): 'orders' | 'inspect' | null {
  return route.kind === 'orders' || route.kind === 'inspect' ? route.kind : null;
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

const tapButton = (label: string, icon: string, className: string): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.innerHTML = icon;
  const caption = document.createElement('span');
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
  // y `resolveMessageSlot` decide cuál de los dos se ve.
  const message = document.createElement('div');
  message.className = 'ui-shell-message';

  const nav = document.createElement('nav');
  nav.className = 'ui-shell-nav';
  nav.setAttribute('aria-label', renderUiText('nav.bar'));

  const buttons = new Map<NavTab, HTMLButtonElement>();
  const labels: Record<NavTab, string> = {
    valley: renderUiText('nav.valley'),
    chronicle: renderUiText('nav.chronicle'),
    people: renderUiText('nav.people'),
  };
  for (const tabName of NAV_TABS) {
    const button = tapButton(labels[tabName], NAV_ICONS[tabName], 'ui-shell-tab');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => { actions.navigate({ kind: tabName }); });
    nav.append(button);
    buttons.set(tabName, button);
  }

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
