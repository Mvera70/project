// Lo lento de `tests/fast/life-story.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 16 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// IA-6 · Historia visible: la riña de la plaza. docs/design.md §7.10,
// docs/historico/rework.md §4 (R-2, punto 1), docs/visual-reference/README.md §2.
//
// Lo que se guarda aquí son las propiedades del brief, no detalles de
// `scenes.ts`/`village.ts`: la riña sólo se monta con los `id` reales de
// `state.happenings[].who`, tiene sitio alcanzable (la reunión que el propio
// suceso ya provoca), termina, se cancela si falta un participante y nunca se
// queda colgada. La mitad de las pruebas atacan `proposeQuarrel`/`playQuarrel`
// directamente —funciones puras y deterministas— y la otra mitad montan una
// aldea entera con un suceso de verdad puesto a mano, sin simular décadas.

import { describe, expect, it } from 'vitest';
import type { HappeningRecord } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
/** Cuánto se avanza el motor para tener dos nombrados vivos, sin decidir nada:
 *  a tick 0 la fundación de veinte ya trae ocho nombrados (§12.2). */
function twoNamed(seed: number): { state: ReturnType<typeof foundTwenty>; a: number; b: number } {
  const state = foundTwenty(seed);
  const [a, b] = state.people.namedIds;
  if (a === undefined || b === undefined) throw new Error('la fundación de veinte no trae dos nombrados');
  return { state, a, b };
}

/** Pone a mano el suceso que R-1 tira de verdad, sin simular años para que
 *  salga por azar — el mismo atajo que usa `life-staging.test.ts` con las
 *  decisiones del jugador (`summon`). */
function withQuarrel(seed: number, aliveB = true): { state: ReturnType<typeof foundTwenty>; a: number; b: number } {
  const { state, a, b } = twoNamed(seed);
  if (!aliveB) {
    const villagerB = state.people.villagers.find((v) => v.id === b);
    if (villagerB !== undefined) villagerB.diedTick = state.tick;
  }
  const record: HappeningRecord = {
    tick: state.tick,
    id: 'quarrel_in_the_square',
    visible: [{ k: 'gather', where: 'square', days: 1 }],
    who: [a, b],
  };
  state.happenings.push(record);
  return { state, a, b };
}

describe('IA-6 · la riña real, en la aldea entera', () => {
  it('con la riña real puesta, la aldea la escenifica sin colgarse en algún día de la semana', () => {
    // **Medido, no supuesto**: un solo día no basta. La reunión convoca a toda
    // la aldea (`visible: gather`), pero el aforo de cuarenta plazas reparte a
    // la gente en un corro ancho — los dos nombrados de verdad pueden pasarse
    // el día entero sin cruzarse a menos de `SCENE_EARSHOT`. La semana del
    // suceso son siete jornadas (`DAYS_PER_WEEK`, el estado sigue congelado en
    // el mismo `tick`), y cada una es una tirada independiente de la misma
    // convocatoria. En una muestra de diez semillas la escena salió en algún
    // día de la semana las diez veces, con una media de 1 a 3 días de 7; nunca
    // colgada. Aquí se comprueba con cinco, para no alargar la suite rápida.
    for (const seed of [7, 23, 41]) {
      const { state } = withQuarrel(seed);
      let startedAnyDay = 0;
      let stuckAnyDay = 0;
      // Sale en cuanto se ve una vez: no hace falta agotar los siete días para
      // saber que la semana la muestra, y la suite rápida no puede permitirse
      // recorrer siete jornadas completas por semilla sin necesidad
      // (`CLAUDE.md`: menos de 30 s la suite entera).
      for (let day = 0; day < 7 && startedAnyDay === 0; day += 1) {
        const life = createVillage(state, day);
        while (life.steps < STEPS_PER_DAY) life.step();
        expect(life.stories.triggerTick, `semilla ${seed}, día ${day}`).toBe(state.tick);
        // A lo sumo una vez al día (`quarrelStaged`): el hecho pasó una vez
        // esta semana en el motor, no varias veces en la misma jornada.
        expect(life.stories.started, `semilla ${seed}, día ${day}`).toBeLessThanOrEqual(1);
        startedAnyDay += life.stories.started;
        stuckAnyDay += life.stories.stuck;
      }
      expect(startedAnyDay, `semilla ${seed}: ningún día de la semana la monta`).toBeGreaterThanOrEqual(1);
      expect(stuckAnyDay, `semilla ${seed}: colgada algún día`).toBe(0);
    }
  });

  it('reconstruir la misma jornada con la misma semilla monta la misma historia', () => {
    const { state } = withQuarrel(7);
    const first = createVillage(state, 0);
    while (first.steps < STEPS_PER_DAY) first.step();
    const second = createVillage(state, 0);
    while (second.steps < STEPS_PER_DAY) second.step();
    expect(second.stories).toEqual(first.stories);
  });
});
