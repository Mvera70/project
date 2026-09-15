// M-20 · The first running application shell.

import { TIME } from '@engine/balance';
import { welcomeDigest } from '@engine/chronicle/digest';
import { renderEntry, renderUiText } from '@engine/chronicle/render';
import { answerFor } from './answer';
import { TREND_WEEKS, trendsOf, vitalsOf } from './vitals';
import { NAV_ICONS, VITAL_ICONS } from './icons';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { archiveGame, foundSuccessor, serialize, ticksOwed } from '@engine/save';
import { valleyClock } from '../derive/clock';
import { hourAt } from '../render3d/effects/day-phases';
import { tick, type TickReport } from '@engine/sim';
import type { ArchivedGame, Decision, GameState, SaveFile, Season } from '@engine/state';
import { INTENT_STOPS, PRIORITY_STOPS, stopOf } from '@engine/state';
import type { PriorityName } from '@engine/state';
import { seasonOf, yearOf } from '@engine/time';
import { attachBackend, backendFrom, type BackendHandle } from './backend';
import { persistSave } from './idb';
import { panelFor, type InspectTarget } from './inspect';
import { recogniseGesture, type Point } from './gestures';
import { checkpointSavedAtMs, runLethargy } from './lethargy';
import { startLoop, type Loop } from './loop';
import { doingNow } from './doing';
import { milestonesAt } from './milestones';
import { mountMoments } from './moment';
import { mountNotices } from './notice';
import { openChronicle } from './screens/chronicle';
import { closeCrossroad, openCrossroad } from './screens/crossroad';
import { openEpitaph } from './screens/epitaph';
import { openPeople } from './screens/people';
import { isSpeed, speedLabel, type Speed } from './speed';
import { accentFor, ambientFor, createSoundEngine } from './sound';
import { openWelcome } from './welcome';

export interface App {
  setSpeed(speed: Speed): void;
  state(): Readonly<GameState>;
  archive(): readonly ArchivedGame[];
  decide(optionId: string): boolean;
}

export interface DecisionAttempt {
  accepted: boolean;
  forceTick: boolean;
}

/**
 * The pure core of `App.decide` (v2.60, §2.60): whether the queue accepts the
 * option, and whether accepting it should force an immediate tick. Split from
 * `boot`'s DOM and render loop so the four rules of the decision contract can
 * be checked without booting either — the same way `loop.ts` keeps
 * `advanceAccumulator` pure and leaves `startLoop` as the DOM-bound wrapper.
 *
 * Rule 1: an option is accepted only if a crossroad is pending and nothing is
 * already queued — decided is decided, a second tap cannot replace it.
 * Rules 2–3: accepting forces a tick unless the game is paused; paused, §8.7
 * still lets the decision wait rather than making the player unable to pause.
 */
export function attemptDecision(
  hasPendingCrossroad: boolean,
  alreadyQueued: boolean,
  speed: Speed,
): DecisionAttempt {
  const accepted = hasPendingCrossroad && !alreadyQueued;
  return { accepted, forceTick: accepted && speed !== 0 };
}

export interface Resumption {
  /** Ticks the village owes for the time the tab spent hidden. */
  ticks: number;
  /** Whether coming back deserves the welcome report of §9.2. */
  welcome: boolean;
}

/**
 * What returning from a hidden tab owes (§13.2, v2.84).
 *
 * The lethargy used to run in one place only — `boot` — so it only ever
 * happened when the page was reloaded. A phone that merely locks its screen
 * keeps the page alive, and then §13.2's promise was false: the valley did not
 * keep going, it froze and said nothing about it. Measured on a real Android
 * session: fourteen minutes of wall clock produced seven years instead of the
 * eighteen the speed called for.
 *
 * Paused is still paused. The player who stops the clock and switches apps
 * gets it stopped when they come back, the same way §2.60 lets a decision wait.
 *
 * The welcome report needs an absence worth reporting: below a whole season
 * the digest would have almost nothing to say, and a modal over every glance
 * at another app is worse than the silence it replaces. The threshold is the
 * season itself, not a number chosen for the occasion.
 */
export function resumeAfterHidden(hiddenMs: number, speed: Speed): Resumption {
  if (speed === 0) return { ticks: 0, welcome: false };
  // **A la velocidad que el jugador dejó puesta** (v3.72). `ticksOwed` cuenta a
  // ×1, que es lo correcto para un arranque en frío —el guardado no lleva la
  // velocidad—, pero una pestaña que se oculta sí sabe a qué iba: dejarla en
  // ×16 y cambiar de aplicación catorce minutos devolvía una semana en vez de
  // dieciséis. Con la semana en catorce minutos eso deja de ser una pérdida
  // discutible y pasa a ser el reloj mintiendo, que es justo lo que v3.72
  // vino a arreglar. El tope de una generación sigue mordiendo dentro.
  const ticks = ticksOwed(hiddenMs, speed);
  return { ticks, welcome: ticks >= TIME.WEEKS_PER_SEASON };
}

export function roman(value: number): string {
  const numerals: readonly [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let left = Math.max(1, Math.floor(value));
  let result = '';
  for (const [amount, glyph] of numerals) {
    while (left >= amount) { result += glyph; left -= amount; }
  }
  return result;
}

/** U-06 · una clave del banco por estación: `seasonOf` decide, nunca un literal. */
const SEASON_KEY: Record<Season, string> = {
  spring: 'app.season.spring',
  summer: 'app.season.summer',
  autumn: 'app.season.autumn',
  winter: 'app.season.winter',
};

/** La línea bajo el año (§11.1.1, U-06): la estación del tick, en su frase del banco. */
export function seasonLabel(tick: number): string {
  return renderUiText(SEASON_KEY[seasonOf(tick)]);
}

/** Keep archive identity unambiguous even if the random draw repeats. */
export function nextUnusedSeed(drawn: number, excluded: ReadonlySet<number>): number {
  let candidate = drawn >>> 0;
  while (excluded.has(candidate)) candidate = (candidate + 1) >>> 0;
  return candidate;
}

function freshSeed(excluding: ReadonlySet<number> = new Set()): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return nextUnusedSeed(value[0] as number, excluding);
}

/**
 * Cuanto se aleja el valle por cada muesca de rueda.
 *
 * TUNE: 1,18. Cinco muescas doblan lo que se ve, que es lo que se espera de una
 * rueda; con 1,5 una sola muesca saltaba del pueblo al valle entero.
 */
const WHEEL_STEP = 1.18;

export function boot(root: HTMLElement, save?: SaveFile): App {
  let state = save?.state ?? foundGame(freshSeed());
  const archive: ArchivedGame[] = save !== undefined ? [...save.archive] : [];
  let speed: Speed = 1;
  let lastFraction = 0;
  root.replaceChildren();
  root.className = 'valley-app';

  const canvas = document.createElement('canvas');
  canvas.id = 'valley';
  canvas.setAttribute('aria-label', renderUiText('app.valley'));
  // U-12 · el reloj, donde estaba el título del año. Dos líneas: la hora
  // —«un contador con horas incluso», dueño del diseño— y debajo la fecha, que
  // es el año, la estación y el día. Las dos salen de `valleyClock`, así que la
  // hora que se lee es la del sol que se ve.
  const timeLine = document.createElement('div');
  timeLine.className = 'valley-time';
  const dateLine = document.createElement('div');
  dateLine.className = 'valley-date';
  // §11.1.1 · la tira de la aldea: cuatro cifras, arriba, siempre visibles.
  const vitals = document.createElement('div');
  vitals.className = 'valley-vitals';
  vitals.setAttribute('aria-label', renderUiText('app.vitals'));
  const vital = (icon: string): { cell: HTMLElement; value: HTMLElement; arrow: HTMLElement } => {
    const cell = document.createElement('span');
    cell.className = 'valley-vital';
    cell.innerHTML = icon;
    // U-06 · el bump se apaga solo: `animationend`, nunca un temporizador
    // atado al tick (§11.4). `animation-name` es el único que corre en
    // `.valley-vital.bump` (index.html), así que no hay ambigüedad con otra
    // animación de la misma celda.
    cell.addEventListener('animationend', (event) => {
      if (event.animationName === 'valley-vital-bump') cell.classList.remove('bump');
    });
    const value = document.createElement('b');
    // E4 · la dirección. Dibujada y no escrita, por lo mismo que los iconos: un
    // glifo de flecha sale distinto en cada teléfono y aquí mide siete píxeles.
    // Vacía cuando la cifra está quieta, que en un idle es la mayoría del
    // tiempo — una flecha permanente deja de ser una señal.
    const arrow = document.createElement('i');
    arrow.className = 'valley-trend';
    cell.append(value, arrow);
    vitals.append(cell);
    return { cell, value, arrow };
  };

  /** Las dos flechas, dibujadas una vez. */
  const TREND_MARK: Readonly<Record<'up' | 'down', string>> = {
    up: '<svg viewBox="0 0 8 8" width="7" height="7" aria-hidden="true" focusable="false"'
      + ' fill="currentColor"><path d="M4 1 7 6H1z"/></svg>',
    down: '<svg viewBox="0 0 8 8" width="7" height="7" aria-hidden="true" focusable="false"'
      + ' fill="currentColor"><path d="M4 7 1 2h6z"/></svg>',
  };
  // Los iconos van dibujados, no escritos: un glifo de texto depende de la
  // fuente que tenga el telefono y aqui hay cuatro dibujos de tres trazos.
  const people = vital(VITAL_ICONS.people);
  const food = vital(VITAL_ICONS.food);
  const wood = vital(VITAL_ICONS.wood);
  const spirits = vital(VITAL_ICONS.morale);

  /**
   * **El mando.** E1 de `docs/plan-juego.md`, y la razón de ser de esta ronda.
   *
   * Dos órdenes permanentes: cuánto se siembra y a qué van las manos que
   * sobran. Es lo único que el jugador manda de forma continua, y por tanto lo
   * que hace que las cuatro cifras de la tira signifiquen algo — un número sólo
   * significa algo cuando se mueve porque tú hiciste algo.
   *
   * **Con palabras y no con cifras** (§11.1): «sembrar de más» es una orden que
   * un alguacil entendería; «1,5×» es un ajuste de hoja de cálculo. Y tres
   * posiciones por palanca, no cinco: tres es una decisión, cinco es un dial.
   *
   * Va debajo de la tira y no en un panel aparte porque es **el instrumento de
   * esas cifras**: la orden y su lectura tienen que estar juntas o el jugador no
   * ata una con la otra. El valle sigue ocupando la pantalla.
   */
  /**
   * **La línea de estado: qué está haciendo la aldea.** `doing.ts`.
   *
   * Va entre la tira y el mando porque es la bisagra de los dos: la tira dice
   * cómo está la aldea, esto dice qué está haciendo con ello, y el mando es lo
   * que uno cambia después. Puesta encima del mando, la orden se lee como
   * respuesta a esta frase, que es exactamente lo que es.
   */
  const doing = document.createElement('p');
  doing.className = 'valley-doing';
  // U-11 · la pista del inicio guiado, bajo la línea de órdenes. Oculta salvo
  // la primera vez, y se toca para pasar.
  const hint = document.createElement('button');
  hint.type = 'button';
  hint.className = 'valley-hint';
  hint.hidden = true;

  //
  // **Y desde el 15 sep 2026 es una hoja, no tres filas a la vista.** Las tres
  // filas de doce botones se comían el tercio de arriba de la pantalla, siempre
  // abiertas, encima del valle: un panel de control de desarrollador y no un
  // juego. El dueño del diseño lo dijo sin rodeos —«las nuevas acciones que has
  // puesto ahí con los botones así, comiéndose media pantalla»— y tenía razón.
  //
  // Ahora hay **una línea** bajo la frase de estado que dice cómo están puestas
  // las órdenes, y tocarla abre esta hoja desde abajo, con la misma piel que la
  // ficha de un edificio. Cerrada no ocupa nada. Las tres palancas siguen siendo
  // las mismas: lo que cambia es que el valle vuelve a ser la pantalla.
  const orders = document.createElement('section');
  orders.className = 'valley-panel valley-orders';
  orders.setAttribute('aria-label', renderUiText('app.orders'));
  orders.hidden = true;
  const ordersClose = document.createElement('button');
  ordersClose.type = 'button';
  ordersClose.className = 'valley-panel-close';
  ordersClose.setAttribute('aria-label', renderUiText('app.close'));
  ordersClose.textContent = '×';
  ordersClose.addEventListener('click', () => { orders.hidden = true; });
  const ordersTitle = document.createElement('h2');
  ordersTitle.textContent = renderUiText('app.orders');
  orders.append(ordersClose, ordersTitle);

  /** La línea que resume las órdenes, y la puerta de la hoja. */
  const ordersNow = document.createElement('button');
  ordersNow.type = 'button';
  ordersNow.className = 'valley-orders-now';
  ordersNow.setAttribute('aria-label', renderUiText('app.orders.open'));
  ordersNow.addEventListener('click', () => {
    orders.hidden = !orders.hidden;
    if (!orders.hidden) panel.hidden = true;
  });
  interface Row {
    readonly current: () => string;
    readonly buttons: readonly (readonly [string, HTMLButtonElement])[];
  }
  const leverRows: Row[] = [];

  /** Una fila del mando: su nombre y sus posiciones. */
  const orderRow = (
    name: string,
    stops: readonly { key: string; label: string }[],
    apply: (key: string) => void,
    current: () => string,
  ): void => {
    const row = document.createElement('div');
    row.className = 'valley-order';
    const label = document.createElement('span');
    label.className = 'valley-order-name';
    label.textContent = name;
    const bar = document.createElement('div');
    bar.className = 'valley-order-bar';
    const buttons = stops.map((stop) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = stop.label;
      button.setAttribute('aria-label', `${name}: ${stop.label}`);
      button.addEventListener('click', () => {
        // La orden se da y la aldea la obedece desde el tick siguiente: no se
        // recalcula nada aquí, el motor lee `state.intent` cada semana.
        apply(stop.key);
        paintOrders();
        // E4 · **y la aldea contesta.** Si la orden no se puede cumplir, se dice
        // ahora y una sola vez: un roce repetido cada semana deja de ser una
        // respuesta y se convierte en una regañina.
        const said = answerFor(state);
        if (said !== null) {
          notices.show(state, [{
            tick: state.tick, kind: 'season', templateKey: said.key,
            params: said.params, weight: 2,
          }]);
        }
        // Y se guarda, porque es una decisión del jugador: al volver dos días
        // después la aldea tiene que seguir haciendo lo que se le dijo.
        persist();
      });
      bar.append(button);
      return [stop.key, button] as const;
    });
    row.append(label, bar);
    orders.append(row);
    leverRows.push({ current, buttons });
  };

  for (const lever of ['fields', 'timber'] as const) {
    const prefix = lever === 'fields' ? 'sowing' : 'hands';
    orderRow(
      renderUiText(`app.${prefix}`),
      INTENT_STOPS[lever].map((stop) => ({
        key: stop.key, label: renderUiText(`app.${prefix}.${stop.key}`),
      })),
      (key) => {
        const stop = INTENT_STOPS[lever].find((one) => one.key === key);
        if (stop !== undefined) state.intent = { ...state.intent, [lever]: stop.value };
      },
      () => stopOf(lever, state.intent[lever]),
    );
  }
  // E3 · Y la tercera: qué se levanta antes.
  orderRow(
    renderUiText('app.build'),
    PRIORITY_STOPS.map((key) => ({ key, label: renderUiText(`app.build.${key}`) })),
    (key) => { state.intent = { ...state.intent, priority: key as PriorityName }; },
    () => state.intent.priority,
  );

  const paintOrders = (): void => {
    for (const { current, buttons } of leverRows) {
      const now = current();
      for (const [key, button] of buttons) {
        button.setAttribute('aria-pressed', String(key === now));
      }
    }
    // Y la línea de resumen, con las posiciones en minúscula porque van en
    // mitad de una frase.
    const lower = (key: string): string => renderUiText(key).toLowerCase();
    ordersNow.textContent = renderUiText('app.orders.now', {
      sowing: lower(`app.sowing.${stopOf('fields', state.intent.fields)}`),
      hands: lower(`app.hands.${stopOf('timber', state.intent.timber)}`),
      build: lower(`app.build.${state.intent.priority}`),
    });
  };

  const controls = document.createElement('div');
  controls.className = 'valley-speeds';
  controls.setAttribute('aria-label', renderUiText('app.speed.controls'));
  const buttons = TIME.SPEEDS.map((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = speedLabel(value);
    button.setAttribute('aria-label', speedLabel(value));
    button.addEventListener('click', () => app.setSpeed(value));
    controls.append(button);
    return [value, button] as const;
  });

  // U-09 · el sonido: sintetizado con Web Audio, nunca un fichero (§ ficha del
  // encargo, CLAUDE.md). No suena nada hasta el primer toque (más abajo,
  // junto a los demás gestos) ni si quien juega lo apaga, aquí, junto a la
  // regleta de velocidad — el mismo sitio y la misma piel que ella.
  const sound = createSoundEngine();
  const soundToggle = document.createElement('button');
  soundToggle.type = 'button';
  soundToggle.className = 'valley-sound';
  // Dibujado y no escrito, como `VITAL_ICONS`: dos trazos de más para la
  // fuente que le toque al teléfono no son una opción a este tamaño. Las dos
  // versiones —sonando y en silencio— están las dos en el DOM; el CSS
  // enseña una u otra según `aria-pressed`, nunca cambia el texto.
  soundToggle.innerHTML = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false"'
    + ' fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M3 6.3v3.4h2.3L8.6 12.2V3.8L5.3 6.3z"/>'
    + '<path class="valley-sound-on" d="M10.7 5.3c1 .9 1 4.5 0 5.4"/>'
    + '<path class="valley-sound-on" d="M12.5 3.6c2 1.8 2 6.9 0 8.7"/>'
    + '<path class="valley-sound-off" d="M10.8 5.6 14.2 10.4M14.2 5.6 10.8 10.4"/>'
    + '</svg>';
  const updateSoundToggle = (): void => {
    soundToggle.setAttribute('aria-pressed', String(sound.enabled));
    soundToggle.setAttribute('aria-label', renderUiText(sound.enabled ? 'app.sound.on' : 'app.sound.off'));
  };
  soundToggle.addEventListener('click', () => { sound.setEnabled(!sound.enabled); updateSoundToggle(); });
  updateSoundToggle();
  /**
   * **El tiempo, un control pequeño.** La regleta de cinco botones de 44 px era
   * provisional —«los botones de tiempo son provisionales, evidentemente»— y
   * ocupaba media anchura de la pantalla para algo que se toca dos veces por
   * sesión. Ahora hay un botón que enseña la velocidad de ahora; tocarlo
   * despliega la regleta de siempre a su lado, se elige, y se recoge sola.
   */
  const speedBadge = document.createElement('button');
  speedBadge.type = 'button';
  speedBadge.className = 'valley-speed-badge';
  speedBadge.setAttribute('aria-label', renderUiText('app.speed.open'));
  speedBadge.addEventListener('click', () => { controls.hidden = !controls.hidden; });
  controls.hidden = true;

  const hudRight = document.createElement('div');
  hudRight.className = 'valley-hud-right';
  hudRight.append(soundToggle, controls, speedBadge);

  // U-05 · La barra de abajo: los tres destinos del juego, siempre a la vista
  // en vez de detrás de un gesto que nadie descubre (§11 del plan siguiente).
  const tabbar = document.createElement('nav');
  tabbar.className = 'valley-tabbar';
  // Su propia etiqueta, no la del lienzo: quien navega a oídas oía «el valle»
  // dos veces y no sabía que la segunda era una barra de destinos.
  tabbar.setAttribute('aria-label', renderUiText('nav.bar'));
  const tab = (icon: string, label: string): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'valley-tab';
    button.innerHTML = icon;
    const caption = document.createElement('span');
    caption.textContent = label;
    button.append(caption);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', label);
    tabbar.append(button);
    return button;
  };
  const valleyTab = tab(NAV_ICONS.valley, renderUiText('nav.valley'));
  const chronicleTab = tab(NAV_ICONS.chronicle, renderUiText('nav.chronicle'));
  const peopleTab = tab(NAV_ICONS.people, renderUiText('nav.people'));
  valleyTab.setAttribute('aria-pressed', 'true');
  chronicleTab.addEventListener('click', () => openChronicle(app));
  // U-08 · la pantalla de la gente: la lista de los nombrados vivos y, al
  // tocar uno, su ficha (`src/ui/screens/people.ts`).
  peopleTab.addEventListener('click', () => openPeople(app));
  // `hudRight` es la regleta de velocidad y el botón de sonido juntos (U-09).
  root.append(canvas, timeLine, dateLine, vitals, doing, ordersNow, hint, orders, hudRight, tabbar);
  paintOrders();
  speedBadge.textContent = speedLabel(speed);

  // §11.6: the band that says what just happened, over the valley itself.
  const notices = mountNotices(root);
  // U-02 · y la cartela de lo que pasa una vez, que es otra cosa.
  // Desde qué tick se buscan hitos. Arranca donde arranca la partida, así que
  // una partida cargada no vuelve a celebrar lo que ya celebró.
  let lastMilestoneTick = state.tick;
  /**
   * La cartela, y **sólo para el arranque**.
   *
   * U-02 la puso para los hitos y U-04 la reusó para la frase de la fundación.
   * El dueño del diseño juzgó los hitos al probar la demo —«esto no aporta
   * nada, mejorar o quitar»— y la cartela no era el problema: usarla cada vez
   * que la aldea levanta su primera cualquier-cosa, sí. Una frase de apertura
   * que se dice una vez por partida es otra cosa que una interrupción semanal.
   */
  const moments = mountMoments(root);

  // U-04 · Lo primero que ve quien empieza, y lo único que el juego dice sin
  // que se lo pidan. **No es un tutorial**: es la misma cartela de los hitos
  // con la frase de la fundación, y debajo, en la pantalla, están ya las cuatro
  // cifras de §11.1.1 y el valle andando. Quien lea la línea sabe dónde está,
  // en qué año, y cuántos son; lo demás lo enseña la primera encrucijada, que
  // es el juego enseñándose a sí mismo en vez de explicándose.
  //
  // Sólo en una partida nueva de verdad: no al recargar una partida andada, ni
  // al heredar, que arranca con el tick corrido. Desde U-10 el menú de inicio
  // entrega la partida nueva **como un guardado** (tick 0, sin decisiones), así
  // que lo que la distingue es eso y no que falte `save`. El vuelo de entrada
  // (U-11) lo lee más abajo.
  const fresh = state.tick === 0 && state.history.length === 0;
  if (fresh) {
    moments.show(
      renderUiText('founding.label'),
      renderEntry(
        {
          tick: 0,
          kind: 'season',
          templateKey: 'founding.settled',
          params: { people: vitalsOf(state).people, year: yearOf(state.tick), season: seasonOf(state.tick) },
          weight: 3,
        },
        state.rng,
      ),
      true,
    );
    // E5 · y qué valle es éste, que es lo que hace que un rasgo sea una historia
    // y no un modificador oculto: el jugador tiene que saber dónde está para que
    // su postura sea una decisión y no una apuesta. Va en el aviso y no en la
    // cartela porque es una frase de paso, no el titular de la partida.
    // El aviso tiene **una sola voz**, así que se dice el primero y el otro se
    // lee en la crónica, donde los dos están desde la fundación. Mostrar los dos
    // seguidos sólo enseñaría el segundo: el aviso no tiene cola.
    const [first] = state.traits;
    if (first !== undefined) {
      notices.show(state, [{
        tick: 0, kind: 'founding', templateKey: `valley.${first}`, params: {}, weight: 2,
      }]);
    }
  }

  const panel = document.createElement('section');
  panel.className = 'valley-panel';
  panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  root.append(panel);

  /**
   * Qué render está pintando, dicho en voz alta.
   *
   * `attachBackend` ofrecía `onSwap` desde G-07 y nadie lo enganchaba, así que
   * **no había forma de saber qué render estaba vivo**: ni desde una prueba, ni
   * mirando la página en un teléfono. Y el relevo falla en silencio a
   * propósito —si WebGL no va, el valle sigue en 2D en vez de quedarse en un
   * error—, que es la combinación que hace falta para que un fallo dure
   * semanas. Lo destapó la auditoría: los recorridos de navegador comprobaban
   * el lienzo 2D y pasaban en 730 ms porque el navegador no tenía WebGL, así
   * que la reja llevaba desde G-12 midiendo un juego que ya no se publica.
   *
   * Mismo patrón de observación que `data-app-ready` y `data-tick`: un atributo
   * en la raíz, que no cambia nada de lo que se pinta.
   */
  const stampRender = (handle: BackendHandle): void => {
    document.documentElement.dataset.render = handle.live.kind;
    if (handle.failure !== null) document.documentElement.dataset.renderFailure = handle.failure;
  };

  // G-07 · Canvas pinta desde el primer fotograma, siempre. El 3D —que desde
  // G-12 es el juego— se carga por detrás y releva cuando esté; si falla, el
  // valle sigue en 2D en vez de quedarse en un error.
  /**
   * U-11 · El inicio guiado. Al fundar un valle la vista baja desde la sierra
   * hasta la aldea (`flyIn`), que es lo que el dueño pidió: «la aldea al
   * principio debe verse desde lo alto, así impresiona más ver lo grande que
   * es el mapa». El 3D llega asincrónico, así que el vuelo se pide en cuanto
   * hay un render que sepa volar, y una sola vez. Quien pide menos movimiento
   * no vuela: aterriza directamente.
   */
  let flightWanted = fresh && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Y la pista se programa dos veces si hace falta: al arrancar, por si nunca
  // llega un render que vuele (el 2D, o WebGL caído), y otra vez cuando el
  // vuelo arranca de verdad, que es asincrónico y puede llegar segundos
  // después. La segunda sustituye a la primera.
  let hintTimer: number | null = null;
  let scheduleHint: ((afterMs: number) => void) | null = null;
  const flyIfWanted = (handle: BackendHandle): void => {
    if (!flightWanted || !handle.live.movesCamera) return;
    flightWanted = false;
    handle.live.flyIn(TIME.INTRO_FLIGHT_MS / 1000);
    document.documentElement.dataset.intro = 'flight';
    scheduleHint?.(TIME.INTRO_FLIGHT_MS + TIME.INTRO_HINT_AFTER_MS);
  };
  const backend = attachBackend(canvas, root, {
    kind: backendFrom(location.search, localStorage.getItem('valley.render')),
    onSwap: (handle) => { stampRender(handle); flyIfWanted(handle); },
  });
  stampRender(backend);
  flyIfWanted(backend);
  // Y las dos pistas —dónde están las órdenes, dónde el tiempo—, la primera
  // vez que se funda un valle en este navegador y después del vuelo. Se tocan
  // para pasar; no hay más que eso, porque el juego se enseña solo (U-04).
  const GUIDED_KEY = 'valley.guided';
  let guided = true;
  try { guided = localStorage.getItem(GUIDED_KEY) === 'done'; } catch { /* sin almacenamiento: se enseña igual */ }
  if (fresh && !guided) {
    const steps = ['intro.orders', 'intro.time'];
    let at = 0;
    const showStep = (): void => {
      if (at >= steps.length) {
        hint.hidden = true;
        document.documentElement.dataset.intro = 'done';
        try { localStorage.setItem(GUIDED_KEY, 'done'); } catch { /* idem */ }
        return;
      }
      hint.textContent = renderUiText(steps[at] as string);
      hint.hidden = false;
      document.documentElement.dataset.intro = 'hints';
    };
    hint.addEventListener('click', () => { at += 1; showStep(); });
    scheduleHint = (afterMs: number): void => {
      if (hintTimer !== null) window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(showStep, afterMs);
    };
    scheduleHint((flightWanted ? TIME.INTRO_FLIGHT_MS : 0) + TIME.INTRO_HINT_AFTER_MS);
  }
  const renderer = { paint: (s2: GameState, f: number): void => backend.live.paint(s2, f, speed),
    track: (id: number | null): void => { backend.live.track(id); } };
  // U-06 · si una cifra cambia, su celda hace un bump breve (§11.1.1). Quien
  // pide no ver movimiento no lo ve: la clase ni se llega a poner.
  const reducesMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastVitals = vitalsOf(state);
  /**
   * La tira de hace un mes, y el tick en que se tomó.
   *
   * Contra un mes y no contra la semana anterior: el grano baja cada semana y
   * sube de golpe en la cosecha, así que una flecha semanal apuntaría hacia
   * abajo once meses al año y no diría nada (`vitals.ts`, `TREND_WEEKS`).
   */
  let monthAgo = { at: state.tick, vitals: lastVitals };
  const bump = (cell: HTMLElement, changed: boolean): void => {
    if (!changed || reducesMotion.matches) return;
    // La clase se pone y se quita sola (`animationend` en `vital()`), nunca
    // una transición colgada del tick — §11.4. Quitarla y forzar reflujo
    // antes de re-ponerla es lo que reinicia el bump si la cifra vuelve a
    // cambiar antes de que el anterior haya acabado.
    cell.classList.remove('bump');
    void cell.offsetWidth;
    cell.style.animationDuration = `${TIME.VITAL_BUMP_MS}ms`;
    cell.classList.add('bump');
  };
  let paintedTime = '';
  let paintedDate = '';
  const paint = (fraction: number): void => {
    lastFraction = fraction;
    // U-11 · la altura de la vista, en la raíz, como `data-tick`: es lo único
    // que permite mirar el vuelo de entrada desde una secuencia de capturas o
    // desde un recorrido, sin abrir el renderer.
    const stats = backend.live.stats();
    if (stats !== null) {
      document.documentElement.dataset.viewHeight = stats.viewHeight.toFixed(1);
      // U-12 · y en qué punto de la jornada va el sol, para poder comprobar
      // desde fuera que la hora de abajo es la que se ve por la ventana.
      document.documentElement.dataset.sunPhase = stats.sunPhase.toFixed(4);
    }
    // U-12 · el reloj. Se pinta sólo cuando cambia el texto: a ×64 la hora
    // cambia dos veces por segundo y escribir en el DOM cada fotograma es
    // trabajo de maquetación por nada.
    const clock = valleyClock(state.tick, fraction);
    const hour = hourAt(clock.sunPhase);
    const time = renderUiText('app.clock.time', { hour: String(hour).padStart(2, '0') });
    if (time !== paintedTime) {
      timeLine.textContent = time;
      paintedTime = time;
    }
    const date = renderUiText('app.clock.date', {
      year: clock.year,
      season: seasonLabel(state.tick),
      day: clock.dayOfSeason,
    });
    if (date !== paintedDate) {
      dateLine.textContent = date;
      paintedDate = date;
    }
    const now = vitalsOf(state);
    bump(people.cell, now.people !== lastVitals.people);
    bump(food.cell, now.weeks !== lastVitals.weeks);
    bump(wood.cell, now.wood !== lastVitals.wood);
    bump(spirits.cell, now.morale !== lastVitals.morale);
    // La muestra del mes se releva cuando el mes ha pasado, no en cada
    // fotograma: si se relevara siempre, la comparación sería contra sí misma y
    // todas las flechas estarían quietas.
    if (state.tick - monthAgo.at >= TREND_WEEKS) monthAgo = { at: state.tick, vitals: now };
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
    // La comida es la unica que avisa: §5.3 mata de hambre, y una aldea con
    // menos de un mes de reserva esta a un mal invierno de eso.
    food.cell.classList.toggle('thin', now.weeks < 4);
    // Y la línea de estado. Se recalcula en cada pintado porque `doingNow` es
    // pura y barata —lee el estado y no consume nada— y porque la obra en
    // marcha cambia a mitad de semana cuando se termina algo.
    const said = doingNow(state);
    doing.textContent = said === null ? '' : renderUiText(said.key, said.params);
    doing.hidden = said === null;
    // The same kind of observability hook as `data-app-ready` (M-19): the year
    // on screen is rounded to twelve weeks, and a test about the clock needs
    // the week.
    document.documentElement.dataset.tick = String(state.tick);
    // U-09 · el ambiente sigue el estado, no los sucesos: se recalcula cada
    // pintado y `SoundEngine.update` es quien decide si de verdad cambia algo
    // (no suena hasta el primer toque, §11's silencio por defecto).
    sound.update(ambientFor(state));
    // U-05 · qué destino está abierto ahora mismo. La crónica no guarda su
    // propio estado hacia aquí (`screens/chronicle.ts` no se toca), así que se
    // lee de la propia pantalla: sólo existe mientras está montada.
    const chronicleOpen = document.querySelector('.chronicle-scrim') !== null;
    valleyTab.setAttribute('aria-pressed', String(!chronicleOpen));
    chronicleTab.setAttribute('aria-pressed', String(chronicleOpen));
    renderer.paint(state, fraction);
    // §11.2's third screen opens itself the moment there is something to
    // answer — including the very first paint, for a save or a debug
    // fast-forward that already lands on a posed crossroad. `openCrossroad`
    // is its own no-op once this one is already on screen.
    if (state.crossroad !== null && state.ended === null) openCrossroad(app, state.crossroad);
  };

  /**
   * Cerrar la ficha, que era imposible.
   *
   * Lo dijo el dueño del diseño al probar la demo: *«si seleccionas algo del
   * mapa, nunca se puede deseleccionar lo que aparece seleccionado.»* Tenía tres
   * causas a la vez, y hacían falta las tres para que no hubiera salida: el
   * `pointerdown` que la escondía exigía `event.target === root` y el lienzo
   * está **dentro** de la raíz, así que tocar el valle nunca era tocar la raíz;
   * tocar suelo vacío devolvía un objetivo `terrain` y abría otra ficha en vez
   * de cerrar la anterior; y el único gesto que la cerraba, el deslizamiento
   * hacia abajo, es el mismo movimiento con el que se arrastra el mapa.
   */
  const closePanel = (): void => { panel.hidden = true; };

  const showPanel = (target: InspectTarget): void => {
    const model = panelFor(target, state);
    const heading = document.createElement('h2'); heading.textContent = model.title;
    // Una cruz, que es la salida que se ve. No sustituye a tocar fuera: la
    // sustituye al revés — tocar fuera es lo que se descubre solo, y esto es lo
    // que se ve cuando no se ha descubierto.
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'valley-panel-close';
    close.setAttribute('aria-label', renderUiText('app.close'));
    close.textContent = '×';
    close.addEventListener('click', closePanel);
    panel.replaceChildren(close, heading, ...model.lines.map((line) => { const p = document.createElement('p'); p.textContent = line; return p; }));
    panel.hidden = false;
  };
  const trace = new Map<number, Point[]>();
  let pinchStart: number | null = null;
  /** El ángulo entre los dos dedos al empezar, para girar. */
  let twistStart: number | null = null;
  /** Dónde estaba el punto medio de los dos dedos, para levantar la vista. */
  let midStart: number | null = null;
  let lastTapMs = -Infinity;
  let zoom = 1;

  /**
   * Cuánto se tarda como mucho entre dos toques para que cuenten como uno doble.
   *
   * TUNE: 320 ms. Es el umbral corriente en un móvil; por encima, un segundo
   * toque deliberado en otro sitio se confundía con un doble.
   */
  const DOUBLE_TAP_MS = 320;

  /**
   * Cuánto gira el valle por píxel de giro de los dedos, y por píxel de
   * arrastre con mayúsculas.
   *
   * TUNE: el giro con dos dedos va **uno a uno** con el ángulo de la mano, que
   * es lo único que no se siente raro; el de mayúsculas, 0,4° por píxel, para
   * que media pantalla sea media vuelta.
   */
  const ORBIT_PER_PX = (0.4 * Math.PI) / 180;
  /** Y cuánto se levanta la vista por píxel vertical del punto medio. */
  const PITCH_PER_PX = (0.25 * Math.PI) / 180;

  // **Los gestos van en la raiz, no en un lienzo.**
  //
  // Estaban enganchados al lienzo de Canvas, y cuando el piloto 3D releva, ese
  // lienzo se oculta y aparece otro encima: los gestos se quedaban colgados de
  // un elemento con `display: none`, que no recibe nada. En 3D no funcionaba ni
  // arrastrar, ni pellizcar, ni tocar para abrir la ficha.
  //
  // Enganchados a la raiz da igual cual sea el lienzo vivo, porque los eventos
  // suben. Lo que hay que mirar es que vengan de un lienzo y no de un boton de
  // velocidad, que tambien esta ahi dentro.
  const onValley = (event: Event): boolean => event.target instanceof HTMLCanvasElement;
  /** El lienzo que hay delante ahora mismo, para medir contra su caja. */
  const surface = (): HTMLCanvasElement => backend.live.surface;

  root.addEventListener('pointerdown', (event) => {
    // U-09 · el único sitio que crea o reanuda el `AudioContext`: nunca antes
    // del primer toque, porque el navegador no lo deja arrancar solo. Vale
    // cualquier toque de la raíz, no sólo el del botón de sonido — incluido
    // el del propio botón, cuyo `click` lo enciende un instante después.
    sound.arm();
    if (!onValley(event)) return;
    root.setPointerCapture(event.pointerId);
    trace.set(event.pointerId, [{ x: event.clientX, y: event.clientY, atMs: event.timeStamp }]);
    if (trace.size === 2) {
      const starts = [...trace.values()].map((points) => points[0]!);
      const a = starts[0]!;
      const b = starts[1]!;
      pinchStart = Math.hypot(b.x - a.x, b.y - a.y);
      // **Los tres números de una mano de dos dedos.** Cuánto se separan
      // (acercar), cuánto giran (rumbo) y a dónde va su punto medio (levantar
      // la vista). Son medidas independientes del mismo movimiento, así que se
      // pueden aplicar las tres a la vez sin que se peleen — es la
      // descomposición de una semejanza, no tres gestos compitiendo.
      twistStart = Math.atan2(b.y - a.y, b.x - a.x);
      midStart = (a.y + b.y) / 2;
    }
  });
  root.addEventListener('pointermove', (event) => {
    const points = trace.get(event.pointerId); if (points === undefined) return;
    const previous = points.at(-1);
    points.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    // Un dedo solo arrastra el valle, cuando hay valle que arrastrar. Y con
    // mayúsculas pulsadas **gira**, que es la única forma de girar con un ratón
    // de un botón: en un escritorio no hay dos dedos que retorcer.
    if (trace.size === 1 && previous !== undefined && backend.live.movesCamera) {
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      if (event.shiftKey) backend.live.orbit(-dx * ORBIT_PER_PX, dy * PITCH_PER_PX);
      else backend.live.pan(dx, dy);
    }
    if (pinchStart !== null && trace.size === 2) {
      const ends = [...trace.values()].map((items) => items.at(-1)!);
      const distance = Math.hypot(ends[1]!.x - ends[0]!.x, ends[1]!.y - ends[0]!.y);
      if (backend.live.movesCamera) {
        // D.7 · zoom de verdad, no CSS: se cambia el volumen ortográfico y el
        // punto bajo los dedos se queda donde estaba. Escalar el elemento
        // agranda píxeles ya pintados; esto pinta más cerca.
        const mid = [...trace.values()].map((items) => items.at(-1)!);
        const first = mid[0]!;
        const second = mid[1]!;
        const box = surface().getBoundingClientRect();
        backend.live.zoom(
          pinchStart / distance,
          (first.x + second.x) / 2 - box.left,
          (first.y + second.y) / 2 - box.top,
        );
      } else {
        zoom = Math.max(1, Math.min(2.5, zoom * distance / pinchStart));
        canvas.style.transform = `scale(${zoom})`;
      }
      // El rumbo, uno a uno con el ángulo de la mano. Va en negativo porque
      // girar la mano a la derecha tiene que llevar el valle a la izquierda:
      // se gira la vista alrededor del valle, no el valle delante de la vista.
      if (twistStart !== null && backend.live.movesCamera) {
        const angle = Math.atan2(ends[1]!.y - ends[0]!.y, ends[1]!.x - ends[0]!.x);
        let turn = angle - twistStart;
        // Al cruzar ±π el ángulo salta una vuelta entera y el valle daba un
        // latigazo. Se trae la diferencia al tramo corto.
        while (turn > Math.PI) turn -= 2 * Math.PI;
        while (turn < -Math.PI) turn += 2 * Math.PI;
        backend.live.orbit(-turn, 0);
        twistStart = angle;
      }
      // Y el punto medio subiendo o bajando levanta la vista. Queda libre para
      // esto porque arrastrar ya es cosa de un dedo solo.
      if (midStart !== null && backend.live.movesCamera) {
        const mid = (ends[0]!.y + ends[1]!.y) / 2;
        backend.live.orbit(0, (mid - midStart) * PITCH_PER_PX);
        midStart = mid;
      }
      pinchStart = distance;
    }
  });
  root.addEventListener('pointerup', (event) => {
    const points = trace.get(event.pointerId) ?? [];
    points.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    const gesture = recogniseGesture({ points });
    trace.delete(event.pointerId);
    if (trace.size < 2) { pinchStart = null; twistStart = null; midStart = null; }
    if (gesture === 'tap' || gesture === 'hold') {
      // **Dos toques seguidos vuelven a la vista de partida.** Es la salida de
      // emergencia de poder girar: quien se pierde dando vueltas al valle
      // necesita una tecla de vuelta, y en un móvil no hay teclas.
      const doubleTap = event.timeStamp - lastTapMs < DOUBLE_TAP_MS;
      lastTapMs = event.timeStamp;
      if (doubleTap && backend.live.movesCamera) {
        backend.live.resetView();
        closePanel();
        return;
      }
      // Cada backend sabe qué hay bajo un punto de su propia pantalla: el 2D
      // por proporción de la rejilla, el 3D lanzando un rayo. `mapPoint` se
      // queda para el 2D y no vale para el otro.
      const box = surface().getBoundingClientRect();
      const target = backend.live.pick(
        state, event.clientX - box.left, event.clientY - box.top, lastFraction,
      );
      // **Tocar el suelo deselecciona.** Un objetivo `terrain` es «aquí no hay
      // nada»: abrir una ficha del prado con la anterior detrás era lo que
      // hacía que la selección no tuviera salida.
      if (target === null || target.kind === 'terrain') closePanel();
      else {
        showPanel(target);
        if (gesture === 'hold' && target.kind === 'villager') renderer.track(target.id);
      }
    } else if (!backend.live.movesCamera) {
      // **Los deslizamientos verticales sólo valen donde no hay cámara.**
      //
      // Eran el modo de abrir la crónica y cerrar la ficha antes de que U-05
      // pusiera la barra de destinos abajo. Con cámara son el mismo movimiento
      // que arrastrar el mapa: el valle se movía **y** al soltar se abría la
      // crónica encima. «No se puede bien mover el mapa», y era esto.
      if (gesture === 'swipe_down') closePanel();
      else if (gesture === 'swipe_up') openChronicle(app);
    }
  });

  // La rueda del raton, que en un movil no existe y en un navegador de
  // escritorio es **la unica manera de acercarse**: alli no hay dos dedos que
  // pellizcar. Se vio jugando la demo en el ordenador.
  root.addEventListener('wheel', (event) => {
    if (!onValley(event) || !backend.live.movesCamera) return;
    // Sin esto la pagina entera se mueve debajo del valle.
    event.preventDefault();
    // Las ruedas dan pixeles, lineas o paginas segun el navegador y el raton.
    // Se normaliza a muescas para que una vuelta valga lo mismo en todas.
    const lines = event.deltaMode === 1 ? event.deltaY : event.deltaY / 53;
    const notches = Math.max(-3, Math.min(3, event.deltaMode === 2 ? event.deltaY * 10 : lines));
    const box = surface().getBoundingClientRect();
    backend.live.zoom(
      WHEEL_STEP ** notches,
      event.clientX - box.left,
      event.clientY - box.top,
    );
  }, { passive: false });

  // §13.1: a snapshot and the decision log, every 20 ticks and whenever the
  // tab is hidden. M-25 also writes immediately on ending and beginning again.
  let loop: Loop | undefined;
  let saveQueue = Promise.resolve();
  // During catch-up, a partial state is only as current as the ticks it has
  // actually processed. The checkpoint clock preserves the remaining debt if
  // visibilitychange/pagehide saves between two batches.
  let savedAtOverride: number | null = null;
  const persist = (): void => {
    // Freeze the value now, before either the live loop or "Begin again" can
    // mutate it, and serialize writes in request order. Two independent IDB
    // opens could otherwise let the final dead-village write land after the
    // successor write and resurrect the epitaph on reload.
    const snapshot = structuredClone(serialize(
      state, state.history, archive, savedAtOverride ?? Date.now(),
    ));
    saveQueue = saveQueue.then(() => persistSave(snapshot));
  };
  // §13.2, v2.84. The lethargy used to live only in `boot`, so it only ran on
  // a cold start. A phone that locks its screen keeps the page alive, and the
  // valley simply froze — the promise "sigue sin ti" was false for the most
  // ordinary thing a player does. Hiding notes the hour; coming back owes it.
  let hiddenAtMs: number | null = null;
  let catchingUp = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAtMs = Date.now(); persist(); return; }
    const since = hiddenAtMs;
    hiddenAtMs = null;
    if (since === null || catchingUp || state.ended !== null) return;
    const resumption = resumeAfterHidden(Date.now() - since, speed);
    // Y la velocidad viaja con la ausencia hasta el final. Sin esto,
    // `resumeAfterHidden` decidía que había que recuperar dieciséis semanas y
    // el letargo recuperaba una: lo destapó el recorrido de §13.2 de
    // `valley.shots.ts`, que cuenta los ticks de verdad.
    if (resumption.ticks > 0) catchUpFor(Date.now() - since, resumption.welcome, speed);
  });
  window.addEventListener('pagehide', () => { persist(); loop?.stop(); }, { once: true });

  // The queue behind `decide` (v2.60). `runTick` is the one and only place a
  // queued decision is ever spent: it hands it to `tick`, which applies it at
  // step 3 (§4.2) and nowhere earlier. Consuming it here — not inside
  // `decide` — is what makes "in pause the decision waits" true for free: a
  // paused game just never calls `runTick`, so a decision queued while paused
  // sits untouched until the player unpauses and a real tick runs.
  let pendingDecision: Decision | undefined;
  const finish = (): void => {
    if (state.ended === null) return;
    loop?.stop();
    notices.clear();
    moments.clear();
    closeCrossroad();
    let game = archive.find((item) =>
      item.seed === state.seed && item.endedTick === state.ended?.tick);
    if (game === undefined) {
      game = archiveGame(state);
      archive.push(game);
    }
    persist();
    openEpitaph(app, game, () => {
      state = foundSuccessor(game, freshSeed(new Set(archive.map((item) => item.seed))));
      pendingDecision = undefined;
      lastFraction = 0;
      // La aldea nueva no "cambia" respecto a la que se acaba de cerrar: sin
      // esto, sus cuatro cifras nacían con un bump que no correspondía a nada.
      lastVitals = vitalsOf(state);
      app.setSpeed(1);
      paint(0);
      persist();
      beginLoop();
    });
  };
  const runTick = (): void => {
    if (state.ended !== null) return;
    const decision = pendingDecision;
    pendingDecision = undefined;
    const report = tick(state, CATALOG, decision);
    // Rule 4 (§2.60): the engine hands back what changed and where; `document`
    // and not `root` because the crossroad screen mounts on `document.body`
    // (§11.2's "ocupa la pantalla entera"), outside the app's own root.
    if (report.decided !== null) {
      document.dispatchEvent(new CustomEvent<TickReport>('valley:decided', { detail: report }));
    }
    if (state.ended !== null) { finish(); return; }
    // §11.6: what the chronicle would print in bold, where the player is
    // already looking. Not during a catch-up — nine hundred ticks of notices
    // is a backlog, and the welcome report of §9.2 is what tells that story.
    if (!catchingUp) notices.show(state, report.entries);
    // U-02 · Y lo que pasa una vez. **Después del aviso a propósito**: si en el
    // mismo tick la aldea levanta su primera capilla y además se quema un
    // cobertizo, lo que se queda en pantalla es la capilla, que es lo raro.
    //
    // Tampoco durante un letargo, y por la misma razón que el aviso: quien
    // vuelve tras cuatro horas no quiere ver desfilar treinta hitos, y el parte
    // de bienvenida de §9.2 es lo que cuenta esa ausencia.
    if (!catchingUp) {
      const passed = milestonesAt(state, lastMilestoneTick);
      lastMilestoneTick = state.tick;
      // Ya vienen ordenados por peso: si coinciden dos, manda el mayor.
      const best = passed[0];
      // U-09 · el acento: un hito gana a una encrucijada planteada si
      // coinciden, la misma prioridad que la cartela ya tiene sobre el
      // aviso dos líneas más abajo. `accentFor` no dispara durante un
      // letargo (`catchingUp` es `false` aquí siempre, por construcción de
      // este bloque) y `sound.accent` aplica el fusible de reloj de pared de
      // §11.4 antes de sonar de verdad.
      const kind = accentFor(report.posed, best !== undefined, catchingUp);
      if (kind !== null) sound.accent(kind, Date.now());
      if (best !== undefined) {
        // **Una voz, y es la del aviso.**
        //
        // U-02 le dio al hito una cartela propia —pergamino, filetes, motas—
        // y el dueño del diseño la juzgó al probar la demo: *«esto no aporta
        // nada, mejorar o quitar»*. Tenía razón, y la razón se lee en el
        // comentario que este bloque tenía escrito: la cartela y el aviso
        // competían por el mismo sitio, así que había que apagar uno para
        // encender el otro. Dos lenguajes visuales para «ha pasado algo», y el
        // segundo además interrumpía para contar en pasado y con fecha lo que
        // el jugador estaba viendo ocurrir.
        //
        // Ahora el hito **es** el aviso de ese tick, con el mismo aspecto que
        // cualquier otra cosa que pase, y lo que lo distingue es que queda
        // **marcado en la crónica** (`screens/chronicle.ts`): ahí sí aporta,
        // porque la crónica es donde vive el pasado de la aldea y donde un
        // lector ajeno busca en qué se diferencia una partida de otra.
        //
        // Y un hito de peso 1 ya no interrumpe: `noticeworthy` filtra por
        // debajo de 2, así que lo tranquilo se queda sólo en la crónica. Eso es
        // ganancia, no pérdida.
        notices.show(state, [{
          tick: best.tick, kind: 'season', templateKey: best.key,
          params: best.params, weight: best.weight,
        }]);
        moments.clear();
      }
    }
    if (state.tick % TIME.SAVE_EVERY_TICKS === 0) persist();
  };
  const beginLoop = (): void => {
    loop = startLoop(() => speed, runTick, paint);
  };

  /**
   * §13.2's catch-up, used by both doors into it: a cold start with a save
   * older than a tick, and a return from a hidden tab. The ordinary loop is
   * stopped first — it and the catch-up must never tick the same state at
   * once — and `paint` after every batch is the progress screen: the valley
   * is what fills in.
   */
  const catchUpFor = (elapsedMs: number, showWelcome: boolean, atSpeed = 1): void => {
    loop?.stop();
    loop = undefined;
    catchingUp = true;
    const sinceTick = state.tick;
    // Covers an exit before the first requestAnimationFrame batch has run.
    savedAtOverride = Date.now() - elapsedMs;
    runLethargy(state, elapsedMs, (progress) => {
      savedAtOverride = checkpointSavedAtMs(Date.now(), progress);
      paint(0);
      if (progress.done >= progress.total || progress.ended) {
        catchingUp = false;
        if (state.ended !== null) finish();
        else {
          // Commit the completed catch-up before the ordinary loop can mutate
          // the state. This also supersedes any partial visibility checkpoint.
          persist();
          if (showWelcome) openWelcome(app, welcomeDigest(state, sinceTick));
          beginLoop();
        }
        savedAtOverride = null;
      }
    }, atSpeed);
  };

  const app: App = {
    setSpeed(value: Speed): void {
      if (!isSpeed(value)) throw new Error(`Unsupported speed: ${value as number}`);
      speed = value;
      for (const [candidate, button] of buttons) button.setAttribute('aria-pressed', String(candidate === speed));
      speedBadge.textContent = speedLabel(speed);
      // Elegida, la regleta se recoge: es un desplegable, no un panel.
      controls.hidden = true;
    },
    state(): Readonly<GameState> { return state; },
    archive(): readonly ArchivedGame[] { return archive; },
    decide(optionId: string): boolean {
      const attempt = attemptDecision(state.crossroad !== null, pendingDecision !== undefined, speed);
      if (!attempt.accepted || state.crossroad === null) return false;
      pendingDecision = { templateId: state.crossroad.templateId, optionId };
      if (attempt.forceTick) { runTick(); paint(lastFraction); }
      return true;
    },
  };
  app.setSpeed(speed);
  paint(0);
  document.documentElement.dataset.appReady = 'true';

  const owed = save !== undefined ? ticksOwed(Date.now() - save.savedAtMs) : 0;
  if (state.ended !== null) {
    finish();
  } else if (save !== undefined && owed > 0) {
    // §13.2: the absence is made up in batches *before* the interactive loop
    // starts — the normal loop and the catch-up must never tick the same
    // state at once. `paint` after every batch is the "progress screen":
    // the valley is what fills in, not a bar standing in for it.
    //
    // Gated on `owed > 0`, not just on there being a save: a save reloaded
    // moments after it was written (or the debug route's own synthetic one,
    // stamped `Date.now()` at boot) owes zero ticks, and a "welcome back,
    // nothing happened" screen over every debug route would be worse than
    // the screen it is supposed to replace.
    catchUpFor(Date.now() - save.savedAtMs, true);
  } else {
    beginLoop();
  }

  return app;
}
