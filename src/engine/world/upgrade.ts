// M-14 · The stone upgrades. design.md §7.2, §7.3 point 9.

import { BUILDINGS } from '../balance';
import type { Building, BuildingId, BuildingKind, GameState } from '../state';
import { count } from '../subsistence/building-counts';
import { canPlace } from './placement';

export interface Upgrade {
  kind: 'stone_house' | 'wall' | 'church' | 'bastion';
  buildingId: BuildingId;
}

function flagActive(state: GameState, flag: string): boolean {
  const until = state.flags[flag];
  return until !== undefined && (until === 0 || until > state.tick);
}

/**
 * Where the replacement stands. Same corner when it is the same size.
 *
 * A `church` is 3×3 over a 2×2 `chapel`, so it has to grow by one cell in each
 * axis, and a chapel placed snugly beside the houses has neighbours in the way.
 * Any of the four anchors that still contains the chapel is a legitimate
 * "upgrade in place", so all four are tried in row-major order and the first
 * that fits wins — otherwise the church would be unreachable in almost every
 * village, and §7.3 point 9 would end at the walls.
 */
export function upgradeSpot(
  state: GameState,
  kind: BuildingKind,
  source: Building,
): { x: number; y: number } | null {
  const spec = BUILDINGS[kind];
  for (let y = source.y + source.h - spec.h; y <= source.y; y += 1) {
    for (let x = source.x + source.w - spec.w; x <= source.x; x += 1) {
      if (canPlace(state, kind, x, y, source.id)) return { x, y };
    }
  }
  return null;
}

/**
 * A4 · **El cerco cerrado abre la muralla de piedra.** §1b, fase 3.
 *
 * Hasta A4 la piedra sólo se abría por la encrucijada de la primera piedra
 * (A.16, `catalog/succession.ts`), y esa encrucijada **obliga a elegir**: la
 * muralla o las casas, una de las dos y para siempre. Medido en doce semillas a
 * ochenta años: se desbloquea en diez, y **las diez eligen las casas** —dan doce
 * de ánimo contra seis y sin bandera mala— así que **cero valles llegaban a
 * tener un solo muro de piedra**. La `wall` de §7.2 era contenido muerto: tenía
 * tabla, mejora, dibujo de crónica y ni un solo uso.
 *
 * Eso se escribió cuando la muralla era un adorno. Desde §1b es **la fase 3 de
 * la meta** y lo que decide si el valle cae, así que dejarla detrás de un cara o
 * cruz contra un +12 de ánimo hacía inalcanzable el objetivo del proyecto por la
 * vía de tomar la decisión razonable.
 *
 * Ahora hay dos caminos y no uno: la encrucijada sigue abriéndola **antes**
 * —eso es lo que se compra con la bandera de las casas frías— y **un cerco
 * cerrado la abre por sí solo**, que es lo que haría un pueblo que ya tiene su
 * anillo y le sobra piedra. La marca es la de A1 (`wall_closed`, permanente), o
 * sea que no hay campo nuevo ni migración.
 */
function stoneWallOpen(state: GameState): boolean {
  return flagActive(state, 'wall_unlocked') || state.flags['wall_closed'] !== undefined;
}

/**
 * A3 · **El bastión sólo se pide con el anillo ya cerrado.**
 *
 * Antes de cerrarse, la muralla todavía quiere piezas nuevas en su línea
 * (`ringToBuild`), y una pieza que se sube a bastión deja de contar como hueco
 * libre del anillo sin dejar de estar en su sitio — es una pieza de más, no una
 * pieza de menos, así que no rompe el cierre. Pero pedirla **antes** competiría
 * por la misma piedra y los mismos puntos de obra que el cerco todavía necesita
 * para completarse, que es justo lo que C3 midió que le pasaba a la atalaya
 * suelta (setenta horas de retraso en la villa cerrada) y aquí sería peor: el
 * bastión ni siquiera avisa antes de tener anillo, sólo lo refuerza.
 *
 * `withinCap` no sirve para el tope: `familyOf('bastion')` colapsa en `'wall'`
 * por el propio `upgradeOf`, y la familia `wall` no tiene tope. El tope de
 * verdad se cuenta aquí, contra `BUILDINGS.bastion.cap`.
 *
 * Se lee la bandera `wall_closed` y no `ringClosed(state)` en directo: A1 ya
 * paga esa lectura —que recorre las rejillas de ocupación— una sola vez, la
 * semana que el cerco se cierra, y la deja marcada para siempre. Volver a
 * recorrerlas aquí en cada semana ociosa sería pagar otra vez el mismo coste
 * que esa bandera existe para evitar (sim.ts, el comentario de A1).
 */
function bastionOpen(state: GameState): boolean {
  return state.flags['wall_closed'] !== undefined && count(state, 'bastion') < BUILDINGS.bastion.cap;
}

/** The order is normative: houses, palisades, chapel, bastion. Source ids break ties. */
export function nextUpgrade(state: GameState): Upgrade | null {
  for (const kind of ['stone_house', 'wall', 'church', 'bastion'] as const) {
    if (kind === 'stone_house' && !flagActive(state, 'stone_house_unlocked')) continue;
    if (kind === 'wall' && !stoneWallOpen(state)) continue;
    if (kind === 'bastion' && !bastionOpen(state)) continue;
    for (const source of [...state.buildings].sort((a, b) => a.id - b.id)) {
      if (source.lostTick !== null || source.kind !== BUILDINGS[kind].upgradeOf) continue;
      if (state.works.some((work) => work.upgradeOf === source.id)) continue;
      if (upgradeSpot(state, kind, source) !== null) return { kind, buildingId: source.id };
    }
  }
  return null;
}
