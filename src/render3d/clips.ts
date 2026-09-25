// G-05 · What each clip costs in time and ground. design.md D.4, D.6.
//
// The numbers come from `art/catalog.json`, which G-04 filled by measuring the
// exported GLB. They are repeated here because G-05 has no asset manifest yet —
// that is G-06's `assets.ts` — and a renderer that cannot start until the
// manifest exists would block this round on the next one.
//
// A copy that nobody checks is a copy that drifts, so
// `tests/fast/graphics-clock.test.ts` reads the catalogue and asserts these
// match. When G-06 lands the manifest, this table becomes its default and the
// test keeps pointing at the same truth.
//
// **Y desde IA-12 esta tabla es más grande que el catálogo, a propósito.** El
// GLB del aldeano trae cuatro animaciones —`idle`, `walk`, `work_hoe` y
// `carry_walk`, las que G-04 midió— y los ocho clips de acción (`sit`, `talk`,
// `pray`, `hammer`, `chop`, `play`, `drink`, `sort`) los **fabrica**
// `action-clips.ts` doblando huesos sobre el `idle`, sin tocar el GLB. Sus
// segundos viven aquí porque son una decisión de ritmo y no una medida del
// exportado. Lo que la prueba comprueba, entonces, no es que las dos listas
// tengan el mismo tamaño —eso dejó de ser verdad el día de IA-12 y rompió la
// prueba sin que nada se hubiera desviado— sino tres cosas: que lo del catálogo
// esté aquí con los mismos números, que lo que sobra sea exactamente lo que
// `ACTION_CLIPS` fabrica, y que **ningún clip fabricado ande**: un clip clonado
// del `idle` no tiene paso que medir, y darle zancada es el aldeano patinando.

export interface ClipMotion {
  readonly seconds: number;
  readonly loop: boolean;
  /**
   * Ground covered in one cycle, in scene units. One unit is one map cell (D.4).
   *
   * Un aldeano mide 0,65 celdas y su zancada 0,32, porque una celda de este
   * valle son unos tres metros: una casa ocupa dos por dos y una casa mide seis
   * metros de lado. Ver D.6.2.
   *
   * `null` for a clip that stays put. For one that walks, this is what stops the
   * feet sliding: the clip is played at `speed / strideLength` cycles per
   * second, so the ground passes under the foot exactly as fast as the foot
   * pushes it back. Playing at a fixed rate instead is the classic skating
   * villager, and it is visible at any size.
   */
  readonly strideLength: number | null;
}

export type ClipName = 'idle' | 'walk' | 'work_hoe' | 'carry_walk' | 'sit' | 'talk' | 'pray' | 'hammer' | 'chop' | 'mine' | 'sow' | 'spread' | 'douse' | 'play' | 'drink' | 'sort'
  | 'bow_draw' | 'bow_loose' | 'gate_strike' | 'spear_thrust' | 'hit_take' | 'fall' | 'flee';

/**
 * IA-anim · En qué fracción del ciclo pega la herramienta. Lo lee el clip para
 * poner ahí el impacto y el render para soltar las astillas en ese instante.
 */
export const STRIKE_AT: Readonly<Record<'chop' | 'mine' | 'sow' | 'spread' | 'douse', number>> = { chop: 0.52, mine: 0.5, sow: 0.45, spread: 0.55, douse: 0.55 };

/**
 * IA-anim · Dónde cae la cabeza de la herramienta en `STRIKE_AT`, en celdas y
 * en el marco del cuerpo (+Z delante, +X a su izquierda... la de la escena:
 * `x` positivo es el costado derecho del mundo con `facing = 0`).
 *
 * Medido sobre el GLB publicado con el montaje de `world/cast.ts`, y vigilado
 * por `tests/fast/work-gestures.test.ts`: si el gesto cambia, la prueba falla
 * y estos números se vuelven a medir. La vida coloca al trabajador con ellos
 * para que el golpe **toque** el tronco o la roca, y el cuerpo a cuerpo podrá
 * usarlos como alcance del arma cuando estos gestos se reaprovechen en combate.
 */
export const STRIKE_HEAD: Readonly<Record<'chop' | 'mine', { readonly x: number; readonly y: number; readonly z: number }>> = {
  chop: { x: -0.21, y: 0.32, z: 0.45 },
  mine: { x: 0.03, y: 0.07, z: 0.39 },
};

/** Gestos de combate: su reloj procede del hecho, nunca del primer pintado. */
export function combatClip(clip: string): boolean {
  return clip === 'bow_draw' || clip === 'bow_loose' || clip === 'gate_strike'
    || clip === 'spear_thrust' || clip === 'hit_take' || clip === 'fall';
}

export const VILLAGER_CLIPS: Readonly<Record<ClipName, ClipMotion>> = {
  // E1: carrera civil, no gesto de combate. TUNE: ciclo de 0,8 s y zancada
  // grande de 0,44 celdas, gobernada por suelo recorrido como `walk`.
  flee: { seconds: 0.8, loop: true, strideLength: 0.44 },
  spear_thrust: { seconds: 0.9, loop: false, strideLength: null },
  hit_take: { seconds: 0.5, loop: false, strideLength: null },
  bow_draw: { seconds: 1.5, loop: true, strideLength: null },
  bow_loose: { seconds: 0.6, loop: false, strideLength: null },
  // Un golpe por segundo en raiders.ts; la recuperación ocupa el resto.
  gate_strike: { seconds: 0.6, loop: false, strideLength: null },
  fall: { seconds: 1.2, loop: false, strideLength: null },
  sort: { seconds: 3, loop: true, strideLength: null },
  sit: { seconds: 5, loop: true, strideLength: null },
  talk: { seconds: 3.6, loop: true, strideLength: null },
  pray: { seconds: 5, loop: true, strideLength: null },
  hammer: { seconds: 1.6, loop: true, strideLength: null },
  // IA-anim · Un hachazo y un golpe de pico por ciclo, con su impacto en
  // `STRIKE_AT`. TUNE: 1,9 s y 1,7 s, el ritmo de alguien que trabaja todo el
  // día y no de una exhibición; el pico pesa más pero recorre menos.
  chop: { seconds: 1.9, loop: true, strideLength: null },
  mine: { seconds: 1.7, loop: true, strideLength: null },
  // IA-fields · Sembrar a voleo y echar estiércol con horca: un lanzamiento
  // por ciclo, suelta en `STRIKE_AT`. TUNE: el voleo es un gesto corto y
  // repetido; la horca pesa, carga y lanza.
  sow: { seconds: 1.4, loop: true, strideLength: null },
  spread: { seconds: 1.8, loop: true, strideLength: null },
  // E4 · echar un cubo de agua al fuego: el lanzamiento de la horca, más vivo.
  douse: { seconds: 1.5, loop: true, strideLength: null },
  play: { seconds: 2.4, loop: true, strideLength: null },
  drink: { seconds: 3, loop: true, strideLength: null },
  idle: { seconds: 4, loop: true, strideLength: null },
  walk: { seconds: 4 / 3, loop: true, strideLength: 0.317 },
  work_hoe: { seconds: 2, loop: true, strideLength: null },
  carry_walk: { seconds: 4 / 3, loop: true, strideLength: 0.26 },
};

/**
 * Where a clip should be, in its own seconds, for an actor at this instant.
 *
 * A clip that travels is driven by **distance covered**, never by wall time. A
 * clip that stays put is driven by scenic time, offset per actor so that two
 * neighbours standing still do not breathe in unison.
 */
export function clipTime(
  clip: ClipName, distance: number, presentationSeconds: number, offset: number,
  since?: number,
): number {
  const motion = VILLAGER_CLIPS[clip];
  // El instante y el origen pertenecen al mismo reloj. Sin módulo ni desfase
  // individual: soltar ocurre cuando nace la flecha; caer conserva su final.
  const elapsed = Math.max(0, presentationSeconds - (since ?? 0));
  if (!motion.loop) return Math.min(motion.seconds, elapsed);
  if (since !== undefined) return elapsed % motion.seconds;
  if (motion.strideLength === null) {
    return (presentationSeconds + offset * motion.seconds) % motion.seconds;
  }
  const cycles = distance / motion.strideLength;
  return ((cycles % 1) + 1) % 1 * motion.seconds;
}
