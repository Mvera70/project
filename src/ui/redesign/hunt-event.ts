// La caza, como evento aleatorio. 27 sep 2026.
//
// Vera, dos veces el mismo día. Primero: «la opción de hunt debe quitarse; el
// botón debe ser un evento rápido». Después, tras ver los aros de puntería: «no
// me gusta el sistema de eventos con minijuegos; sólo quiero que aparezca la
// posibilidad de cazar y sea aleatorio, que tú simplemente aceptes ir a la
// caza; todo lo que pase después debe ser random: o lo cazas, o se va
// malherido». Así que queda sólo **la ocasión**: una tarjeta con «Ir de caza»
// y una barra que se vacía. Si no se acepta a tiempo, la presa se va. Aceptada,
// el arma y cada tiro los decide la suerte (`life/hunt-encounter.ts`, `LUCK`).
import './hunt-event.css';
import { renderUiText } from '@engine/chronicle/render';

export type HuntSpecies = 'partridge' | 'rabbit' | 'deer' | 'boar' | 'bear';

/** TUNE: lo que dura la ocasión en pantalla, en segundos reales. */
export const HUNT_EVENT_SECONDS = 9;

/**
 * La ocasión. Devuelve con qué cerrarla. `onGo` se llama si se acepta;
 * `onExpire`, si se acaba el tiempo o se deja ir.
 */
export function showHuntEvent(
  offer: { species: HuntSpecies },
  onGo: () => void,
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
  const go = document.createElement('button');
  go.type = 'button';
  go.className = 'hunt-event-go';
  go.textContent = renderUiText('hunt.event.go');
  go.addEventListener('click', () => { close(); onGo(); });
  choices.append(go);
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
