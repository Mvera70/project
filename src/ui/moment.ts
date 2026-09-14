// U-02 · Cuando la aldea pasa un hito. design.md §11.6, §11.4, §11.1.
//
// El aviso de `notice.ts` cuenta lo que acaba de pasar, y pasa mucho. Esto es
// para lo otro: **lo que pasa una vez**. La primera casa de piedra. La muralla
// cerrada. Los cien años del valle. Cosas que en una partida de sesenta años
// ocurren un puñado de veces, y que si se cuentan con la misma banda gris de
// siempre no se distinguen de que a alguien se le haya quemado un cobertizo.
//
// **Lo que esto no es: una fiesta.** El juego tiene una voz —la de la crónica,
// sobria, que cuenta muertes y cosechas con las mismas palabras— y un confeti
// de colores la rompería. Lo que sale es lo que saldría en un libro: una cartela
// de pergamino con su filete, la línea del banco de plantillas, y unas motas de
// latón que suben una vez y se apagan. Se lee como que algo ha entrado en la
// crónica, que es exactamente lo que ha pasado.
//
// **Y no anima sobre el reloj del juego** (§11.4). La cartela está o no está:
// tiene estado definido en cada instante y un salto del reloj de la partida no
// la pilla a medias, igual que el aviso de §11.6. Las motas van en el reloj de
// pared porque son decorado que se retira solo, y quien haya pedido no ver
// movimiento no las ve.

import { TIME } from '@engine/balance';

const STYLE_ID = 'valley-moment-style';
const STYLE = `
.valley-moment { position: absolute; z-index: 5; left: 50%; transform: translateX(-50%);
  bottom: calc(200px + env(safe-area-inset-bottom));
  box-sizing: border-box; width: min(84%, 320px); padding: 14px 18px 15px;
  background: var(--parchment, #f2e9d8); color: var(--ink, #221d18);
  border: 1px solid rgba(125,92,46,.55); border-radius: 3px;
  box-shadow: 0 6px 20px rgba(20,16,13,.38); text-align: center; }
.valley-moment[hidden] { display: none !important; }
/* El filete de arriba y el de abajo, como el encabezamiento de un capítulo. */
.valley-moment::before, .valley-moment::after { content: ''; display: block;
  height: 1px; margin: 0 auto; background: var(--gild, #7d5c2e); opacity: .5; }
.valley-moment::before { width: 46px; margin-bottom: 10px; }
.valley-moment::after { width: 26px; margin-top: 10px; }
.valley-moment-what { display: block; margin-bottom: 5px;
  color: var(--gild, #7d5c2e); font: 600 10px/1 var(--plain, ui-sans-serif,-apple-system,sans-serif);
  letter-spacing: .22em; text-transform: uppercase; }
.valley-moment-line { display: block; text-wrap: pretty;
  font: 17px/1.34 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif); }
/* Un hito de los grandes se distingue de uno corriente por el peso del filete,
   no por otro color: la paleta del juego no crece porque algo sea importante. */
.valley-moment.great { border-color: rgba(125,92,46,.9); }
.valley-moment.great::before { width: 72px; height: 2px; opacity: .75; }

/* Las motas. Puro decorado: nacen, suben y se van, y no vuelven. */
.valley-motes { position: absolute; inset: -18px -10px auto; height: 0; pointer-events: none; }
.valley-mote { position: absolute; top: 0; width: 3px; height: 3px; border-radius: 50%;
  background: var(--gild, #7d5c2e); opacity: 0;
  animation: valley-mote-rise 1500ms ease-out forwards; }
@keyframes valley-mote-rise {
  0%   { opacity: 0; transform: translateY(14px) scale(.6); }
  22%  { opacity: .85; }
  100% { opacity: 0; transform: translateY(-26px) scale(1); }
}
/* §11.7 · quien ha pedido no ver movimiento ve la cartela, y nada más. */
@media (prefers-reduced-motion: reduce) {
  .valley-motes { display: none; }
}
/* §11.2 · la encrucijada y el epitafio ocupan la pantalla entera. */
html.crossroad-open .valley-moment, html.epitaph-open .valley-moment { display: none !important; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

export interface Moment {
  /**
   * Enseña un hito. `what` es la etiqueta corta de arriba y `line` la frase,
   * las dos ya compuestas por quien llama: **aquí no se escribe texto** (ver
   * `CLAUDE.md`), sólo se presenta el que viene del banco de plantillas.
   *
   * `great` distingue el hito del siglo del hito corriente.
   */
  show(what: string, line: string, great: boolean): void;
  /** Retirarla ya: la encrucijada y el epitafio mandan sobre esto. */
  clear(): void;
}

/**
 * Cuántas motas salen, y por dónde.
 *
 * No es azar del juego: es decorado del navegador, y por eso puede usar
 * `Math.random` sin romper §4.3 —no toca el estado, no consume ningún flujo, y
 * dos partidas con la misma semilla siguen siendo la misma partida aunque las
 * motas caigan distintas. Es justo la frontera que §4.3 dibuja.
 */
const MOTES = 14;

export function mountMoments(root: HTMLElement): Moment {
  ensureStyle();
  const card = document.createElement('aside');
  card.className = 'valley-moment';
  card.hidden = true;
  card.setAttribute('aria-live', 'polite');

  const motes = document.createElement('div');
  motes.className = 'valley-motes';
  const what = document.createElement('span');
  what.className = 'valley-moment-what';
  const line = document.createElement('span');
  line.className = 'valley-moment-line';
  card.append(motes, what, line);
  root.append(card);

  let timer = 0;
  const clear = (): void => {
    if (timer !== 0) { clearTimeout(timer); timer = 0; }
    card.hidden = true;
    motes.replaceChildren();
  };

  return {
    clear,
    show(label: string, sentence: string, great: boolean): void {
      what.textContent = label;
      line.textContent = sentence;
      card.classList.toggle('great', great);

      const flecks: HTMLElement[] = [];
      for (let n = 0; n < MOTES; n += 1) {
        const mote = document.createElement('i');
        mote.className = 'valley-mote';
        mote.style.left = `${(n + Math.random()) * (100 / MOTES)}%`;
        mote.style.animationDelay = `${Math.round(Math.random() * 420)}ms`;
        flecks.push(mote);
      }
      motes.replaceChildren(...flecks);

      card.hidden = false;
      if (timer !== 0) clearTimeout(timer);
      timer = window.setTimeout(clear, TIME.MOMENT_MS);
    },
  };
}
