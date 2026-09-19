// UI-R2 · La cabecera del valle: hora, fecha, las cuatro cifras, la frase de
// actividad, el acceso a las órdenes y el control de velocidad.
// docs/ui-redesign/implementation-prompt.md, sección UI-R2; design.md §11.1.1.
//
// **UI-V1 · la piel** (`docs/ui-redesign/piel/plan-piel.md` §3.1, §3.2, §5).
// Este fichero seguía pintando con los colores y la maquetación de U-01
// (`index.html`), y esa hoja de estilos **no se toca en esta ronda** —está
// fuera de lo que UI-V1 puede tocar—, así que la piel entra por dos caminos:
//
//   1. Las piezas nuevas (la placa de fecha, el arco del sol, la cabecera
//      compacta de la crónica, los dos círculos de velocidad) son elementos
//      que `index.html` no conocía, y se maquetan enteras con clases de
//      `skin.css` más un puñado de clases propias de esta ronda (`hud-*`).
//   2. Las piezas que ya existían (`.valley-time`, `.valley-date`,
//      `.valley-vitals`, `.valley-vital`, `.valley-speed-badge`) se quedan con
//      su nombre —`tools/shots/valley.shots.ts`, `tools/graphics/shot.mjs` y
//      `tools/pwa/valley.pwa.ts` las buscan por esa clase, y ninguno de los tres
//      es mío en esta ronda— pero se **anulan** con una segunda clase propia
//      en el mismo elemento: dos clases en el propio nodo (p. ej.
//      `.valley-date.hud-date-text`) tienen más especificidad que la regla de
//      una sola clase de `index.html` (`.valley-date`) **sin importar en qué
//      orden cargue cada hoja**, que es justo lo que una hoja nueva que entra
//      «por encima» no puede garantizar por sí sola. Donde `index.html` usa un
//      combinador (`.valley-vital + .valley-vital`), la especificidad empata y
//      hace falta `!important`; está anotado en `skin.css` en cada sitio.
//
// **Por qué se saca de `app.ts` y no antes.** UI-R1 dejó dicho en su informe
// (§9) que este fichero era «lo que queda por construir de verdad»: la
// carcasa, los tokens y la navegación ya existían, pero la cabecera seguía
// siendo DOM suelto dentro de `boot()`, sin nombre propio ni frontera. Aquí
// vive **sobre datos reales** — nunca un literal reconstruido — y sólo lee:
// `vitalsOf`/`trendsOf` (`../vitals.ts`),
// `stopOf`/`INTENT_STOPS` (`@engine/state`, para la frase-resumen de las
// órdenes) y `TIME.SPEEDS`/`speedLabel` (`../speed.ts`) para la velocidad.
// Ninguno de esos módulos se toca: siguen puros y ajenos al DOM.
//
// **Qué no hace.** No decide la ruta (eso es `actions.navigate`, el único
// propietario según `contracts.ts`) y no escribe en `state` — sólo lee. El
// botón de las órdenes emite `navigate({kind:'orders'})`/`navigate({kind:
// 'valley'})` según si la hoja ya está abierta; quien construye esa hoja de
// verdad es `orders.ts`.
//
// **Por qué no se relocaliza a la pila de abajo (`.ui-shell-stack`).**
// `docs/visual-reference/README.md` §5 pide que el acceso a órdenes/tiempo
// viva en esa pila, y `shell.css` lo deja anotado como tarea de esta ronda.
// Se decidió NO hacerlo: `intro.orders` dice «the line **above** is the
// standing orders» y `intro.time` dice «the button at the **right** sets the
// pace» — los dos son referencias de posición en pantalla que darían un texto
// falso si el acceso bajara a la franja de abajo (quedaría por debajo de la
// pista, no por encima). Mover el control sin revisar el texto habría violado
// «nada de texto que no corresponda a lo que se ve». Queda para un cambio que
// toque el texto y el control a la vez, documentado en el informe de ronda.
import { TIME } from '@engine/balance';
import { renderUiText } from '@engine/chronicle/render';
import { crownRefusal } from '@engine/people/crown';
import type { GameState, Season } from '@engine/state';
import {  } from '@engine/state';
import { seasonOf } from '@engine/time';
import { valleyClock } from '@derive/clock';
import { hourAt } from '../../render3d/effects/day-phases';
import { speedLabel, type Speed } from '../speed';
import { TREND_WEEKS, moodFace, trendsOf, vitalsOf, type Vitals } from '../vitals';
import { MEANS_IDS } from '@engine/state';
import { refusalFor } from '@engine/world/means';
import type { SheetRoute, UiActions } from './contracts';

/** U-06 · una clave del banco por estación: `seasonOf` decide, nunca un literal. */
const SEASON_KEY: Record<Season, string> = {
  spring: 'app.season.spring',
  summer: 'app.season.summer',
  autumn: 'app.season.autumn',
  winter: 'app.season.winter',
};

/**
 * La línea bajo el año (§11.1.1, U-06): la estación del tick, en su frase del
 * banco.
 *
 * Vivía en `app.ts`; se muda aquí porque es del mismo cálculo que pinta la
 * fecha y `chronicle.ts` la necesita a través de `roman`, no de ésta —de ahí
 * que `app.ts` la reexporte para no mover el punto de entrada de esa importación.
 */
export function seasonLabel(tick: number): string {
  return renderUiText(SEASON_KEY[seasonOf(tick)]);
}

/** Las dos flechas de tendencia, dibujadas una vez (E4 de `docs/historico/plan-juego.md`). */
const TREND_MARK: Readonly<Record<'up' | 'down', string>> = {
  up: '<svg viewBox="0 0 8 8" width="7" height="7" aria-hidden="true" focusable="false"'
    + ' fill="currentColor"><path d="M4 1 7 6H1z"/></svg>',
  down: '<svg viewBox="0 0 8 8" width="7" height="7" aria-hidden="true" focusable="false"'
    + ' fill="currentColor"><path d="M4 7 1 2h6z"/></svg>',
};

/**
 * ▶ / ⏸ del círculo de velocidad. No sale del sprite de `public/ui/icons.svg`
 * (plan-piel.md §2): los diez iconos de ese fichero son sustantivos del juego
 * —gente, grano, leña, sol…—, y esto es un verbo de reproductor que ningún
 * prototipo dibuja como tal. Se trata como `TREND_MARK`, arriba: un dibujo de
 * tres trazos que ya vivía suelto en este fichero antes de esta ronda.
 */
const PLAYBACK_MARK: Readonly<Record<'play' | 'pause', string>> = {
  play: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"'
    + ' fill="currentColor"><path d="M4 2.3v11.4l10-5.7z"/></svg>',
  pause: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"'
    + ' fill="currentColor"><rect x="3.6" y="2.3" width="3.3" height="11.4" rx="1"/>'
    + '<rect x="9.1" y="2.3" width="3.3" height="11.4" rx="1"/></svg>',
};

/**
 * Un icono del sprite de la piel. **No** `href="./ui/icons.svg#id"`: Chromium
 * bloquea la referencia a un SVG externo cuando la página se abre con
 * `file://` —que es como `tools/graphics/shot.mjs` carga la demo empaquetada
 * para las capturas—, así que los iconos saldrían vacíos en la comparativa
 * sin decir por qué (medido en esta misma ronda, y UI-V2 lo midió a la vez).
 * El coordinador incrusta el sprite dentro de `index.html` (ajeno a esta
 * ronda), y con el sprite ya en el documento la referencia correcta es local,
 * sin ruta de fichero: sólo la almohadilla y el id.
 */
const spriteIcon = (id: string): string =>
  `<svg class="skin-icon" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * El arco del sol de la placa de fecha (plan-piel.md §3.1). Ancho 90, y la
 * altura es la que deja sitio a un sol que sube y baja sin tocar el borde de
 * la placa (34 px de alto).
 *
 * **Función pura, con su prueba** (`tests/fast/ui-v1-sun-arc.test.ts`): 0 es
 * medianoche y 1 el medianoche siguiente —la misma fase que devuelve
 * `valleyClock(tick, fraction).sunPhase`—, y el sol sube en un seno hasta el
 * mediodía de la fase (0,5) y vuelve a bajar. No hace falta importar los
 * amaneceres/anocheceres de `day-phases.ts` para esto: es un adorno de la
 * cabecera, no el reloj, y `hourAt` ya se encarga de decir qué hora parece.
 */
export const SUN_ARC_WIDTH = 90;
/**
 * Lo que sube el sol de un extremo al mediodía.
 *
 * **Once y no veinte**, medido en el prototipo: su arco es una curva muy
 * tendida —172 px de vano y 25 de flecha sobre el PNG, que a 390 de ancho son
 * 79 y 11— y con veinte salía una cúpula que no se parecía a nada.
 */
export const SUN_ARC_HEIGHT = 11;
/**
 * El aire de arriba y de abajo del `viewBox`.
 *
 * Nueve, que es lo que el sol necesita para no salirse: su disco mide diez de
 * diámetro y sus rayos llegan a dieciséis, así que en el mediodía sobresale
 * ocho por encima del trazo.
 */
const SUN_ARC_MARGIN = 9;
const SUN_ARC_VIEW_HEIGHT = SUN_ARC_HEIGHT + SUN_ARC_MARGIN * 2;
/** Cuántas cuentas jalonan el arco, contando las dos de los extremos. */
const SUN_ARC_BEADS = 5;

export interface SunArcPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * El punto del arco para una fracción de día ya normalizada, de 0 a 1.
 *
 * **Existe separado de `sunArcPoint` por un fallo que se vio en la captura:**
 * el trazo se dibujaba muestreando `sunArcPoint`, que da la vuelta al ciclo
 * (`phase - floor(phase)`), así que al pedirle el último punto —fase 1— volvía
 * al origen y la polilínea se cerraba. Eso pintaba una cuerda de un extremo al
 * otro y el arco se leía como una cúpula rellena, no como el camino del sol.
 * Aquí 1 es el extremo derecho, que es lo que un trazo necesita; la vuelta al
 * ciclo se queda donde hace falta, en la posición del sol.
 */
function arcPointAt(day: number): SunArcPoint {
  return { x: day * SUN_ARC_WIDTH, y: SUN_ARC_HEIGHT * (1 - Math.sin(day * Math.PI)) };
}

export function sunArcPoint(phase: number): SunArcPoint {
  const day = Number.isFinite(phase) ? phase - Math.floor(phase) : 0;
  return arcPointAt(day);
}

interface SunArc {
  readonly svg: SVGSVGElement;
  readonly dot: SVGGElement;
}

function createSunArc(): SunArc {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.setAttribute('class', 'hud-sun-arc');
  svg.setAttribute('viewBox', `0 0 ${SUN_ARC_WIDTH} ${SUN_ARC_VIEW_HEIGHT}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  // El trazo: una polilínea que muestrea `arcPointAt`, la misma función que
  // coloca el sol, así que la curva dibujada y lo que se mueve encima no
  // pueden discrepar. **Abierta**: el último punto es el extremo derecho y no
  // el origen — ver el comentario de `arcPointAt`.
  const steps = 24;
  const points = Array.from({ length: steps + 1 }, (_, index) => {
    const point = arcPointAt(index / steps);
    return `${point.x.toFixed(2)},${(point.y + SUN_ARC_MARGIN).toFixed(2)}`;
  }).join(' ');
  const track = document.createElementNS(SVG_NS, 'polyline');
  track.setAttribute('points', points);
  track.setAttribute('class', 'hud-sun-arc-track');
  svg.append(track);

  // Las cuentas que jalonan el camino, como en el prototipo: marcan las horas
  // sin escribirlas. Van debajo del sol, así que se montan antes.
  for (let index = 0; index < SUN_ARC_BEADS; index += 1) {
    const point = arcPointAt(index / (SUN_ARC_BEADS - 1));
    const bead = document.createElementNS(SVG_NS, 'circle');
    bead.setAttribute('r', '2');
    bead.setAttribute('cx', point.x.toFixed(2));
    bead.setAttribute('cy', (point.y + SUN_ARC_MARGIN).toFixed(2));
    bead.setAttribute('class', 'hud-sun-arc-bead');
    svg.append(bead);
  }

  // **El sol es un sol y no un punto.** En el prototipo es un disco ámbar con
  // doce rayos cortos; la primera versión de esta ronda puso un círculo
  // marrón del color del arco y no se leía como nada. Los rayos van en un
  // grupo que se traslada entero, para mover una sola cosa por fotograma.
  const dot = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  dot.setAttribute('class', 'hud-sun-arc-sun');
  const rays = 12;
  for (let index = 0; index < rays; index += 1) {
    const angle = (index / rays) * Math.PI * 2;
    const ray = document.createElementNS(SVG_NS, 'line');
    ray.setAttribute('x1', (Math.cos(angle) * 6.4).toFixed(2));
    ray.setAttribute('y1', (Math.sin(angle) * 6.4).toFixed(2));
    ray.setAttribute('x2', (Math.cos(angle) * 8.4).toFixed(2));
    ray.setAttribute('y2', (Math.sin(angle) * 8.4).toFixed(2));
    dot.append(ray);
  }
  const disc = document.createElementNS(SVG_NS, 'circle');
  disc.setAttribute('r', '5');
  disc.setAttribute('class', 'hud-sun-arc-disc');
  dot.append(disc);

  svg.append(dot);
  return { svg, dot };
}

interface VitalCell {
  readonly cell: HTMLElement;
  readonly value: HTMLElement;
  readonly arrow: HTMLElement;
  /** M-0 · cambiar el dibujo sin rehacer el chip: lo pide la cara del ánimo. */
  setIcon(iconId: string): void;
}

/**
 * M-0 · Cifras grandes en un chip estrecho: 2 610 se lee «2,6k».
 *
 * Hacen falta desde que la fila tiene cinco cifras y no cuatro: la leña llega a
 * decenas de miles en una partida larga (medido: de 507 a 43 000 en cien años,
 * `catalog/trade.ts`) y cinco dígitos en un chip de 62 px empujan al vecino
 * fuera de la pantalla. Hasta mil se dice entero, que es el rango en el que un
 * grano de diferencia importa.
 */
function compact(value: number): string {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  return `${thousands < 10 ? thousands.toFixed(1).replace(/\.0$/u, '') : Math.round(thousands)}k`;
}

/**
 * **UI-V9 · cada cifra vive una sola vez.** Hasta esta ronda vivía dos veces
 * —un chip para la cabecera del valle y una cifra plana para una cabecera
 * compacta que sólo salía en la crónica—, y el dueño del diseño lo cortó de
 * raíz mirando la tablet: «no usamos el mismo que tenemos en la otra pantalla
 * funcionando». Tenía razón: eran dos piezas para el mismo trabajo, la segunda
 * topada a 334 px, y por eso la crónica enseñaba tres cifras de cuatro
 * mientras el valle enseñaba las cuatro.
 */

function makeVitalCell(iconId: string, extraClass: string): VitalCell {
  const cell = document.createElement('span');
  cell.className = `valley-vital ${extraClass}`;
  cell.innerHTML = spriteIcon(iconId);
  // U-06 · el bump se apaga solo: `animationend`, nunca un temporizador
  // atado al tick (§11.4).
  cell.addEventListener('animationend', (event) => {
    if (event.animationName === 'valley-vital-bump') cell.classList.remove('bump');
  });
  const value = document.createElement('b');
  const arrow = document.createElement('i');
  arrow.className = 'valley-trend';
  cell.append(value, arrow);
  return {
    cell,
    value,
    arrow,
    setIcon(next: string): void {
      const icon = cell.querySelector('use');
      if (icon !== null) icon.setAttribute('href', `#${next}`);
    },
  };
}

/** El mando de la carcasa. `header` va donde iba la tira de siempre; `speedControls`
 * y `speedBadge` van dentro de `.valley-hud-right`, junto al botón de sonido,
 * que sigue siendo de `app.ts` (U-09, ajeno a esta ronda). `speedBadge` es
 * ahora un **par** de círculos —▶/⏸ y el multiplicador— porque `app.ts` sólo
 * sabe anexar tres nodos a `.valley-hud-right` y no se toca en esta ronda: los
 * dos círculos de la piel viajan dentro del único hueco que ya tenía reservado
 * (plan-piel.md §3.1, «los dos controles redondos»). */
export interface HudHandle {
  readonly header: HTMLElement;
  readonly speedControls: HTMLElement;
  readonly speedBadge: HTMLElement;
  /**
   * UI-V2b · La voz de la aldea: la frase de actividad y la línea de órdenes,
   * en un envoltorio, **para que las coloque quien tiene la bandeja**.
   *
   * Hasta esta ronda las dos vivían pegadas a la cabecera y flotando sobre el
   * prado arriba a la izquierda, con un parche de altura para no pisar la fila
   * de chips. El prototipo 01 las pone en la bandeja de abajo, centradas bajo
   * la hoja de roble, y ahí es donde tienen sentido: son lo que la aldea dice,
   * no un instrumento de la cabecera.
   *
   * Se exponen y no se colocan aquí a propósito. `hud.ts` es la única mano que
   * escribe su propio DOM (plan §5) y no conoce la carcasa; `app.ts` es la capa
   * que ya hace justo esta clase de reubicación —la pista del inicio guiado
   * entra en la misma ranura con `messageSlot.append(hint)`—, así que la
   * decisión de *dónde* vive esto es suya y de nadie más.
   */
  readonly say: HTMLElement;
  /** Pinta hora, fecha, cifras, tendencias, actividad y resumen de órdenes. */
  paint(state: GameState, fraction: number): void;
  /** La velocidad elegida: marca el botón que toca y recoge la regleta. */
  setSpeed(speed: Speed): void;
  /**
   * Olvida la muestra anterior. Se llama al fundar la aldea sucesora
   * (§13.3): sin esto, la primera cifra de la partida nueva se comparaba
   * contra la última de la que se acaba de cerrar y hacía un bump que no
   * correspondía a nada — el mismo motivo por el que `app.ts` reasignaba
   * `lastVitals` a mano antes de esta ronda.
   */
  reset(): void;
  dispose(): void;
}

export function createHud(actions: UiActions, getRoute: () => SheetRoute): HudHandle {
  // ---------------------------------------------------------------------
  // La placa de fecha del valle (plan §3.1): una placa, el texto de siempre
  // y el arco del sol a la derecha.
  // ---------------------------------------------------------------------
  const dateLine = document.createElement('div');
  dateLine.className = 'valley-date hud-date-text skin-inscription';

  // U-12 sigue calculando la hora — no se borra, se guarda para quien lee con
  // lector de pantalla (`tools/pwa/valley.pwa.ts`/`tools/shots/valley.shots.ts` la siguen
  // comprobando). El prototipo no dibuja un reloj digital, sólo el arco: la
  // cifra se queda, pero fuera de la vista.
  const timeLine = document.createElement('div');
  timeLine.className = 'valley-time hud-clock-sr';

  const sunArc = createSunArc();

  const datePlate = document.createElement('div');
  datePlate.className = 'skin-plate hud-plate-date';
  datePlate.append(dateLine, sunArc.svg);

  // ---------------------------------------------------------------------
  // Las cuatro cifras, un chip cada una (§3.1). **La misma fila en las cuatro
  // pantallas**, que es la directriz de UI-V9.
  // ---------------------------------------------------------------------
  const vitals = document.createElement('div');
  vitals.className = 'valley-vitals hud-chips-row';
  vitals.setAttribute('aria-label', renderUiText('app.vitals'));

  const vital = (iconId: string): VitalCell => {
    const chip = makeVitalCell(iconId, 'skin-plate skin-plate--chip');
    vitals.append(chip.cell);
    return chip;
  };

  // M-0 · **cinco cifras, y el ánimo dentro de la primera.** La fila tenía
  // cuatro chips y ahora la mesa del juego tiene cinco cosas (gente, grano,
  // leña, piedra, plata); el ánimo dejó de ser cifra por decisión del dueño del
  // diseño, así que en vez de un sexto chip **la cara es el icono del chip de
  // la gente**: una sola pieza dice cuántos son y cómo están, que es lo que ese
  // chip quiere decir de verdad. Un sexto chip no cabía a 390 px sin romper el
  // mínimo de toque.
  const people = vital('face-calm');
  const food = vital('wheat');
  const wood = vital('logs');
  const stone = vital('stone');
  const silver = vital('silver');

  // VZ-02 · **la frase de actividad ya no vive aquí.** Era una de las cuatro
  // voces del valle y ahora las cuatro se leen en un solo hueco, el de la
  // bandeja (`shell.ts`, `voice.ts`): `app.ts` ofrece `doingNow` a la cola con
  // papel `state` y la cola decide si se lee. La cabecera se queda con lo que
  // es instrumento —fecha, arco del sol, cifras— y con la línea de órdenes,
  // que no es una voz sino el verbo del juego.

  /**
   * La línea que resume las órdenes, y la puerta de la hoja (`orders.ts`).
   *
   * **Por qué una línea y no tres filas de botones a la vista.** Antes del
   * 15 sep 2026 las tres palancas eran doce botones siempre abiertos,
   * comiéndose el tercio de arriba de la pantalla — «las nuevas acciones que
   * has puesto ahí con los botones así, comiéndose media pantalla», dijo el
   * dueño del diseño, y tenía razón: era un panel de control de desarrollador
   * y no un juego. Esta línea dice cómo están puestas, y tocarla abre la hoja
   * de verdad (`orders.ts`) en `shell.content`.
   */
  const ordersNow = document.createElement('button');
  ordersNow.type = 'button';
  ordersNow.className = 'valley-orders-now hud-say-line hud-say-orders';
  ordersNow.setAttribute('aria-label', renderUiText('cart.open'));
  ordersNow.addEventListener('click', () => {
    // Un único propietario de la ruta (`contracts.ts`): si el carro ya estaba
    // abierto, tocar otra vez vuelve al valle.
    actions.navigate(getRoute().kind === 'cart' ? { kind: 'valley' } : { kind: 'cart' });
  });

  // UI-V2b · la voz de la aldea sale de la cabecera. Las dos líneas van juntas
  // en su envoltorio y `app.ts` lo mete en la bandeja; la cabecera se queda
  // con lo que es instrumento —fecha, arco del sol y cifras—, que es como lo
  // reparte el prototipo.
  const say = document.createElement('div');
  say.className = 'hud-say';
  say.append(ordersNow);

  const header = document.createElement('div');
  header.className = 'ui-hud-header';
  header.append(datePlate, timeLine, vitals);

  /**
   * UI-V10 · **Lo alto que es la cabecera, publicado como `--ui-hud-height`.**
   *
   * Es el mismo patrón —y por el mismo motivo— con el que `shell.ts` publica
   * `--ui-stack-height` desde UI-V2b: la hoja de la crónica y la de la gente
   * pasan a cubrir la pantalla **hasta debajo de la cabecera**, y esa cabecera
   * no tiene una altura fija que nadie pueda escribir a mano — son dos placas
   * con su respiro y el área segura del móvil por encima, así que en un iPhone
   * con muesca mide una cosa y en el portátil otra.
   *
   * `ResizeObserver` y no una cuenta al montar, otra vez por la misma razón:
   * el hueco de las cifras crece el día que el grano llega a cuatro dígitos.
   */
  const publishHeaderHeight = (): void => {
    document.documentElement.style.setProperty(
      '--ui-hud-height',
      `${Math.round(vitals.getBoundingClientRect().bottom)}px`,
    );
  };
  const headerWatcher = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
    publishHeaderHeight();
  });
  // **Se mide la fila de chips, no el envoltorio**, y eso costó una captura: la
  // placa de fecha y la fila de cifras van `position: absolute` (piel de U-01,
  // `index.html`), así que `.ui-hud-header` es una caja de **altura cero** y la
  // primera versión publicaba `0px`. Con eso la crónica arrancaba a 8 px del
  // techo y se tragaba la cabecera entera: se vio en la primera toma de la
  // ronda. Lo que la hoja necesita saber es **dónde acaba lo último de la
  // cabecera**, que es el canto de abajo de los chips en coordenadas de
  // ventana — y la hoja es `position: fixed`, o sea las mismas coordenadas.
  headerWatcher?.observe(vitals);

  // ---------------------------------------------------------------------
  // La velocidad: dos círculos (plan §3.1). Uno pausa/reanuda sin abrir nada
  // —el ▶/⏸ del prototipo—, el otro enseña el multiplicador elegido y
  // despliega la regleta de siempre (`speedControls`), sin tocarla: sigue
  // teniendo las cinco posiciones —pausa incluida— por si se prefiere elegir
  // ahí, y `tools/shots/valley.shots.ts` sigue contando cinco botones.
  // ---------------------------------------------------------------------
  const speedControls = document.createElement('div');
  // UI-V3b · la segunda clase la viste y la coloca (`skin.css`). `valley-speeds`
  // se queda porque `tools/shots/valley.shots.ts` cuenta sus cinco botones por ahí.
  speedControls.className = 'valley-speeds hud-speeds';
  speedControls.setAttribute('aria-label', renderUiText('app.speed.controls'));
  const speedButtons = TIME.SPEEDS.map((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = speedLabel(value);
    button.setAttribute('aria-label', speedLabel(value));
    button.addEventListener('click', () => { actions.setSpeed(value); });
    speedControls.append(button);
    return [value, button] as const;
  });
  speedControls.hidden = true;

  let lastNonZeroSpeed: Speed = 1;
  let paused = false;

  const playPause = document.createElement('button');
  playPause.type = 'button';
  playPause.className = 'skin-plate skin-plate--round hud-round-btn';
  playPause.innerHTML = PLAYBACK_MARK.pause;
  playPause.addEventListener('click', () => {
    // Directo con `actions.setSpeed`: no hay estado propio que llevar, la
    // velocidad de verdad vive en `app.ts` y vuelve por `setSpeed` (abajo).
    actions.setSpeed(paused ? lastNonZeroSpeed : 0);
  });

  const speedBadge = document.createElement('button');
  speedBadge.type = 'button';
  speedBadge.className = 'valley-speed-badge hud-round-btn skin-plate skin-plate--round';
  speedBadge.setAttribute('aria-label', renderUiText('app.speed.open'));
  speedBadge.addEventListener('click', () => { speedControls.hidden = !speedControls.hidden; });

  const speedCluster = document.createElement('div');
  speedCluster.className = 'hud-speed-cluster';
  speedCluster.append(playPause, speedBadge);

  const reducesMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastVitals: Vitals | null = null;
  /**
   * La tira de hace un mes, y el tick en que se tomó (contra un mes y no
   * contra la semana anterior: `vitals.ts`, `TREND_WEEKS`).
   */
  let monthAgo: { at: number; vitals: Vitals } | null = null;
  const bump = (cell: HTMLElement, changed: boolean): void => {
    if (!changed || reducesMotion.matches) return;
    cell.classList.remove('bump');
    void cell.offsetWidth;
    cell.style.animationDuration = `${TIME.VITAL_BUMP_MS}ms`;
    cell.classList.add('bump');
  };
  let paintedTime = '';
  let paintedDate = '';

  const lower = (key: string): string => renderUiText(key).toLowerCase();

  /** Escribe una cifra en su chip. */
  const paintVital = (
    instance: VitalCell,
    text: string,
    changed: boolean,
    way: 'up' | 'down' | 'steady',
    title: string,
    alarm: boolean,
  ): void => {
    bump(instance.cell, changed);
    instance.value.textContent = text;
    instance.arrow.innerHTML = way === 'steady' ? '' : TREND_MARK[way];
    instance.arrow.dataset.way = way;
    instance.cell.title = title;
    // La comida es la única que avisa: §5.3 mata de hambre, y una aldea con
    // menos de un mes de reserva está a un mal invierno de eso. Se conserva
    // en `--ui-alarm` como antes de esta ronda: no es del prototipo.
    instance.cell.classList.toggle('thin', alarm);
  };

  const paint = (state: GameState, fraction: number): void => {
    // U-12 · el reloj. Se pinta sólo cuando cambia el texto: a ×64 la hora
    // cambia dos veces por segundo y escribir en el DOM cada fotograma es
    // trabajo de maquetación por nada.
    const clock = valleyClock(state.tick, fraction);
    const hour = hourAt(clock.sunPhase);
    const time = renderUiText('app.clock.time', { hour: String(hour).padStart(2, '0') });
    if (time !== paintedTime) { timeLine.textContent = time; paintedTime = time; }
    const date = renderUiText('app.clock.date', {
      year: clock.year, season: seasonLabel(state.tick), day: clock.dayOfSeason,
    });
    if (date !== paintedDate) {
      dateLine.textContent = date;
      paintedDate = date;
    }

    // El arco del sol: mismo dato que pinta el cielo del renderer 3D
    // (`GraphicsStats.sunPhase`, U-12/U-13) — `presentation-clock.ts` deja
    // escrito que su fase es «la misma que devuelve
    // `valleyClock(tick, fraction).sunPhase`», con prueba propia
    // (`tests/fast/clock.test.ts`). Leerlo de aquí y no de
    // `backend.live.stats()` evita depender del renderer activo: con Canvas
    // 2D `stats()` da `null` y el arco se quedaría quieto.
    const sun = sunArcPoint(clock.sunPhase);
    // Un grupo no tiene `cx`/`cy`: se traslada. Y se traslada **el grupo
    // entero**, así que el disco y sus doce rayos se mueven como una pieza y
    // el navegador sólo recalcula una transformación por fotograma.
    sunArc.dot.setAttribute(
      'transform',
      `translate(${sun.x.toFixed(2)} ${(sun.y + SUN_ARC_MARGIN).toFixed(2)})`,
    );

    const now = vitalsOf(state);
    if (monthAgo === null || state.tick - monthAgo.at >= TREND_WEEKS) monthAgo = { at: state.tick, vitals: now };
    const trends = trendsOf(now, monthAgo.vitals);
    const changed = (key: keyof Vitals): boolean => lastVitals !== null && now[key] !== lastVitals[key];
    // M-0 · la gente lleva la cara de la aldea, y la flecha sigue siendo la de
    // la gente: son dos cosas y sólo una es una cifra. La cara se cambia sólo
    // cuando cambia de humor, no en cada fotograma.
    const face = moodFace(now.morale);
    if (lastVitals === null || moodFace(lastVitals.morale) !== face) people.setIcon(`face-${face}`);
    paintVital(people, String(now.people), changed('people'), trends.people,
      `${renderUiText('app.vitals.spirits', { mood: lower(`mood.${face}`) })} · ${renderUiText('app.vitals.people', { count: now.people })}`,
      false);
    paintVital(food, String(now.weeks), changed('weeks'), trends.weeks,
      renderUiText('app.vitals.food', { weeks: now.weeks }), now.weeks < 4);
    paintVital(wood, compact(now.wood), changed('wood'), trends.wood,
      renderUiText('app.vitals.wood', { count: now.wood }), false);
    paintVital(stone, compact(now.stone), changed('stone'), trends.stone,
      renderUiText('app.vitals.stone', { count: now.stone }), false);
    paintVital(silver, compact(now.silver), changed('silver'), trends.silver,
      renderUiText('app.vitals.silver', { count: now.silver }), false);
    lastVitals = now;

    // **M-2 · la línea de las órdenes pasa a ser la puerta del carro.**
    //
    // Decía cómo estaban puestas las tres palancas —«sowing enough · hands to
    // both · building as needed»—, y las palancas se retiran: medido, sólo
    // hacían daño (`docs/historico/plan-medios.md` §1). Lo que dice ahora es si hay algo que
    // el valle pueda dar, que es lo único que hace falta saber sin abrirlo: si
    // no alcanza para nada, no merece la pena el toque.
    // K-5 · **y la corona cuenta como algo que dar.** Es lo más grande del
    // carro, así que un valle que puede coronar y no puede pagar nada más tiene
    // que decir que hay algo, o la puerta mentiría.
    const canGiveSomething = MEANS_IDS.some((id) => refusalFor(state, id) === null)
      || crownRefusal(state) === null;
    const cartLine = renderUiText(canGiveSomething ? 'cart.some' : 'cart.nothing');
    if (ordersNow.textContent !== cartLine) ordersNow.textContent = cartLine;
    ordersNow.dataset.cart = canGiveSomething ? 'ready' : 'empty';

  };

  return {
    header,
    speedControls,
    say,
    speedBadge: speedCluster,
    paint,
    setSpeed(speed: Speed): void {
      for (const [candidate, button] of speedButtons) {
        button.setAttribute('aria-pressed', String(candidate === speed));
      }
      paused = speed === 0;
      if (!paused) lastNonZeroSpeed = speed;
      // El multiplicador que se enseña es el que **se retoma**, no el de este
      // instante: en el prototipo el círculo de la derecha sigue diciendo
      // «1×» aunque el de la izquierda esté en pausa, porque es la velocidad
      // elegida y no el estado del reloj.
      speedBadge.textContent = speedLabel(lastNonZeroSpeed);
      playPause.innerHTML = PLAYBACK_MARK[paused ? 'play' : 'pause'];
      playPause.setAttribute('aria-pressed', String(!paused));
      playPause.setAttribute('aria-label', renderUiText(paused ? 'app.speed.resume' : 'app.speed.pause'));
      // Elegida, la regleta se recoge: es un desplegable, no un panel.
      speedControls.hidden = true;
    },
    reset(): void {
      lastVitals = null;
      monthAgo = null;
      paintedTime = '';
      paintedDate = '';
    },
    dispose(): void {
      // El observador vive fuera del árbol, colgado del elemento: quitar el
      // nodo no lo suelta. Mismo trato que `stackWatcher` en `shell.ts`.
      headerWatcher?.disconnect();
      header.remove();
      speedControls.remove();
      speedCluster.remove();
    },
  };
}
