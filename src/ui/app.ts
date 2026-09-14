// M-20 · The first running application shell.

import { TIME } from '@engine/balance';
import { welcomeDigest } from '@engine/chronicle/digest';
import { renderEntry, renderUiText } from '@engine/chronicle/render';
import { vitalsOf } from './vitals';
import { NAV_ICONS, VITAL_ICONS } from './icons';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { archiveGame, foundSuccessor, serialize, ticksOwed } from '@engine/save';
import { tick, type TickReport } from '@engine/sim';
import type { ArchivedGame, Decision, GameState, SaveFile, Season } from '@engine/state';
import { seasonOf, yearOf } from '@engine/time';
import { attachBackend, backendFrom } from './backend';
import { persistSave } from './idb';
import { panelFor, type InspectTarget } from './inspect';
import { recogniseGesture, type Point } from './gestures';
import { checkpointSavedAtMs, runLethargy } from './lethargy';
import { startLoop, type Loop } from './loop';
import { milestonesAt } from './milestones';
import { mountMoments } from './moment';
import { mountNotices } from './notice';
import { openChronicle } from './screens/chronicle';
import { closeCrossroad, openCrossroad } from './screens/crossroad';
import { openEpitaph } from './screens/epitaph';
import { isSpeed, speedLabel, type Speed } from './speed';
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
  const ticks = ticksOwed(hiddenMs);
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
  // U-05 · People (U-08) todavía no tiene pantalla propia: mientras tanto su
  // pestaña abre la ficha del último nombrado que se ha tocado, si hay uno.
  let lastNamedTouchedId: number | null = null;
  root.replaceChildren();
  root.className = 'valley-app';

  const canvas = document.createElement('canvas');
  canvas.id = 'valley';
  canvas.setAttribute('aria-label', renderUiText('app.valley'));
  const year = document.createElement('div');
  year.className = 'valley-year';
  // U-06 · bajo el año, la estación: `seasonLabel` la saca de `seasonOf`.
  const season = document.createElement('div');
  season.className = 'valley-season';
  // §11.1.1 · la tira de la aldea: cuatro cifras, arriba, siempre visibles.
  const vitals = document.createElement('div');
  vitals.className = 'valley-vitals';
  vitals.setAttribute('aria-label', renderUiText('app.vitals'));
  const vital = (icon: string): { cell: HTMLElement; value: HTMLElement } => {
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
    cell.append(value);
    vitals.append(cell);
    return { cell, value };
  };
  // Los iconos van dibujados, no escritos: un glifo de texto depende de la
  // fuente que tenga el telefono y aqui hay cuatro dibujos de tres trazos.
  const people = vital(VITAL_ICONS.people);
  const food = vital(VITAL_ICONS.food);
  const wood = vital(VITAL_ICONS.wood);
  const spirits = vital(VITAL_ICONS.morale);

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
  // U-08 todavía no existe (`docs/next-plan.md`): mientras tanto, esto abre la
  // ficha del último nombrado tocado si hay uno, y si no, no hace nada.
  peopleTab.addEventListener('click', () => {
    if (lastNamedTouchedId !== null) showPanel({ kind: 'villager', id: lastNamedTouchedId });
  });
  root.append(canvas, year, season, vitals, controls, tabbar);

  // §11.6: the band that says what just happened, over the valley itself.
  const notices = mountNotices(root);
  // U-02 · y la cartela de lo que pasa una vez, que es otra cosa.
  const moments = mountMoments(root);
  // Desde qué tick se buscan hitos. Arranca donde arranca la partida, así que
  // una partida cargada no vuelve a celebrar lo que ya celebró.
  let lastMilestoneTick = state.tick;

  // U-04 · Lo primero que ve quien empieza, y lo único que el juego dice sin
  // que se lo pidan. **No es un tutorial**: es la misma cartela de los hitos
  // con la frase de la fundación, y debajo, en la pantalla, están ya las cuatro
  // cifras de §11.1.1 y el valle andando. Quien lea la línea sabe dónde está,
  // en qué año, y cuántos son; lo demás lo enseña la primera encrucijada, que
  // es el juego enseñándose a sí mismo en vez de explicándose.
  //
  // Sólo en una partida nueva de verdad: no al recargar, que trae `save`, ni al
  // heredar, que arranca con el tick corrido.
  if (save === undefined && state.tick === 0) {
    moments.show(
      renderUiText('founding.label'),
      renderEntry(
        {
          tick: 0,
          kind: 'season',
          templateKey: 'founding.settled',
          params: { people: vitalsOf(state).people, year: yearOf(state.tick) + 1, season: seasonOf(state.tick) },
          weight: 3,
        },
        state.rng,
      ),
      true,
    );
  }

  const panel = document.createElement('section');
  panel.className = 'valley-panel';
  panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  root.append(panel);

  // G-07 · Canvas pinta desde el primer fotograma, siempre. Si el jugador pidió
  // el piloto 3D con `?render=3d`, se carga por detrás y releva cuando esté;
  // si falla, el valle sigue en 2D en vez de quedarse en un error.
  const backend = attachBackend(canvas, root, {
    kind: backendFrom(location.search, localStorage.getItem('valley.render')),
  });
  const renderer = { paint: (s2: GameState, f: number): void => backend.live.paint(s2, f, speed),
    track: (id: number | null): void => { backend.live.track(id); } };
  // U-06 · si una cifra cambia, su celda hace un bump breve (§11.1.1). Quien
  // pide no ver movimiento no lo ve: la clase ni se llega a poner.
  const reducesMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastVitals = vitalsOf(state);
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
  const paint = (fraction: number): void => {
    lastFraction = fraction;
    year.textContent = renderUiText('app.year', { year: roman(yearOf(state.tick) + 1) });
    season.textContent = seasonLabel(state.tick);
    const now = vitalsOf(state);
    bump(people.cell, now.people !== lastVitals.people);
    bump(food.cell, now.weeks !== lastVitals.weeks);
    bump(wood.cell, now.wood !== lastVitals.wood);
    bump(spirits.cell, now.morale !== lastVitals.morale);
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
    // The same kind of observability hook as `data-app-ready` (M-19): the year
    // on screen is rounded to twelve weeks, and a test about the clock needs
    // the week.
    document.documentElement.dataset.tick = String(state.tick);
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

  const showPanel = (target: InspectTarget): void => {
    // U-05 · lo que People (aún sin pantalla propia) reabre: el último
    // nombrado que se ha tocado, no cualquier vecino sin nombre.
    if (target.kind === 'villager') {
      const person = state.people.villagers.find((item) => item.id === target.id);
      if (person !== undefined && person.named) lastNamedTouchedId = person.id;
    }
    const model = panelFor(target, state);
    const heading = document.createElement('h2'); heading.textContent = model.title;
    panel.replaceChildren(heading, ...model.lines.map((line) => { const p = document.createElement('p'); p.textContent = line; return p; }));
    panel.hidden = false;
  };
  const trace = new Map<number, Point[]>();
  let pinchStart: number | null = null;
  let zoom = 1;

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
    if (!onValley(event)) return;
    root.setPointerCapture(event.pointerId);
    trace.set(event.pointerId, [{ x: event.clientX, y: event.clientY, atMs: event.timeStamp }]);
    if (trace.size === 2) {
      const starts = [...trace.values()].map((points) => points[0]!);
      pinchStart = Math.hypot(starts[1]!.x - starts[0]!.x, starts[1]!.y - starts[0]!.y);
    }
  });
  root.addEventListener('pointermove', (event) => {
    const points = trace.get(event.pointerId); if (points === undefined) return;
    const previous = points.at(-1);
    points.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    // Un dedo solo arrastra el valle, cuando hay valle que arrastrar.
    if (trace.size === 1 && previous !== undefined && backend.live.movesCamera) {
      backend.live.pan(event.clientX - previous.x, event.clientY - previous.y);
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
      pinchStart = distance;
    }
  });
  root.addEventListener('pointerup', (event) => {
    const points = trace.get(event.pointerId) ?? [];
    points.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    const gesture = recogniseGesture({ points });
    trace.delete(event.pointerId); if (trace.size < 2) pinchStart = null;
    if (gesture === 'tap' || gesture === 'hold') {
      // Cada backend sabe qué hay bajo un punto de su propia pantalla: el 2D
      // por proporción de la rejilla, el 3D lanzando un rayo. `mapPoint` se
      // queda para el 2D y no vale para el otro.
      const box = surface().getBoundingClientRect();
      const target = backend.live.pick(
        state, event.clientX - box.left, event.clientY - box.top, lastFraction,
      );
      if (target !== null) {
        showPanel(target);
        if (gesture === 'hold' && target.kind === 'villager') renderer.track(target.id);
      }
    } else if (gesture === 'swipe_down') panel.hidden = true;
    else if (gesture === 'swipe_up') openChronicle(app);
  });
  root.addEventListener('pointerdown', (event) => { if (event.target === root) panel.hidden = true; });

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
    if (resumption.ticks > 0) catchUpFor(Date.now() - since, resumption.welcome);
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
      if (best !== undefined) {
        // **Una voz cada vez.** El aviso y la cartela se pintan a dos dedos el
        // uno del otro, y visto en captura se leen como un bloque de texto
        // apilado. Cuando hay hito, el hito es el titular de ese tick: la
        // banda de §11.6 se retira y vuelve en el siguiente.
        notices.clear();
        moments.show(
          renderUiText(`milestone.kind.${best.kind}`),
          renderEntry(
            { tick: best.tick, kind: 'season', templateKey: best.key, params: best.params, weight: best.weight },
            state.rng,
          ),
          best.weight === 3,
        );
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
  const catchUpFor = (elapsedMs: number, showWelcome: boolean): void => {
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
    });
  };

  const app: App = {
    setSpeed(value: Speed): void {
      if (!isSpeed(value)) throw new Error(`Unsupported speed: ${value as number}`);
      speed = value;
      for (const [candidate, button] of buttons) button.setAttribute('aria-pressed', String(candidate === speed));
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
