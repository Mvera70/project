// §11.1.1 · Los cuatro iconos de la tira, dibujados.
//
// Dibujados y no escritos: un glifo de texto —un emoji, una flecha de Unicode—
// sale distinto en cada teléfono y a once píxeles la diferencia entre dos
// fuentes es la diferencia entre entenderlo y no. Son cuatro dibujos de tres
// trazos, y así son los mismos en todas partes.
//
// `currentColor` a propósito: el color lo pone la hoja de estilo, que es la que
// sabe si la cifra está en aviso.

const SVG = (body: string): string =>
  `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"`
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
