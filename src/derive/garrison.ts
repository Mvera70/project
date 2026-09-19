// C2 · La guarnición: quién ocupa el cerco cuando bajan. design.md §1b, fase 4.
//
// **Es la mitad que faltaba del «tower defense literal».** §1b lo dice con las
// palabras del dueño del diseño —«las torres son aldeanos en la muralla
// disparando»— y con la regla que manda sobre ella: **nada se coloca con el
// dedo**. C1 puso lo que se da (lanzas, arcos, atalaya); esto dice **quién sube
// y a qué puesto**, y lo dice como una lectura del estado y no como una orden.
//
// **Vive en `derive/` y no en el motor ni en la vida**, y las tres razones son
// la misma: no hay nada que guardar. Los puestos son los edificios que ya están
// (el portón, la atalaya, la muralla), las manos salen de lo que la aldea tiene
// y de lo que se le dio, y la alerta sale de `state.threat`, que B1 ya escribió.
// Un campo nuevo en el esquema para esto sería un número más que migrar y una
// segunda idea de dónde está la muralla.
//
// **Lo que esto no decide: quién en concreto.** Devuelve cuántas manos y los
// puestos por orden de importancia; el reparto de la jornada (`life/day.ts`)
// elige a las personas por cercanía, igual que reparte los oficios. Así la
// aldea decide, que es el patrón de M-2 llevado a la defensa.
//
// **Y tampoco decide cuántas manos** desde B3 (18 sep 2026): eso es una regla
// del juego con sus constantes en §12 —el motor la necesita para saber si una
// partida armada se lleva el valle por delante— y vive en
// `engine/world/garrison.ts`. Aquí se lee. Tener la cuenta en dos sitios era
// tener dos ideas de cuánta defensa tiene una aldea.

import { THREAT } from '@engine/balance';
import { alertOf, defenders } from '@engine/world/garrison';
import type { Building, GameState } from '@engine/state';

/** Con qué se ocupa un puesto. */
export type Arm = 'bow' | 'spear';

/** Un sitio del cerco que se ocupa, en celdas del motor. */
export interface Post {
  readonly x: number;
  readonly y: number;
  /**
   * Con qué se está ahí.
   *
   * **El portón se sujeta con lanzas y desde la muralla y la torre se dispara**,
   * que es la regla más corta que dice lo mismo que la escena: a la distancia de
   * un portón nadie tensa un arco, y una atalaya no sirve para dar estocadas.
   * Sin arcos dados (`bows`, C1) no hay arqueros en ninguna parte.
   */
  readonly arm: Arm;
  /** De qué sale el puesto. Vale para pintarlo y para saber qué se rompe. */
  readonly on: 'gate' | 'tower' | 'wall';
}

export interface Garrison {
  /** Si hoy hay gente en el cerco. */
  readonly manned: boolean;
  /** Por qué: se les espera, o ya están aquí. Nada si la aldea está en paz. */
  readonly why: 'coming' | 'arrived' | null;
  /** Cuántas manos sube la aldea. Nunca más que puestos ni que el tercio. */
  readonly hands: number;
  /** Los puestos que se ocupan hoy, los primeros los que más importan. */
  readonly posts: readonly Post[];
}

const NOBODY: Garrison = { manned: false, why: null, hands: 0, posts: [] };

/**
 * Los puestos del cerco, por orden de lo que importan.
 *
 * El orden **es** la decisión táctica de la aldea, y es el más simple que dice
 * algo verdadero: primero las puertas —por donde se entra—, luego las atalayas
 * —de donde se ve y se dispara lejos—, y luego la muralla junto a la puerta, que
 * es donde cae un asalto. Una muralla de setenta estacas no se ocupa entera: con
 * cinco manos, ocupar los cinco sitios que rodean la puerta es lo que un pueblo
 * hace, y repartirlos por todo el anillo es lo que no hace nadie.
 */
export function postsOf(state: GameState): Post[] {
  const live = state.buildings.filter((b) => b.lostTick === null);
  const bows = (state.traits as readonly string[]).includes('bows');
  const gates = live.filter((b) => b.kind === 'gate').sort((a, b) => a.id - b.id);
  // A3 · el bastión es una atalaya metida en la línea de muralla: mismo puesto
  // elevado, mismo disparo, sólo que sin las cuatro celdas propias.
  const towers = live.filter((b) => b.kind === 'watchtower' || b.kind === 'bastion')
    .sort((a, b) => a.id - b.id);
  const walls = live.filter((b) => b.kind === 'palisade' || b.kind === 'wall');

  const posts: Post[] = [
    ...gates.map((b): Post => ({ x: b.x, y: b.y, arm: 'spear', on: 'gate' })),
    ...towers.map((b): Post => ({
      x: b.x, y: b.y, arm: bows ? 'bow' : 'spear', on: 'tower',
    })),
  ];

  // La muralla, la más cercana a una puerta primero. Sin puerta —un cerco
  // empezado— se ordena por identificador, que es el orden en que se levantó:
  // no hay un lado por el que se entre todavía.
  const near = (wall: Building): number => gates.length === 0 ? wall.id
    : Math.min(...gates.map((g) => Math.hypot(g.x - wall.x, g.y - wall.y)));
  for (const wall of [...walls].sort((a, b) => near(a) - near(b) || a.id - b.id)) {
    posts.push({ x: wall.x, y: wall.y, arm: bows ? 'bow' : 'spear', on: 'wall' });
  }
  return posts;
}

/**
 * La guarnición de hoy. Pura: lee el estado, no consume azar y no escribe nada.
 */
export function garrisonOf(state: GameState): Garrison {
  const why = alertOf(state);
  if (why === null) return NOBODY;
  const hands = defenders(state);
  if (hands === 0) return NOBODY;
  const posts = postsOf(state).slice(0, hands);
  if (posts.length === 0) return NOBODY;
  return { manned: true, why, hands: posts.length, posts };
}

/**
 * Cuántas semanas de aviso le quedan a la aldea, o nada si no hay amenaza.
 *
 * Aquí y no en la interfaz porque es la misma lectura que la de arriba, y F2 —el
 * HUD del asedio— va a querer exactamente esto. `THREAT.WARNING_WEEKS` es lo que
 * el aviso de B2 da; esto dice lo que **queda**.
 */
export function weeksAway(state: GameState): number | null {
  const coming = state.threat.comingTick;
  if (coming === null) return null;
  const away = coming - state.tick;
  return away < 0 || away > THREAT.WATCH_WARNING_WEEKS ? null : away;
}
