// §11.1.1 · Los cuatro iconos de la tira, dibujados.
//
// Dibujados y no escritos: un glifo de texto —un emoji, una flecha de Unicode—
// sale distinto en cada teléfono y a once píxeles la diferencia entre dos
// fuentes es la diferencia entre entenderlo y no. Son cuatro dibujos de tres
// trazos, y así son los mismos en todas partes.
//
// `currentColor` a propósito: el color lo pone la hoja de estilo, que es la que
// sabe si la cifra está en aviso.

/**
 * El trazo, y por qué es más grueso de lo que era.
 *
 * 1,9 y no 1,6, y trece píxeles y no doce. *«Los iconos de estadísticas también
 * son muy pobres»*, dijo el dueño del diseño probando la demo, y mirando la
 * captura la mitad del problema no es el dibujo: es el **peso**. A once o doce
 * píxeles un trazo de 1,6 se lee como un alambre, y un alambre parece un
 * borrador de interfaz. La piel de U-01 es tinta sobre pergamino —un grabado,
 * no un plano— y un grabado tiene cuerpo.
 *
 * Es lo más barato que se podía cambiar y lo que más se nota: la geometría de
 * los cuatro dibujos es la misma que ya se había calibrado a este tamaño.
 */
const SVG = (body: string, size = 13): string =>
  `<svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" focusable="false"`
  + ` fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"`
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
   * Dos troncos apilados, vistos de lado, con el corte a la vista: la leña.
   *
   * La tercera versión de este icono, y las dos anteriores están escritas aquí
   * porque las dos fallaban por la misma razón: **una silueta que se parece a
   * otra cosa más común gana siempre**. Primero fueron dos leños cruzados y a
   * este tamaño era una pajarita. Luego tres círculos apilados —troncos vistos
   * por el corte, que es como se apila la leña de verdad— y a doce píxeles
   * eran un **trébol**: tres redondeles tocándose es un símbolo que el ojo ya
   * tiene aprendido, y el ojo tira de lo que sabe.
   *
   * Dos rectángulos tumbados y uno encima, con un círculo en la testa de cada
   * uno, se lee como madera cortada y no se parece a nada más. El rectángulo es
   * lo que salva el dibujo: un tronco tiene largo, y el largo es lo que
   * distingue la leña de una fruta.
   */
  wood: SVG('<rect x="1.6" y="8.4" width="9.6" height="4.2" rx="2.1"/>'
    + '<ellipse cx="11.2" cy="10.5" rx="1.5" ry="2.1"/><path d="M11.2 9.6v1.8"/>'
    + '<rect x="4.2" y="3.4" width="8.4" height="4" rx="2"/>'
    + '<ellipse cx="12.6" cy="5.4" rx="1.4" ry="2"/>'),
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
