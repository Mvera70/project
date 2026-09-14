// §11.1.1 · Los cuatro iconos de la tira, dibujados.
//
// Dibujados y no escritos: un glifo de texto —un emoji, una flecha de Unicode—
// sale distinto en cada teléfono y a once píxeles la diferencia entre dos
// fuentes es la diferencia entre entenderlo y no. Son cuatro dibujos de tres
// trazos, y así son los mismos en todas partes.
//
// `currentColor` a propósito: el color lo pone la hoja de estilo, que es la que
// sabe si la cifra está en aviso.

const SVG = (body: string, size = 12): string =>
  `<svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" focusable="false"`
  + ` fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"`
  + ` stroke-linejoin="round">${body}</svg>`;

export const VITAL_ICONS = {
  /** Dos figuras: la gente. */
  people: SVG(
    '<circle cx="6" cy="5" r="2.2"/><path d="M2.5 13.5c0-2.2 1.6-3.6 3.5-3.6s3.5 1.4 3.5 3.6"/>'
    + '<circle cx="12" cy="6" r="1.7"/><path d="M10.6 13.5c0-1.9 1-3 2.4-3s2.5 1.1 2.5 3"/>',
  ),
  /**
   * Un saco atado: la comida, que en este valle es grano guardado.
   *
   * Antes era una gavilla de espigas y a once pixeles se leia como una copa.
   * Un saco es una silueta, y una silueta aguanta el tamano.
   */
  food: SVG('<path d="M4.2 13.8c-.5-3.2.6-5.6 2.3-6.8h3c1.7 1.2 2.8 3.6 2.3 6.8z"/>'
    + '<path d="M5.9 7h4.2"/><path d="M6.4 7c-.4-1.5-.1-2.6.8-3.4-.2 1.3.1 2.2.8 2.6"/>'
    + '<path d="M9.6 7c.5-1.3.3-2.3-.5-3"/>'),
  /**
   * Tres troncos apilados, vistos por el corte: la lena.
   *
   * Antes eran dos lenos cruzados y a este tamano era una pajarita.
   */
  wood: SVG('<circle cx="5.4" cy="10.4" r="2.9"/><circle cx="10.8" cy="10.4" r="2.9"/>'
    + '<circle cx="8.1" cy="5.4" r="2.9"/>'),
  /** Una cara: el ánimo. */
  morale: SVG('<circle cx="8" cy="8" r="6.2"/><path d="M5.6 9.6c.7 1.1 1.6 1.6 2.4 1.6s1.7-.5 2.4-1.6"/>'
    + '<path d="M6 6.2v.6"/><path d="M10 6.2v.6"/>'),
} as const;

// U-05 · Los tres destinos de la barra de abajo. Mismo trato de tres trazos
// que `VITAL_ICONS`, a 18 px porque aquí no comparten sitio con una cifra: son
// el dibujo entero del botón.
export const NAV_ICONS = {
  /** El valle: dos laderas y el sol, el propio HUD de §11.1. */
  valley: SVG(
    '<path d="M2 12.6 6.2 5.6 9 9.4 11.6 5 14 12.6"/><circle cx="6.6" cy="3.4" r="1.15"/>',
    18,
  ),
  /** Un libro abierto: la crónica. */
  chronicle: SVG(
    '<path d="M8 4.6c-1.4-1.1-3.2-1.4-4.9-1v9c1.7-.4 3.5-.1 4.9 1 1.4-1.1 3.2-1.4 4.9-1v-9c-1.7-.4-3.5-.1-4.9 1z"/>'
    + '<path d="M8 4.6v9"/>',
    18,
  ),
  /** Dos figuras, como `VITAL_ICONS.people` pero de cuerpo entero: la gente. */
  people: SVG(
    '<circle cx="5.6" cy="4.6" r="2.1"/><path d="M2.2 13.4c0-2.1 1.5-3.4 3.4-3.4s3.4 1.3 3.4 3.4"/>'
    + '<circle cx="11.3" cy="5.6" r="1.65"/><path d="M9.8 13.4c0-1.85 1-2.9 2.3-2.9s2.4 1.05 2.4 2.9"/>',
    18,
  ),
} as const;
