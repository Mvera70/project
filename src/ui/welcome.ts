// M-23 · The welcome report. design.md §9.2, §13.2, §17 M-23.
//
// What closes the lethargy: the headline, up to four things that mattered,
// and the numbers — never the whole chronicle, and never a screen the player
// has to reconstruct by hand to know what happened while they were gone.

import { TIME } from '@engine/balance';
import type { Digest } from '@engine/chronicle/digest';
import { renderEntry, renderUiText } from '@engine/chronicle/render';
import type { ChronicleEntry, GameState } from '@engine/state';
import type { App } from './app';
import { recogniseGesture, type Point } from './gestures';

const STYLE_ID = 'valley-welcome-style';
const STYLE = `
/* VZ-04a · **El parte se viste como lo que su propio comentario dice que es:
   una página de la crónica puesta al día.**

   Hasta esta ronda era un velo de noche a pantalla entera con las tipografías
   de U-01 —la noche, la voz, la llana— y ni una clase de la piel. Lo dijo
   el dueño del diseño mirando la crónica: «los fondos que hay detrás de los
   textos, usa siempre el mismo; el de la crónica es el bueno». Esta pantalla y
   el epitafio eran las dos que seguían sin vestir.

   El reparto es el del documento sellado de la encrucijada (UI-V5c), y por el
   mismo motivo: el valle **atenuado y no tapado** (§11.2), la página subiendo
   desde abajo con una franja de fusión **hermana y no un fondo suyo** —el
   degradado y el color opaco en el mismo elemento se pisan y dejan una banda
   de pergamino vacía—, y el contenido en la columna de 390 px de la directriz
   (\`piel-del-valle\` §1). */
.welcome-scrim { position: fixed; inset: 0; z-index: 11; display: flex;
  flex-direction: column; justify-content: flex-end;
  background: rgba(27, 22, 19, .18);
  color: var(--skin-ink); font-family: var(--skin-font-read); font-size: 15px; }
/* VZ-2 · el hueco por el que se ve el valle. Era una franja de fusión con
   degradado; ahora la transición la hace el canto rasgado de la hoja
   (\`.skin-torn-top\`, \`skin.css\`), el mismo de las tres secciones, y esto
   sólo reserva el sitio. */
.welcome-fade { flex: 0 0 64px; }
.welcome { box-sizing: border-box; width: 100%; max-height: 100%; overflow: auto;
  padding: 0 20px max(24px, env(safe-area-inset-bottom));
  background-color: var(--skin-page);
  background-image: var(--skin-parchment-texture);
  background-repeat: repeat; background-size: 256px 256px;
  background-blend-mode: multiply; }
/* La directriz: la superficie cruza la pantalla, el contenido va en columna. */
.welcome > * { box-sizing: border-box; width: 100%; max-width: 390px; margin-inline: auto; }
.welcome h1 { margin: 0 0 16px; padding-top: 4px; text-wrap: balance;
  color: var(--skin-ink); font: 600 20px/1.2 var(--skin-font-voice);
  letter-spacing: var(--skin-track-inscription); text-transform: uppercase; }
.welcome p { margin: 10px auto; color: var(--skin-ink-soft); text-wrap: pretty;
  font: 17px/1.5 var(--skin-font-read); }
.welcome p.welcome-headline { color: var(--skin-ink); }
/* Las cifras no son crónica: van en la letra de las cifras y tras un filete,
   igual que en la ficha de la persona. */
.welcome p.welcome-count { margin-top: 18px; padding-top: 12px;
  border-top: 1px solid var(--skin-rule-gold); color: var(--skin-ink-faded);
  font: 13px/1.45 var(--skin-font-voice); font-variant-numeric: tabular-nums; }
.welcome p.welcome-count ~ p.welcome-count { margin-top: 2px; padding-top: 0; border-top: 0; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

/** A synthetic entry for a bank key that carries no chronicle event of its own. */
function synthetic(tick: number, templateKey: string, params: Record<string, string | number>): ChronicleEntry {
  // `kind` is never read by `renderEntry` — 'season' is the closest existing
  // kind to "background narration, not a specific happening" (§9.2).
  return { tick, kind: 'season', templateKey, params, weight: 1 };
}

/**
 * §9.2, literally: the most recent weight-3 headline, up to four weight-2
 * entries, and a numeric summary — nothing else. Pure text, so it can be
 * checked without a screen and reused by one.
 */
export function welcomeLines(state: GameState, digest: Digest): string[] {
  const lines: string[] = [];
  if (digest.headline !== null) lines.push(renderEntry(digest.headline, state.rng, 0));
  digest.entries.forEach((e, i) => lines.push(renderEntry(e, state.rng, i + 1)));

  const s = digest.summary;
  // En años cuando la ausencia se cuenta en años. El letargo llega a cuatro
  // horas de reloj de pared, que son novecientas sesenta semanas (§13.4), y
  // «960 weeks passed» es un número que nadie puede sentir: el jugador que
  // vuelve quiere saber cuánto ha perdido, no hacer la división.
  const years = Math.floor(s.weeks / TIME.WEEKS_PER_YEAR);
  lines.push(years >= 2
    ? renderEntry(synthetic(state.tick, 'welcome.time.years', { years }), state.rng, 900)
    : renderEntry(synthetic(state.tick, 'welcome.time', { weeks: s.weeks }), state.rng, 900));
  lines.push(renderEntry(synthetic(state.tick, 'welcome.people', {
    people: s.people, born: s.born, died: s.died, arrived: s.arrived, left: s.left,
  }), state.rng, 901));
  lines.push(renderEntry(synthetic(state.tick, 'welcome.buildings', {
    built: s.built, lost: s.lost,
  }), state.rng, 902));
  return lines;
}

let shown: HTMLElement | null = null;

/**
 * Opens the welcome report full screen. Unlike the crossroad (§17 M-22) this
 * asks nothing: any tap or a swipe down closes it, because there is no
 * decision here to protect from a stray touch.
 */
export function openWelcome(app: App, digest: Digest): void {
  if (shown !== null) return;
  ensureStyle();
  const state = app.state();

  const scrim = document.createElement('div');
  scrim.className = 'welcome-scrim';
  // Hermana de la página y no un fondo suyo: ver el comentario de la hoja.
  const fade = document.createElement('div');
  fade.className = 'welcome-fade';
  fade.setAttribute('aria-hidden', 'true');
  const card = document.createElement('section');
  card.className = 'welcome skin-paper skin-paper--page skin-torn-top';
  const h1 = document.createElement('h1');
  h1.textContent = renderUiText('welcome.title');

  const lines = welcomeLines(state, digest);
  const headlineCount = digest.headline !== null ? 1 : 0;
  const paragraphs = lines.map((line, i) => {
    const p = document.createElement('p');
    p.textContent = line;
    if (i === 0 && headlineCount === 1) p.className = 'welcome-headline';
    if (i >= lines.length - 3) p.className = 'welcome-count';
    return p;
  });

  card.append(h1, ...paragraphs);
  scrim.append(fade, card);

  // Como las otras tres superposiciones: la raíz lleva la marca mientras el
  // parte está abierto, y con ella la bandeja se aparta (`shell.css`).
  document.documentElement.classList.add('welcome-open');
  const close = (): void => {
    scrim.remove();
    document.documentElement.classList.remove('welcome-open');
    shown = null;
  };
  const trace: Point[] = [];
  scrim.addEventListener('pointerdown', (event) => {
    trace.length = 0;
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
  });
  scrim.addEventListener('pointerup', (event) => {
    trace.push({ x: event.clientX, y: event.clientY, atMs: event.timeStamp });
    const gesture = recogniseGesture({ points: trace });
    if (gesture === 'tap' || gesture === 'swipe_down') close();
  });

  document.body.append(scrim);
  shown = scrim;
}
