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
// dos offsets fijos, `docs/historico/life-rounds/evidencia-capturas.md` §3— podía volver
// por cualquiera de los otros dos caminos.
//
// **UI-V2 · la piel de la bandeja y la navegación** (`docs/ui-redesign/piel/
// plan-piel.md` §3.4). Los tres iconos de la barra ya no son los trazos de
// `../icons` (`NAV_ICONS`, U-05): son los mismos cuatro dibujos del sprite
// grabado de UI-V0 (`public/ui/icons.svg`). La barra comparte su fondo oscuro
// en todas las rutas; la pestaña activa se distingue con una placa y ámbar.
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
    case 'cart':
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
export function contentRouteFor(route: SheetRoute): 'cart' | 'inspect' | 'chronicle' | 'people' | null {
  return route.kind === 'valley' ? null : route.kind;
}

/**
 * La navegación comparte el mismo fondo oscuro en todas las rutas. La pestaña
 * activa ya tiene su placa y acento ámbar propios; cambiar toda la barra al
 * abrir Crónica o Personas hacía que parecieran tres aplicaciones distintas.
 */
export type NavSkin = 'wood';
export function navSkinFor(_route: SheetRoute): NavSkin {
  void _route;
  return 'wood';
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

  // La franja superior es el único punto que arrastra la hoja. El cuerpo
  // conserva el gesto vertical para desplazar sus listas y la crónica.
  const grip = document.createElement('div');
  grip.className = 'ui-sheet-grip';
  grip.setAttribute('aria-hidden', 'true');
  content.append(grip);
  let dragPointer: number | null = null;
  let dragOrigin = 0;
  let dragDistance = 0;
  let sheetCloseTimer: number | null = null;
  const finishDrag = (close: boolean): void => {
    dragPointer = null;
    content.classList.remove('ui-sheet-dragging');
    if (!close) {
      content.style.removeProperty('--ui-sheet-drag');
      return;
    }
    if (sheetCloseTimer !== null) return;
    // El gesto termina siguiendo al dedo hasta salir por la barra. La ruta
    // cambia después del tramo visual; otro toque de navegación lo cancela.
    content.classList.remove('ui-route-enter');
    content.inert = true;
    content.style.setProperty('--ui-sheet-drag', `${content.clientHeight + 24}px`);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
    sheetCloseTimer = window.setTimeout(() => {
      sheetCloseTimer = null;
      actions.navigate({ kind: 'valley' });
    }, duration);
  };
  content.addEventListener('valley:sheet-close', (event) => {
    event.preventDefault();
    finishDrag(true);
  });
  grip.addEventListener('pointerdown', (event) => {
    if (content.hidden || event.button !== 0) return;
    dragPointer = event.pointerId;
    dragOrigin = event.clientY;
    dragDistance = 0;
    content.classList.remove('ui-route-enter');
    content.classList.add('ui-sheet-dragging');
    grip.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  grip.addEventListener('pointermove', (event) => {
    if (event.pointerId !== dragPointer) return;
    dragDistance = Math.max(0, event.clientY - dragOrigin);
    content.style.setProperty('--ui-sheet-drag', `${dragDistance}px`);
    event.preventDefault();
  });
  grip.addEventListener('pointerup', (event) => {
    if (event.pointerId !== dragPointer) return;
    grip.releasePointerCapture(event.pointerId);
    finishDrag(dragDistance >= Math.min(96, content.clientHeight * .25));
  });
  grip.addEventListener('pointercancel', (event) => {
    if (event.pointerId === dragPointer) finishDrag(false);
  });

  const contentClose = document.createElement('button');
  contentClose.type = 'button';
  contentClose.className = 'ui-shell-content-close';
  contentClose.setAttribute('aria-label', renderUiText('app.close'));
  contentClose.textContent = renderUiText('app.close');
  contentClose.addEventListener('click', () => { finishDrag(true); });
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
  /** M-0 · quién contesta a la oferta, y si sus dos toques se ven. */
  const setOffer = (open: boolean, onAnswer?: (accept: boolean) => void): void => {
    offerTap = open ? onAnswer ?? null : null;
    voiceActions.hidden = !open;
  };

  const setOrnament = (kind: 'leaf' | 'seal', onTap?: () => void): void => {
    ornamentTap = kind === 'seal' ? onTap ?? null : null;
    ornament.classList.toggle('skin-ornament--seal', kind === 'seal');
    ornament.disabled = kind === 'leaf';
    if (kind === 'seal') {
      ornament.removeAttribute('aria-hidden');
      ornament.setAttribute('aria-label', renderUiText('crossroad.waiting'));
      ornament.innerHTML = '<span class="skin-seal" aria-hidden="true"><img class="skin-ornament-art skin-ornament-art--seal" src="./ui/art/ornament-tree-seal.png" alt="" /></span>';
    } else {
      ornament.setAttribute('aria-hidden', 'true');
      ornament.removeAttribute('aria-label');
      ornament.innerHTML = '<img class="skin-ornament-art skin-ornament-art--leaf" src="./ui/art/ornament-oak-leaf.png" alt="" />';
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

  /**
   * M-0 · **Los dos toques de una oferta del camino**, dentro de la voz.
   *
   * Aquí y no en una pantalla propia porque es lo que el dueño del diseño
   * eligió el 17 sep 2026: «una oferta que se acepta o se deja pasar», sin
   * pantalla entera. Se montan una vez y se enseñan sólo cuando lo que la voz
   * está diciendo es una oferta, que lo decide `app.ts` con `data-role`.
   */
  const voiceActions = document.createElement('div');
  voiceActions.className = 'valley-voice-actions';
  voiceActions.hidden = true;
  let offerTap: ((accept: boolean) => void) | null = null;
  const answer = (label: string, accept: boolean, className: string): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${className} valley-voice-answer`;
    button.textContent = renderUiText(label);
    button.addEventListener('click', (event) => {
      // La voz entera es el botón de la pista (`app.ts`): un toque en los
      // botones de la oferta no puede leerse además como «pista vista».
      event.stopPropagation();
      offerTap?.(accept);
    });
    voiceActions.append(button);
    return button;
  };
  answer('offer.take', true, 'skin-button--wood');
  answer('offer.leave', false, 'skin-button--parchment');

  voice.append(voiceLine, voiceActions);

  /**
   * A5 · **En qué fase está el valle**, y va aquí por una medida.
   *
   * La fila A5 pide que «la cabecera diga en qué fase está el valle», y en la
   * placa de fecha **no cabe**: medida en el navegador a 390 y a 750, la fecha
   * ocupa 179 px y el arco del sol 90 de los 302 útiles, o sea **23 px de
   * holgura**, y la palabra más corta de las tres pide sesenta y pico. Meterla
   * ahí habría sido recortar en silencio, que es lo que §4 del estándar
   * prohíbe, o inventar una segunda cabecera, que es lo que §3 prohíbe.
   *
   * Así que va donde una hoja grabada pone su título, y **la pieza ya existe**:
   * el ornamento de la bandeja —la hoja de roble entre dos filetes que el
   * prototipo 01 dibuja— es el encabezado de esta superficie, y esto es el
   * título que va debajo. No hay geometría nueva ni un cartón más.
   *
   * **Y la bandeja no se mueve nunca**, que es la promesa de §8: la era nunca
   * está vacía —un valle recién fundado es un caserío— así que esta línea mide
   * lo mismo siempre. Lo que §8 prohíbe es que la bandeja **crezca durante la
   * partida**, no que tenga una línea más.
   */
  const era = document.createElement('div');
  era.className = 'valley-era skin-inscription';
  const setEra = (text: string): void => {
    if (era.textContent !== text) era.textContent = text;
  };

  message.append(trayEdge, ornament, era, voice);

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
    }
    const button = tapButton(labels[tabName], NAV_TAB_ICON[tabName], 'skin-nav-tab');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      if (tabName === 'valley' && !content.hidden) finishDrag(true);
      else actions.navigate({ kind: tabName });
    });
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

  content.addEventListener('animationend', (event) => {
    if (event.target === content && event.animationName === 'ui-route-arrive') {
      content.classList.remove('ui-route-enter');
    }
  });

  const paintRoute = (route: SheetRoute): void => {
    if (sheetCloseTimer !== null) {
      window.clearTimeout(sheetCloseTimer);
      sheetCloseTimer = null;
    }
    dragPointer = null;
    content.classList.remove('ui-sheet-dragging');
    content.inert = false;
    content.style.removeProperty('--ui-sheet-drag');
    const active = navTabFor(route);
    for (const [tabName, button] of buttons) button.setAttribute('aria-pressed', String(tabName === active));
    // U-14 (design.md §11.2): de toda ruta se sale, y `data-screen` es con lo
    // que un recorrido comprueba desde fuera qué pantalla está activa. Sólo
    // vale una de las tres pestañas: `contentRouteFor` decide aparte si la
    // bandeja de esta carcasa tiene algo que enseñar.
    document.documentElement.dataset.screen = active;
    const inShell = contentRouteFor(route);
    content.hidden = inShell === null;
    content.classList.remove('ui-route-enter');
    if (inShell !== null) {
      // La entrada se limita a la superficie de UI: no mueve el canvas, la
      // cámara ni el reloj de simulación. Forzar el estilo inicial permite
      // repetirla al cambiar entre rutas aunque la bandeja ya estuviera abierta.
      void content.offsetWidth;
      content.classList.add('ui-route-enter');
    }
    nav.classList.remove('ui-route-return');
    if (inShell === null) {
      // Al volver al valle sólo entra la carcasa; el lienzo y el reloj quedan
      // quietos. La transición breve da continuidad al cambio de ruta.
      void nav.offsetWidth;
      nav.classList.add('ui-route-return');
    }
    // La función conserva una sola piel por diseño; sólo cambia la selección.
    nav.classList.toggle('skin-nav--wood', navSkinFor(route) === 'wood');
  };
  paintRoute({ kind: 'valley' });

  return {
    element,
    content: contentBody,
    voice,
    voiceLine,
    setOrnament,
    setEra,
    setOffer,
    setRoute: paintRoute,
    // Los botones no llevan más que `addEventListener`: quitar `element` del
    // árbol basta para que dejen de recibir toques y para que el recolector
    // se los lleve en cuanto nadie más los referencie. El observador de la
    // altura sí hay que soltarlo: vive fuera del árbol, colgado del elemento.
    dispose(): void {
      if (sheetCloseTimer !== null) window.clearTimeout(sheetCloseTimer);
      stackWatcher?.disconnect();
      document.documentElement.style.removeProperty('--ui-stack-height');
      element.remove();
    },
  };
}
