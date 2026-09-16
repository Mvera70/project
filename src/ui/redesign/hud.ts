// UI-R2 · La cabecera del valle: hora, fecha, las cuatro cifras, la frase de
// actividad, el acceso a las órdenes y el control de velocidad.
// docs/ui-redesign/implementation-prompt.md, sección UI-R2; design.md §11.1.1.
//
// **Por qué se saca de `app.ts` y no antes.** UI-R1 dejó dicho en su informe
// (§9) que este fichero era «lo que queda por construir de verdad»: la
// carcasa, los tokens y la navegación ya existían, pero la cabecera seguía
// siendo DOM suelto dentro de `boot()`, sin nombre propio ni frontera. Aquí
// vive **sobre datos reales** — nunca un literal reconstruido — y sólo lee:
// `vitalsOf`/`trendsOf` (`../vitals.ts`), `doingNow` (`../doing.ts`),
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
import type { GameState, Season } from '@engine/state';
import { stopOf } from '@engine/state';
import { seasonOf } from '@engine/time';
import { valleyClock } from '@derive/clock';
import { hourAt } from '../../render3d/effects/day-phases';
import { doingNow } from '../doing';
import { VITAL_ICONS } from '../icons';
import { speedLabel, type Speed } from '../speed';
import { TREND_WEEKS, trendsOf, vitalsOf, type Vitals } from '../vitals';
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

/** Las dos flechas de tendencia, dibujadas una vez (E4 de `docs/plan-juego.md`). */
const TREND_MARK: Readonly<Record<'up' | 'down', string>> = {
  up: '<svg viewBox="0 0 8 8" width="7" height="7" aria-hidden="true" focusable="false"'
    + ' fill="currentColor"><path d="M4 1 7 6H1z"/></svg>',
  down: '<svg viewBox="0 0 8 8" width="7" height="7" aria-hidden="true" focusable="false"'
    + ' fill="currentColor"><path d="M4 7 1 2h6z"/></svg>',
};

interface VitalCell {
  readonly cell: HTMLElement;
  readonly value: HTMLElement;
  readonly arrow: HTMLElement;
}

/** El mando de la carcasa. `header` va donde iba la tira de siempre; `speedControls`
 * y `speedBadge` van dentro de `.valley-hud-right`, junto al botón de sonido,
 * que sigue siendo de `app.ts` (U-09, ajeno a esta ronda). */
export interface HudHandle {
  readonly header: HTMLElement;
  readonly speedControls: HTMLElement;
  readonly speedBadge: HTMLElement;
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
  const timeLine = document.createElement('div');
  timeLine.className = 'valley-time';
  const dateLine = document.createElement('div');
  dateLine.className = 'valley-date';

  const vitals = document.createElement('div');
  vitals.className = 'valley-vitals';
  vitals.setAttribute('aria-label', renderUiText('app.vitals'));
  const vital = (icon: string): VitalCell => {
    const cell = document.createElement('span');
    cell.className = 'valley-vital';
    cell.innerHTML = icon;
    // U-06 · el bump se apaga solo: `animationend`, nunca un temporizador
    // atado al tick (§11.4).
    cell.addEventListener('animationend', (event) => {
      if (event.animationName === 'valley-vital-bump') cell.classList.remove('bump');
    });
    const value = document.createElement('b');
    const arrow = document.createElement('i');
    arrow.className = 'valley-trend';
    cell.append(value, arrow);
    vitals.append(cell);
    return { cell, value, arrow };
  };
  const people = vital(VITAL_ICONS.people);
  const food = vital(VITAL_ICONS.food);
  const wood = vital(VITAL_ICONS.wood);
  const spirits = vital(VITAL_ICONS.morale);

  const doing = document.createElement('p');
  doing.className = 'valley-doing';

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
  ordersNow.className = 'valley-orders-now';
  ordersNow.setAttribute('aria-label', renderUiText('app.orders.open'));
  ordersNow.addEventListener('click', () => {
    // Un único propietario de la ruta (`contracts.ts`): si ya estaban
    // abiertas, tocar otra vez vuelve al valle; si no, las abre.
    actions.navigate(getRoute().kind === 'orders' ? { kind: 'valley' } : { kind: 'orders' });
  });

  const header = document.createElement('div');
  header.className = 'ui-hud-header';
  header.append(timeLine, dateLine, vitals, doing, ordersNow);

  /**
   * **El tiempo, un control pequeño.** La regleta de cinco botones de 44 px
   * era provisional —«los botones de tiempo son provisionales,
   * evidentemente»— y ocupaba media anchura de la pantalla para algo que se
   * toca dos veces por sesión. Ahora hay un botón que enseña la velocidad de
   * ahora (`speedBadge`, más abajo); tocarlo despliega esta regleta a su
   * lado, se elige, y se recoge sola (`setSpeed`).
   */
  const speedControls = document.createElement('div');
  speedControls.className = 'valley-speeds';
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

  const speedBadge = document.createElement('button');
  speedBadge.type = 'button';
  speedBadge.className = 'valley-speed-badge';
  speedBadge.setAttribute('aria-label', renderUiText('app.speed.open'));
  speedBadge.addEventListener('click', () => { speedControls.hidden = !speedControls.hidden; });

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
    if (date !== paintedDate) { dateLine.textContent = date; paintedDate = date; }

    const now = vitalsOf(state);
    if (lastVitals !== null) {
      bump(people.cell, now.people !== lastVitals.people);
      bump(food.cell, now.weeks !== lastVitals.weeks);
      bump(wood.cell, now.wood !== lastVitals.wood);
      bump(spirits.cell, now.morale !== lastVitals.morale);
    }
    if (monthAgo === null || state.tick - monthAgo.at >= TREND_WEEKS) monthAgo = { at: state.tick, vitals: now };
    const trends = trendsOf(now, monthAgo.vitals);
    for (const [key, cell] of [
      ['people', people], ['weeks', food], ['wood', wood], ['morale', spirits],
    ] as const) {
      const way = trends[key];
      cell.arrow.innerHTML = way === 'steady' ? '' : TREND_MARK[way];
      cell.arrow.dataset.way = way;
    }
    lastVitals = now;
    people.value.textContent = String(now.people);
    food.value.textContent = String(now.weeks);
    wood.value.textContent = String(now.wood);
    spirits.value.textContent = String(now.morale);
    people.cell.title = renderUiText('app.vitals.people', { count: now.people });
    food.cell.title = renderUiText('app.vitals.food', { weeks: now.weeks });
    wood.cell.title = renderUiText('app.vitals.wood', { count: now.wood });
    spirits.cell.title = renderUiText('app.vitals.morale', { value: now.morale });
    // La comida es la única que avisa: §5.3 mata de hambre, y una aldea con
    // menos de un mes de reserva está a un mal invierno de eso.
    food.cell.classList.toggle('thin', now.weeks < 4);

    // La línea de estado. Se recalcula en cada pintado porque `doingNow` es
    // pura y barata —lee el estado y no consume nada— y porque la obra en
    // marcha cambia a mitad de semana cuando se termina algo.
    const said = doingNow(state);
    doing.textContent = said === null ? '' : renderUiText(said.key, said.params);
    doing.hidden = said === null;

    // Y el resumen de las tres órdenes, con `stopOf` — nunca redondeando el
    // valor a mano: es la misma función que usa `orders.ts` para pintar los
    // botones, así que las dos lecturas no pueden divergir.
    ordersNow.textContent = renderUiText('app.orders.now', {
      sowing: lower(`app.sowing.${stopOf('fields', state.intent.fields)}`),
      hands: lower(`app.hands.${stopOf('timber', state.intent.timber)}`),
      build: lower(`app.build.${state.intent.priority}`),
    });
  };

  return {
    header,
    speedControls,
    speedBadge,
    paint,
    setSpeed(speed: Speed): void {
      for (const [candidate, button] of speedButtons) {
        button.setAttribute('aria-pressed', String(candidate === speed));
      }
      speedBadge.textContent = speedLabel(speed);
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
      header.remove();
      speedControls.remove();
      speedBadge.remove();
    },
  };
}
