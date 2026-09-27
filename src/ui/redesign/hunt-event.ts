// La caza, como eventos rápidos. 27 sep 2026.
//
// Vera: «la opción de hunt debe quitarse; el botón debe ser un evento rápido;
// si no existen, deben crearse». El botón «Hunt» se quedaba toda la semana en
// el rincón, abría un menú de armas y después servía para lanzar. Ahora son
// dos momentos cortos, y ninguno se queda esperando:
//
//   1 · **la ocasión**: una tarjeta aparece arriba —«¡Un ciervo junto al
//       bosque!»— con las armas que el valle tiene y una barra que se vacía.
//       Si no se elige a tiempo, la presa se va y la semana sigue.
//   2 · **la puntería**: dos aros sobre el valle, uno fijo y otro que se
//       encoge hacia él. Se toca (o se pulsa Espacio) cuando coinciden; lo
//       cerca que estén es la puntería del tiro, que la escena de caza traduce
//       en un proyectil que va a la presa o se desvía. Se repite hasta cobrarla
//       o hasta que huya.
//
// Es interfaz pura: qué presa hay la decide el motor (`huntOpportunity`) y si
// el tiro acierta lo decide la física de la escena; esto sólo mide el reflejo.
import './hunt-event.css';
import { renderUiText } from '@engine/chronicle/render';

export type HuntSpecies = 'partridge' | 'rabbit' | 'deer' | 'boar' | 'bear';
export type HuntWeapon = 'sling' | 'bow' | 'spear';

/** TUNE: lo que dura la ocasión en pantalla, en segundos reales. */
export const HUNT_EVENT_SECONDS = 9;
/**
 * TUNE: la vuelta del aro que se encoge, en segundos, y cuánto se perdona.
 * `window` es la fracción del radio en la que el tiro todavía cuenta: con 0,22
 * y una vuelta de 1,3 s la ventana buena dura unas tres décimas.
 */
export const HUNT_QTE = { cycleSeconds: 1.3, window: 0.22, target: 0.32 } as const;

/**
 * La puntería de un toque: 1 cuando el aro que se encoge está justo sobre el
 * fijo, 0 fuera de la ventana. Pura, para poder probarla sin pantalla.
 * `phase` va de 0 (aro grande) a 1 (aro en el centro).
 */
export function qtePrecision(phase: number): number {
  const radius = 1 - phase;
  const gap = Math.abs(radius - HUNT_QTE.target);
  return gap >= HUNT_QTE.window ? 0 : 1 - gap / HUNT_QTE.window;
}

/**
 * La ocasión. Devuelve con qué cerrarla. `onChoose` recibe el arma; `onExpire`
 * se llama si se acaba el tiempo o se deja ir.
 */
export function showHuntEvent(
  offer: { species: HuntSpecies; weapons: readonly HuntWeapon[] },
  onChoose: (weapon: HuntWeapon) => void,
  onExpire: () => void,
): () => void {
  const card = document.createElement('section');
  card.className = 'hunt-event skin-paper';
  card.setAttribute('role', 'alert');
  const say = document.createElement('p');
  say.className = 'hunt-event-say';
  say.textContent = renderUiText(`hunt.event.say.${offer.species}`);
  const choices = document.createElement('div');
  choices.className = 'hunt-event-choices';
  for (const weapon of offer.weapons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hunt-event-weapon';
    button.textContent = renderUiText(`hunt.weapon.${weapon}`);
    button.addEventListener('click', () => { close(); onChoose(weapon); });
    choices.append(button);
  }
  const ignore = document.createElement('button');
  ignore.type = 'button';
  ignore.className = 'hunt-event-ignore';
  ignore.setAttribute('aria-label', renderUiText('hunt.event.ignore'));
  ignore.textContent = '×';
  ignore.addEventListener('click', () => { close(); onExpire(); });
  const timer = document.createElement('div');
  timer.className = 'hunt-event-timer';
  timer.style.animationDuration = `${HUNT_EVENT_SECONDS}s`;
  card.append(ignore, say, choices, timer);
  document.body.append(card);

  let open = true;
  const expire = window.setTimeout(() => { if (open) { close(); onExpire(); } }, HUNT_EVENT_SECONDS * 1000);
  function close(): void {
    if (!open) return;
    open = false;
    window.clearTimeout(expire);
    card.classList.add('hunt-event--leaving');
    window.setTimeout(() => card.remove(), 200);
  }
  return close;
}

/**
 * La puntería, mientras dura la caza. `strike` recibe la puntería de cada
 * toque (0 a 1) y devuelve si el arma estaba lista; si no, el toque no cuenta
 * y se avisa de que está recargando.
 */
export function startHuntQte(host: HTMLElement, strike: (precision: number) => boolean): () => void {
  const layer = document.createElement('div');
  layer.className = 'hunt-qte';
  layer.innerHTML = '<p class="hunt-qte-hint"></p><div class="hunt-qte-rings" aria-hidden="true">'
    + '<span class="hunt-qte-target"></span><span class="hunt-qte-closing"></span></div>'
    + '<p class="hunt-qte-verdict" aria-live="polite"></p>';
  const closing = layer.querySelector<HTMLElement>('.hunt-qte-closing')!;
  const target = layer.querySelector<HTMLElement>('.hunt-qte-target')!;
  const hint = layer.querySelector<HTMLElement>('.hunt-qte-hint')!;
  const verdict = layer.querySelector<HTMLElement>('.hunt-qte-verdict')!;
  hint.textContent = renderUiText('hunt.qte.hint');
  target.style.width = target.style.height = `${HUNT_QTE.target * 100}%`;
  host.append(layer);

  const started = performance.now();
  const phase = (): number => (((performance.now() - started) / 1000) / HUNT_QTE.cycleSeconds) % 1;
  let raf = 0;
  const frame = (): void => {
    const radius = 1 - phase();
    closing.style.width = closing.style.height = `${radius * 100}%`;
    closing.classList.toggle('hunt-qte-closing--ready', qtePrecision(phase()) > 0);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  let verdictTimer = 0;
  const shout = (key: string, good: boolean): void => {
    verdict.textContent = renderUiText(key);
    verdict.classList.toggle('hunt-qte-verdict--good', good);
    verdict.classList.add('hunt-qte-verdict--on');
    window.clearTimeout(verdictTimer);
    verdictTimer = window.setTimeout(() => verdict.classList.remove('hunt-qte-verdict--on'), 700);
  };
  const tap = (): void => {
    const precision = qtePrecision(phase());
    if (!strike(precision)) { shout('hunt.qte.reload', false); return; }
    if (precision >= 0.66) shout('hunt.qte.perfect', true);
    else if (precision > 0) shout('hunt.qte.good', true);
    else shout(1 - phase() > HUNT_QTE.target ? 'hunt.qte.early' : 'hunt.qte.late', false);
  };
  const onPointer = (event: PointerEvent): void => { event.preventDefault(); event.stopPropagation(); tap(); };
  const onKey = (event: KeyboardEvent): void => {
    if (event.code !== 'Space' && event.code !== 'Enter') return;
    event.preventDefault();
    tap();
  };
  layer.addEventListener('pointerdown', onPointer);
  document.addEventListener('keydown', onKey);
  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(verdictTimer);
    layer.removeEventListener('pointerdown', onPointer);
    document.removeEventListener('keydown', onKey);
    layer.remove();
  };
}
