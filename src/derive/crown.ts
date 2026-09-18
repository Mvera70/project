// K-5 · La corona, para quien la pinta. `docs/plan-rey.md` §1.
//
// **Aquí vive la palabra «king»**, y el motor no la conoce: el asiento se llama
// `leader` en el estado y se seguirá llamando así para siempre, porque los
// identificadores de contenido se guardan en las partidas (§2.2) y siete
// plantillas de encrucijada reparten ese papel. Lo que cambia con la corona es
// **cómo se lee**, y eso es cosa de esta capa.
//
// Puro y sin render, como todo `derive/`: traduce el estado, no lo toca.

import { crownCandidates, kingOf, styleOf } from '@engine/people/crown';
import type { CrownStyle, GameState, Villager } from '@engine/state';

/**
 * La clave del oficio de alguien, o nada si no tiene.
 *
 * `role.king` sólo para quien ocupa el asiento **en un valle coronado**: antes
 * de la coronación el mismo hombre es `role.leader`, que es lo que es —un jefe
 * al que nadie ha dado nada—.
 */
export function roleKeyFor(state: GameState, v: Villager): string | null {
  if (v.role === null) return null;
  if (v.role === 'leader' && state.crown !== null && kingOf(state)?.id === v.id) {
    return 'role.king';
  }
  return `role.${v.role}`;
}

/** Hacia dónde tiraría la aldea con ese candidato, por su oficio de hoy. */
export function styleKeyFor(v: Villager): string {
  return `crown.style.${styleOf(v.role)}`;
}

/** Lo que la fila del carro tiene que saber para pintarse. */
export interface CrownRow {
  /** El estilo del rey que ya reina, o nada si no reina nadie. */
  readonly style: CrownStyle | null;
  /** Su nombre, para decir desde cuándo lleva la corona. */
  readonly kingName: string | null;
  /** Desde qué año la lleva. */
  readonly sinceYear: number | null;
  /** A quién se le puede dar, si no hay rey. Vacío si ya hay. */
  readonly candidates: readonly {
    readonly id: number;
    readonly name: string;
    readonly age: number;
    readonly roleKey: string | null;
    readonly styleKey: string;
    readonly traitKeys: readonly string[];
  }[];
}

/**
 * La fila de la corona, derivada del estado.
 *
 * Con rey, la fila **no ofrece nada**: la corona no se quita ni se cambia de
 * cabeza, y cuando el rey muera la pasará la sucesión de A.15 (§6.6). Sin rey,
 * los candidatos con lo que se necesita para elegir: quién es, cuántos inviernos
 * lleva, a qué se dedica, qué carácter tiene y **hacia dónde tiraría el valle**.
 */
export function crownRow(state: GameState, weeksPerYear: number): CrownRow {
  const king = kingOf(state);
  if (state.crown !== null) {
    return {
      style: styleOf(state.crown.trade),
      kingName: king?.name ?? null,
      sinceYear: Math.floor(state.crown.since / weeksPerYear) + 1,
      candidates: [],
    };
  }
  return {
    style: null, kingName: null, sinceYear: null,
    candidates: crownCandidates(state).map((v) => ({
      id: v.id,
      name: v.name,
      age: Math.floor((state.tick - v.bornTick) / weeksPerYear),
      roleKey: v.role === null ? null : `role.${v.role}`,
      styleKey: styleKeyFor(v),
      traitKeys: v.traits.map((trait) => `trait.${trait}`),
    })),
  };
}
