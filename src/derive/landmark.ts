// UI-W · El roble del valle: el árbol del escudo del título, con sitio en el mapa.
//
// Lo pidió Vera el 24 sep 2026, al ver el logotipo: «el árbol del título es como
// un icono del juego, debe tener representación física en el juego; puedes
// ponerlo al lado del lago». Así que el emblema no es sólo un dibujo: cada valle
// tiene su roble grande a la orilla de su lago.
//
// **Puro y sin azar.** No cambia el mapa ni el motor: se deriva de dónde está el
// lago, así que el mismo valle da siempre el mismo sitio y ninguna partida
// guardada se mueve. Lo leen el render (el modelo) y la capa de vida (la celda
// cuenta como tronco y nadie la atraviesa).

import { TERRAIN_CODE, type ValleyMap } from '@engine/state';
import { inHeart } from '@engine/world/tiles';

/**
 * La celda del roble: el prado que toca el lago **más cerca del centro del
 * mapa**, que es el lado del lago que mira a la aldea. Si hay empate, la de
 * índice menor.
 *
 * **Y si el valle no tiene lago** —17 de cada 60, medido en las semillas 1 a
 * 60—, a la orilla del río **fuera del corazón**, donde no se construye: el
 * roble es el emblema y todo valle tiene el suyo. `null` sólo si no hubiera ni
 * eso, que no pasa en ningún valle medido.
 *
 * Se descartan los caminos, para que el árbol no brote en mitad de uno.
 */
export function greatOakCell(map: ValleyMap): number | null {
  return nearestShore(map, TERRAIN_CODE.lake, false)
    ?? nearestShore(map, TERRAIN_CODE.water, true);
}

function nearestShore(map: ValleyMap, water: number, outsideHeart: boolean): number | null {
  const cx = map.width / 2;
  const cz = map.height / 2;
  let best: number | null = null;
  let bestGap = Infinity;
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    if (map.terrain[cell] !== TERRAIN_CODE.meadow) continue;
    if ((map.path[cell] ?? 0) > 0) continue;
    const x = cell % map.width;
    const z = Math.floor(cell / map.width);
    if (outsideHeart && inHeart(x, z)) continue;
    const wet = [
      x > 0 ? cell - 1 : -1,
      x < map.width - 1 ? cell + 1 : -1,
      z > 0 ? cell - map.width : -1,
      z < map.height - 1 ? cell + map.width : -1,
    ].some((side) => side >= 0 && map.terrain[side] === water);
    if (!wet) continue;
    const gap = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
    if (gap < bestGap) {
      best = cell;
      bestGap = gap;
    }
  }
  return best;
}
