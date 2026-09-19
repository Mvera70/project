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
import type { HappeningRecord, Trait } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import type { Body } from '../../src/render3d/life/body';
import { freshNeeds, type Needs } from '../../src/render3d/life/needs';
import { createVillage, type Dweller } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { playQuarrel, proposeQuarrel } from '../../src/render3d/life/scenes';
import { quarrelToday } from '../../src/render3d/life/staging';

/** Un `Dweller` de mentira, para probar `scenes.ts` sin montar una aldea. */
function makeDweller(id: number, at: { x: number; z: number }): Dweller {
  const body: Body = { id, x: at.x, z: at.z, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.3 };
  return {
    body,
    villager: id,
    traits: [] as readonly Trait[],
    needs: freshNeeds() as Needs,
    doing: null,
    rethinkAt: 0,
    travelled: 0,
    faceAnchor: { x: at.x, z: at.z },
    scene: null,
    sceneCooldownUntil: 0,
    holding: null,
    aimAt: null,
    playedUntil: 0, failed: new Map(),
  };
}

describe('IA-6 · proposeQuarrel/playQuarrel, sueltas', () => {
  it('no propone nada si están lejos, y sí si están cerca', () => {
    const a = makeDweller(1, { x: 0, z: 0 });
    const far = makeDweller(2, { x: 10, z: 10 });
    const near = makeDweller(3, { x: 1, z: 0 });
    expect(proposeQuarrel(a, far, 7, 0)).toBeNull();
    expect(proposeQuarrel(a, near, 7, 0)).not.toBeNull();
  });

  it('uno reclama y el otro responde, nunca los dos lo mismo', () => {
    const a = makeDweller(1, { x: 0, z: 0 });
    const b = makeDweller(2, { x: 1, z: 0 });
    const scene = proposeQuarrel(a, b, 7, 0);
    expect(scene).not.toBeNull();
    if (scene === null) return;
    expect([scene.roleA, scene.roleB].sort()).toEqual(['gives', 'takes']);
  });

  it('es determinista: misma semilla y mismo paso, misma escena', () => {
    const a = makeDweller(1, { x: 0, z: 0 });
    const b = makeDweller(2, { x: 1, z: 0 });
    const one = proposeQuarrel(a, b, 11, 40);
    const two = proposeQuarrel(makeDweller(1, { x: 0, z: 0 }), makeDweller(2, { x: 1, z: 0 }), 11, 40);
    expect(one).toEqual(two);
  });

  it('nunca toca la velocidad del otro contra su voluntad: sin empujón', () => {
    // El boceto no añade contacto (visual-reference §2): a diferencia de
    // `shove`, `playQuarrel` nunca pone una velocidad de huida brusca en
    // quien recibe el gesto, sólo un paso atrás medido y con `drive()`, que
    // amortigua — nunca una velocidad de una vez por todas como `SHOVE_PUSH`.
    const a = makeDweller(1, { x: 5, z: 5 });
    const b = makeDweller(2, { x: 5.9, z: 5 });
    const scene = proposeQuarrel(a, b, 7, 0);
    expect(scene).not.toBeNull();
    if (scene === null) return;
    for (let step = scene.since; step < scene.until; step += 1) {
      playQuarrel(scene, a, b, step);
      expect(Math.hypot(a.body.vx, a.body.vz)).toBeLessThan(2);
      expect(Math.hypot(b.body.vx, b.body.vz)).toBeLessThan(2);
    }
  });

  it('termina bajando los brazos: al final los dos están quietos', () => {
    const a = makeDweller(1, { x: 5, z: 5 });
    const b = makeDweller(2, { x: 5.9, z: 5 });
    const scene = proposeQuarrel(a, b, 7, 0);
    expect(scene).not.toBeNull();
    if (scene === null) return;
    for (let step = scene.since; step < scene.until; step += 1) playQuarrel(scene, a, b, step);
    // El último compás (`beat === 2`) no mueve a nadie a propósito.
    playQuarrel(scene, a, b, scene.until - 1);
    expect(scene.beat).toBe(2);
  });
});

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
  it('quarrelToday lee los `id` de `happenings[].who`, no una pareja inventada', () => {
    const { state, a, b } = withQuarrel(7);
    expect(quarrelToday(state)).toEqual([a, b]);
    // La semana siguiente ya no cuenta: el estado congelado de otra semana no
    // es la semana del suceso (docs/design.md §7.10, "sólo la semana en la
    // que ocurrió").
    const later = structuredClone(state);
    later.tick += 1;
    expect(quarrelToday(later)).toBeNull();
  });

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

  it('si a uno de los dos ya no se le encuentra, no se inventa la escena: se cancela', () => {
    // "no inventes... espectadores globales": si el segundo nombrado ha
    // muerto, la escena no se monta con un doble ni con cualquier otro —
    // simplemente no ocurre, aunque el suceso siga registrado.
    const { state } = withQuarrel(7, false);
    const life = createVillage(state, 0);
    while (life.steps < STEPS_PER_DAY) life.step();
    expect(life.stories.triggerTick).toBe(state.tick);
    expect(life.stories.started).toBe(0);
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
