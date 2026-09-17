// UI-R4 · La ficha, migrada de verdad a la bandeja de la carcasa
// (`ShellHandle.content`). docs/ui-redesign/implementation-prompt.md, sección
// UI-R4; docs/ui-redesign/implementation-plan.md §2.5, §4; design.md §11.2.
//
// **Qué cambia respecto al `app.ts` de antes de esta ronda.** La ficha vivía
// como un `<section class="valley-panel">` suelto, hijo directo de `root`,
// con su propio z-index (3, `index.html`) por debajo de la carcasa nueva
// (`.ui-shell-content`, z-index 13, `shell.css`) — el rectángulo vacío que el
// informe de UI-R2 dejó documentado en su §8: con `contentRouteFor('inspect')`
// ya haciendo visible la bandeja desde UI-R1, tocar un cuerpo o un edificio
// abría **dos** superficies a la vez, una encima tapando a la otra. Aquí la
// ficha se monta dentro de `shell.content`, que pasa a ser la única.
//
// **Por qué conserva la clase `valley-panel` y no crea su propio botón de
// cierre.** `tools/valley.shots.ts` localiza la ficha por
// `.valley-panel:not(.valley-orders)` (líneas 201, 310, 325, 365) — un
// fichero que este brief no puede tocar—, así que el nombre se queda igual.
// Lo que cambia es la piel: `.valley-panel` de `index.html` se pensó para
// vivir sola, con posición absoluta, fondo y sombra propios; anidada dentro
// de `.ui-shell-content` eso dibujaría una hoja dentro de otra hoja. La regla
// de más abajo la aplana sólo cuando vive ahí (selector
// `.ui-shell-content-body .valley-panel`, más específico que el de
// `index.html`, así que gana sin tocar ese fichero), y el cierre que ya trae
// la carcasa (`.ui-shell-content-close`, `shell.ts`) es el único que hace
// falta: no se duplica un segundo «×» como sí hizo `orders.ts` — esa ronda
// tenía una razón de herramientas (`shot.mjs` clica
// `.valley-orders .valley-panel-close`) que aquí no existe.
//
// **Seguir, y lo que de verdad hace.** `implementation-plan.md` §2.5: «no se
// prescribe un nuevo movimiento de cámara ni se promete un centrado que el
// backend no soporte». `src/render3d/renderer.ts` (`track`) apunta la cámara
// una vez hacia quien se sigue y no la vuelve a mover sola; `src/render/
// renderer.ts` (el 2D) sólo dibuja un aro alrededor del cuerpo. Ninguno de
// los dos «centra» de forma continua, así que el texto dice «marca» y no
// «centra» ni «sigue con la cámara» (`inspect.track.note`).
import { renderUiText } from '@engine/chronicle/render';
import { isHere } from '@engine/people/demography';
import type { GameState } from '@engine/state';
import { panelFor, type InspectTarget } from '../inspect';
import { personCard, type CardKin } from '../person-card';
import type { UiActions, UiPanel, UiSnapshot } from './contracts';
import { HEAD_SPRIG, ORNAMENT_VIEWBOX } from './person-ornaments';

const STYLE_ID = 'valley-inspect-panel-style';
const STYLE = `
.ui-shell-content-body .valley-panel { position: static; z-index: auto; left: auto; right: auto; bottom: auto;
  max-height: none; overflow: visible; padding: 0; background: transparent; border-top: 0; box-shadow: none; }
.valley-panel-back { display: inline-flex; align-items: center; box-sizing: border-box; min-height: 44px;
  margin: 0 0 12px; padding: 0 14px; border: 1px solid var(--ui-edge); border-radius: var(--ui-radius-control);
  background: transparent; color: var(--ui-accent-on-paper); font: 600 13px/1 var(--ui-font-plain);
  cursor: pointer; -webkit-tap-highlight-color: transparent; }
.valley-panel-follow { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--ui-edge); }
.valley-panel-follow button { min-height: 44px; padding: 0 16px; border: 1px solid var(--ui-edge);
  border-radius: var(--ui-radius-control); background: transparent; color: var(--ui-paper-ink);
  font: 600 13px/1 var(--ui-font-plain); cursor: pointer; -webkit-tap-highlight-color: transparent; }
.valley-panel-follow button[aria-pressed="true"] { background: var(--ui-paper-ink); color: var(--ui-paper-bg); }
.valley-panel-follow p { margin: 6px 0 0; color: var(--ui-paper-ink-soft); font-size: 12px; line-height: 1.4; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

/**
 * A qué id habría que apuntar el backend, dado lo que la ficha pide (`wants`,
 * el botón «Follow»/«Stop following») y lo que el estado dice ahora mismo.
 * Pura — sin `document` ni `backend.live` — porque es la propiedad que
 * `docs/ui-redesign/acceptance-scenarios.md` pide comprobar sin un navegador:
 * AC-11 («persona ausente o muerta cancela seguimiento») y AC-12 («una ficha
 * de edificio no emite seguimiento de persona»).
 *
 * El resultado puede ser `null` aunque `wants` sea `true`: un edificio, un
 * terreno, alguien fallecido o marchado, o un id que ya no existe en absoluto.
 * Quien llama debe leer ese `null` como la petición cayéndose sola, no como
 * un fallo — es justo lo que evita que la ficha seguiera "prometiendo" un
 * seguimiento que el estado ya no puede cumplir.
 */
export function trackedIdFor(target: InspectTarget, state: GameState, wants: boolean): number | null {
  if (!wants || target.kind !== 'villager') return null;
  const person = state.people.villagers.find((item) => item.id === target.id);
  return person !== undefined && isHere(person) ? target.id : null;
}

/**
 * La ficha: reutiliza `panelFor` para el contenido (título, líneas — building,
 * villager y terrain con la misma función) y añade, sólo cuando el objetivo es
 * una persona que sigue aquí, el control de seguimiento. `from` decide si hace
 * falta una vuelta explícita a la lista (§2.5: «con una acción explícita para
 * volver a la lista»): el «×» compartido de la carcasa siempre vuelve al
 * valle y no sabe de dónde vino la ficha (`shell.ts`, congelado esta ronda).
 *
 * Firma literal de `docs/ui-redesign/implementation-plan.md` §4
 * (`createInspectPanel(actions, target)`), con `from` añadido: sin él no hay
 * forma de ofrecer "volver a la lista" cuando se abrió desde People.
 */
export function createInspectPanel(
  actions: UiActions,
  target: InspectTarget,
  from: 'valley' | 'people',
): UiPanel {
  ensureStyle();
  const element = document.createElement('section');
  element.className = 'valley-panel';
  element.setAttribute('aria-live', 'polite');

  if (from === 'people') {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'valley-panel-back';
    back.textContent = renderUiText('people.back');
    back.addEventListener('click', () => { actions.navigate({ kind: 'people' }); });
    element.append(back);
  }

  const heading = document.createElement('h2');
  element.append(heading);
  // **El cuerpo se declara aquí pero se cuelga después de la ficha**, unas
  // líneas más abajo: es donde va la vida cuando se abre, y colgándolo aquí
  // salía por encima de la placa de cabecera —los recuerdos primero y el
  // nombre debajo—, que fue lo que enseñó la primera captura.
  const body = document.createElement('div');
  body.className = 'person-story';

  // ---------------------------------------------------------------------
  // UI-V4 · La ficha de una persona, con la estructura del prototipo 03:
  // placa de cabecera con medallon, nombre con su edad, oficio y chips de
  // rasgo; tira de parentesco con un medallon en cada punta; y al pie los
  // dos botones. Se monta una sola vez y `render` la rellena o la esconde
  // segun lo que el objetivo sea — un edificio o un terreno siguen por el
  // camino de `panelFor`, que esta ronda no toca.
  // ---------------------------------------------------------------------
  const card = document.createElement('div');
  card.className = 'person-card';
  card.hidden = true;

  const headPlate = document.createElement('div');
  headPlate.className = 'skin-plate person-head';
  const medallion = document.createElement('div');
  medallion.className = 'skin-medallion person-face';
  medallion.setAttribute('aria-hidden', 'true');
  const headText = document.createElement('div');
  headText.className = 'person-head-text';
  const cardName = document.createElement('p');
  cardName.className = 'skin-inscription person-name';
  const cardRole = document.createElement('p');
  cardRole.className = 'person-role';
  const cardChips = document.createElement('div');
  cardChips.className = 'person-chips';
  headText.append(cardName, cardRole, cardChips);
  // El helecho del canto derecho de la placa: marca de agua, calcada del
  // prototipo (`person-ornaments.ts`), no un dibujo a mano.
  const sprig = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  sprig.setAttribute('viewBox', ORNAMENT_VIEWBOX.HEAD_SPRIG);
  sprig.setAttribute('aria-hidden', 'true');
  sprig.setAttribute('focusable', 'false');
  sprig.setAttribute('class', 'person-sprig');
  sprig.innerHTML = HEAD_SPRIG;
  headPlate.append(medallion, headText, sprig);

  const kinStrip = document.createElement('div');
  kinStrip.className = 'person-kin';
  kinStrip.hidden = true;

  const goneLine = document.createElement('p');
  goneLine.className = 'skin-read person-gone';
  goneLine.hidden = true;

  card.append(headPlate, kinStrip, goneLine);
  element.append(card, body);

  const follow = document.createElement('div');
  follow.className = 'valley-panel-follow person-actions';
  const followButton = document.createElement('button');
  followButton.type = 'button';
  // UI-V4 · los dos botones del pie del prototipo 03: madera el de seguir,
  // pergamino el de la vida. Las dos primitivas son de UI-V0 y el prototipo
  // del que salen es exactamente este, así que se usan tal cual.
  followButton.className = 'skin-button--wood person-action';
  followButton.innerHTML = '<svg class="skin-icon" aria-hidden="true" focusable="false"><use href="#footprints"/></svg>';
  const followLabel = document.createElement('span');
  followButton.append(followLabel);
  const storyButton = document.createElement('button');
  storyButton.type = 'button';
  storyButton.className = 'skin-button--parchment person-action';
  storyButton.innerHTML = '<svg class="skin-icon" aria-hidden="true" focusable="false"><use href="#book"/></svg>';
  const storyLabel = document.createElement('span');
  storyButton.append(storyLabel);
  const followNote = document.createElement('p');
  const buttonRow = document.createElement('div');
  buttonRow.className = 'person-action-row';
  buttonRow.append(followButton, storyButton);
  follow.append(buttonRow, followNote);

  let wants = false;
  let storyOpen = false;
  let tracking: number | null = null;
  let latest: GameState | null = null;

  // `contracts.ts`: `track` marca, no centra — el único punto de escritura de
  // esta ficha sobre el mundo, y sólo cuando de verdad cambia (evita llamar a
  // `backend.live.track` con el mismo id en cada fotograma).
  const setTracking = (next: number | null): void => {
    if (next === tracking) return;
    tracking = next;
    actions.track(next);
  };

  /**
   * UI-V4 · Una punta de medallón con su inicial, para la tira de parentesco.
   */
  const kinFace = (tie: CardKin): HTMLElement => {
    const face = document.createElement('div');
    face.className = 'skin-medallion skin-medallion--small';
    face.setAttribute('aria-hidden', 'true');
    face.textContent = tie.monogram;
    return face;
  };

  /**
   * El corazón que separa los dos lazos en el prototipo 03.
   *
   * Dibujado a mano y no calcado, y es la regla de la skill `calcar-iconos`
   * aplicada al revés: calcar gana cuando la pieza es un dibujo con forma
   * propia —un helecho, un capitular—, y dibujar gana cuando es geometría que
   * se escribe en una línea. Un corazón es lo segundo.
   */
  const kinHeart = (): SVGSVGElement => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 20 18');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'person-heart');
    svg.innerHTML = '<path fill="currentColor" d="M10 17C4 12.6 1 9.6 1 6.4'
      + 'A5.4 5.4 0 0 1 10 3a5.4 5.4 0 0 1 9 3.4C19 9.6 16 12.6 10 17Z"/>';
    return svg;
  };

  /** Un lazo: «Nombre · palabra», con la palabra en cursiva como el prototipo. */
  const kinText = (tie: CardKin): HTMLElement => {
    const line = document.createElement('p');
    line.className = 'person-kin-name';
    const name = document.createElement('strong');
    name.textContent = tie.name;
    const word = document.createElement('em');
    word.textContent = tie.relation;
    line.append(name, document.createTextNode(' · '), word);
    return line;
  };

  const render = (): void => {
    if (latest === null) return;
    const model = panelFor(target, latest);

    // ------------------------------------------------------------------
    // El camino de la persona: la ficha del prototipo 03. Un edificio o un
    // terreno siguen por el camino plano de `panelFor`, que esta ronda no
    // toca — son otra clase de cosa y no tienen ni cara ni parientes.
    // ------------------------------------------------------------------
    const person = target.kind === 'villager' ? personCard(latest, target.id) : null;
    card.hidden = person === null;
    heading.hidden = person !== null;

    if (person !== null) {
      medallion.textContent = person.monogram;
      // El nombre lleva la edad detrás, separada por un punto volado, como en
      // el prototipo («HEREWARD · 21 WINTERS»). Quien ya no está no tiene
      // edad de hoy: su frase va en su propia línea, más abajo.
      cardName.textContent = person.age === null
        ? person.name
        : `${person.name} · ${renderUiText('inspect.age.short', { age: person.age })}`;
      cardRole.textContent = person.role ?? '';
      cardRole.hidden = person.role === null;
      cardChips.replaceChildren(...person.traits.map((trait) => {
        const chip = document.createElement('span');
        chip.className = 'skin-chip';
        chip.textContent = trait;
        return chip;
      }));
      cardChips.hidden = person.traits.length === 0;

      goneLine.textContent = person.gone ?? '';
      goneLine.hidden = person.gone === null;

      // La tira de parentesco sólo aparece cuando hay a quién poner en ella:
      // una tira vacía con dos aros sin inicial diría que alguien no tiene a
      // nadie, y lo que de verdad pasa es que nadie le tiene una opinión
      // fuerte todavía.
      kinStrip.hidden = person.kin.length === 0;
      if (person.kin.length > 0) {
        // **El sitio lo decide el calor del lazo, no el orden de la lista.**
        // En el prototipo el lazo cálido va a la izquierda y el frío a la
        // derecha, cada uno con su medallón en su punta. Colocar por posición
        // —el primero a la izquierda— ponía al rival a la izquierda cuando
        // alguien no tiene ningún lazo cálido, que es el caso normal en una
        // aldea joven.
        const warm = person.kin.find((tie) => tie.warm);
        const cold = person.kin.find((tie) => !tie.warm);
        const pieces: (HTMLElement | SVGSVGElement)[] = [];
        if (warm !== undefined) pieces.push(kinFace(warm), kinText(warm));
        // El corazón va en medio y sólo cuando hay dos lazos: con uno solo no
        // separa nada.
        if (warm !== undefined && cold !== undefined) pieces.push(kinHeart());
        if (cold !== undefined) pieces.push(kinText(cold), kinFace(cold));
        kinStrip.replaceChildren(...pieces);
      }

      // La vida, detrás del botón: son los recuerdos que el motor guarda, los
      // mismos que la ficha enseñaba en fila antes de esta ronda.
      body.replaceChildren(...person.memories.map((line) => {
        const p = document.createElement('p');
        p.className = 'skin-read person-memory';
        p.textContent = line;
        return p;
      }));
      body.hidden = !storyOpen || person.memories.length === 0;
    } else {
      heading.textContent = model.title;
      body.hidden = false;
      body.replaceChildren(...model.lines.map((line) => {
        const p = document.createElement('p');
        p.textContent = line;
        return p;
      }));
    }

    // AC-12: comprobar con `wants: true` es "¿podría seguirse a alguien aquí,
    // si se pidiera?" — nunca es el propio `track`, así que probarlo no
    // dispara nada. Sólo una persona presente pasa esta comprobación: un
    // edificio, un terreno, un fallecido, un emigrado o un id que ya no
    // existe, no.
    const followable = target.kind === 'villager' && trackedIdFor(target, latest, true) !== null;
    if (followable) {
      setTracking(trackedIdFor(target, latest, wants));
      followLabel.textContent = renderUiText(wants ? 'inspect.unfollow' : 'inspect.follow');
      followButton.setAttribute('aria-pressed', String(wants));
      followNote.textContent = renderUiText('inspect.track.note', { name: model.title });
      // El botón de la vida sólo tiene sentido si hay vida que contar: sin un
      // recuerdo guardado abriría un hueco vacío.
      const hasStory = person !== null && person.memories.length > 0;
      storyButton.hidden = !hasStory;
      storyLabel.textContent = renderUiText(storyOpen ? 'inspect.story.close' : 'inspect.story');
      storyButton.setAttribute('aria-pressed', String(storyOpen));
      if (!element.contains(follow)) element.append(follow);
    } else {
      // AC-11 · si el estado ya no deja seguir —se murió, se fue, o ya no
      // existe— la petición se cae sola y el control desaparece: no tiene
      // sentido dejar un botón que nunca va a poder cumplir lo que promete.
      wants = false;
      setTracking(null);
      if (element.contains(follow)) follow.remove();
    }
  };
  followButton.addEventListener('click', () => { wants = !wants; render(); });
  storyButton.addEventListener('click', () => { storyOpen = !storyOpen; render(); });

  return {
    element,
    update(snapshot: UiSnapshot): void { latest = snapshot.state; render(); },
    // Cerrar = cancelar lo que esta ficha empezó (§2.5: «cerrar la ficha
    // termina el seguimiento iniciado desde ella»), sea cual sea el camino de
    // salida: el «×» compartido, la vuelta a la lista, o navegar a otra cosa
    // sin más. `app.ts` llama a esto una vez por cada ficha que deja de estar
    // montada — nunca dos veces sin que haya una nueva de por medio.
    dispose(): void { setTracking(null); },
  };
}
