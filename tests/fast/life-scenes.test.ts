// V-07 · Escenas de dos. Anexo E.
//
// **El corazón del encargo.** Con esto puesto, el tránsito tiene que leerse
// como vida y no como hormigas (E.6): dos que se cruzan a veces hablan, a
// veces se encaran, y algunas aldeas se llevan mejor que otras.
//
// La mitad de las pruebas atacan `scenes.ts` directamente —`propose`, `play`,
// `alive`, son funciones puras y deterministas, y probarlas sueltas es más
// preciso que esperar a que la suerte de una jornada entera las active— y la
// otra mitad miran la aldea completa, que es donde se ve si el reparto
// hablar/empujar y el volumen de escenas por jornada tienen sentido.

import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import type { GameState, Trait } from '@engine/state';
import { gap, integrate, type Body } from '../../src/render3d/life/body';
import { freshNeeds, type Needs } from '../../src/render3d/life/needs';
import { alive, play, propose, type Scene } from '../../src/render3d/life/scenes';
import { createVillage, type Dweller } from '../../src/render3d/life/village';
import { castOf } from '../../src/render3d/life/cast';
import { LIFE_STEP, STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { VILLAGER_CLIPS } from '../../src/render3d/actors/clips';

const grown = new Map<number, GameState>();
function village(seed: number): GameState {
  let base = grown.get(seed);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, 40 * 48, 'prudent', CATALOG);
    grown.set(seed, base);
  }
  return base;
}

/** Un `Dweller` de mentira, para probar `scenes.ts` sin montar una aldea. */
function makeDweller(
  id: number, at: { x: number; z: number }, traits: readonly Trait[] = [],
  needs: Partial<Needs> = {},
): Dweller {
  const body: Body = { id, x: at.x, z: at.z, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.3 };
  return {
    body,
    villager: id,
    traits,
    needs: { ...freshNeeds(), ...needs },
    doing: null,
    rethinkAt: 0,
    travelled: 0,
    scene: null,
    sceneCooldownUntil: 0,
  };
}

/** Corre `propose` muchas veces con parejas distintas y cuenta lo que sale. */
function sample(
  count: number, build: (n: number) => [Dweller, Dweller, number],
): { chat: number; reject: number; shove: number; brawl: number; none: number } {
  const tally = { chat: 0, reject: 0, shove: 0, brawl: 0, none: 0 };
  for (let n = 0; n < count; n += 1) {
    const [a, b, opinion] = build(n);
    const scene = propose(a, b, opinion, 7, n);
    if (scene === null) tally.none += 1;
    else if (scene.kind === 'chat') tally[scene.roleA === 'peer' ? 'chat' : 'reject'] += 1;
    else tally[scene.kind] += 1;
  }
  return tally;
}

describe('V-07 · escenas de dos', () => {
  it('el andar de castOf no patina: el suelo recorrido crece a la vez que el clip', () => {
    // E.6 pedía comprobar esto lo primero: si `castOf` alimentaba mal el clip
    // de andar, o si «no se desplazan como en la demo» era sólo percepción.
    // Medido sobre una jornada entera de ochenta personas: 3 290 tramos de
    // camino comprobados, y el mayor desajuste entre lo que el clip debería
    // haber avanzado y lo que avanzó de verdad es del orden de 1e-14 segundos
    // — error de coma flotante, no un fallo. `castOf` está bien: si en pantalla
    // se ve distinto, no es esto.
    const life = createVillage(village(7), 0);
    const stride = VILLAGER_CLIPS.walk.strideLength ?? 1;
    const cycle = VILLAGER_CLIPS.walk.seconds;
    let checked = 0;
    let last: { id: number; travelled: number; clipSeconds: number } | null = null;

    for (let step = 0; step <= 1200; step += 1) {
      life.step();
      const actors = castOf(life, step * LIFE_STEP, new Map(), new Set());
      const actor = actors.find((candidate) => candidate.clip === 'walk');
      if (actor === undefined) { last = null; continue; }
      if (last !== null && last.id === actor.id) {
        const ground = actor.travelled - last.travelled;
        const advanced = (actor.clipSeconds - last.clipSeconds + cycle) % cycle;
        const expected = (ground / stride) * cycle;
        if (ground > 0.0005 && expected < cycle * 0.5) {
          expect(advanced, `avanzó ${ground.toFixed(4)} celdas`).toBeCloseTo(expected, 6);
          checked += 1;
        }
      }
      last = { id: actor.id, travelled: actor.travelled, clipSeconds: actor.clipSeconds };
    }
    expect(checked, 'no se llegó a comprobar ningún tramo andando').toBeGreaterThan(20);
  });

  it('dos que se detestan rechazan más que dos que se aprecian', () => {
    // Carácter e impulsos iguales en las dos tiradas — sólo cambia `opinion`.
    // Si la opinión no pesara nada, las dos bandas saldrían iguales salvo
    // ruido; con la opinión puesta, salen claramente distintas.
    const build = (opinion: number) => (n: number): [Dweller, Dweller, number] => [
      makeDweller(n * 2, { x: 10, z: 10 }, [], { company: 0.3 }),
      makeDweller(n * 2 + 1, { x: 10.3, z: 10 }, [], { company: 0.3 }),
      opinion,
    ];
    const disliked = sample(2000, build(-90));
    const liked = sample(2000, build(90));

    const rejectRate = (t: ReturnType<typeof sample>) => t.reject / Math.max(1, t.chat + t.reject);
    expect(rejectRate(disliked), `se detestan: ${JSON.stringify(disliked)}`)
      .toBeGreaterThan(rejectRate(liked));
    expect(liked.chat, `se aprecian: ${JSON.stringify(liked)}`).toBeGreaterThan(disliked.chat);
  });

  it('un rechazo también es una escena, y no una charla', () => {
    // Regla de V-07: apartar la vista y seguir deja rastro. El papel de quien
    // rechaza no es `peer` — eso es lo que separa un rechazo de una charla de
    // verdad, y lo que usa `cast.ts` para no ponerle la nube de diálogo.
    const tally = sample(600, (n) => [
      makeDweller(n * 2, { x: 10, z: 10 }, [], { company: 0.1 }),
      makeDweller(n * 2 + 1, { x: 10.3, z: 10 }, [], { company: 0.1 }),
      0,
    ]);
    expect(tally.reject, JSON.stringify(tally)).toBeGreaterThan(0);
    expect(tally.chat, JSON.stringify(tally)).toBeGreaterThan(0);
  });

  it('nadie salta a empujar sin genio para ello, y quien lo tiene de sobra sí', () => {
    // La decisión de encuentro es de umbral, no proporcional (E.7, E.8): por
    // debajo de `HOT_ENOUGH` nadie empuja nunca, y por encima del todo, casi
    // siempre. Esto es lo que hace que una aldea tranquila y una pendenciera
    // se puedan distinguir con la misma función, sin más que quién vive en
    // ellas — la prueba de la aldea entera está más abajo; ésta aísla la causa.
    const calm = sample(1500, (n) => [
      makeDweller(n * 2, { x: 10, z: 10 }, [], { irritation: 0.3 }),
      makeDweller(n * 2 + 1, { x: 10.3, z: 10 }, [], { irritation: 0.3 }),
      0,
    ]);
    expect(calm.shove + calm.brawl, `${JSON.stringify(calm)}`).toBe(0);

    const hot = sample(1500, (n) => [
      makeDweller(n * 2, { x: 10, z: 10 }, [], { irritation: 0.95 }),
      makeDweller(n * 2 + 1, { x: 10.3, z: 10 }, [], { irritation: 0.4 }),
      0,
    ]);
    expect(hot.shove + hot.brawl, `${JSON.stringify(hot)}`).toBeGreaterThan(30);
  });

  it('una escena rota a medias deja al otro libre y en pie', () => {
    // «Uno muere o se va»: dentro de la jornada congelada (E.2) nadie hace
    // ninguna de las dos cosas de verdad, así que esto se comprueba tal como
    // `village.ts` lo comprobaría — quitando a uno de la lista que `alive`
    // recorre — y no fingiendo una muerte que el modelo no tiene.
    const a = makeDweller(0, { x: 10, z: 10 }, [], { irritation: 0.95 });
    const b = makeDweller(1, { x: 10.3, z: 10 }, [], { irritation: 0.4 });
    const scene = propose(a, b, 0, 7, 0);
    expect(scene, 'con este genio tendría que saltar algo').not.toBeNull();
    const live = scene as Scene;

    a.scene = live; b.scene = live;
    play(live, a, b, live.since);
    expect(alive(live, [a, b]), 'los dos siguen: la escena sigue en pie').toBe(true);

    // `b` se va de la aldea a medio encuentro.
    expect(alive(live, [a]), 'sin `b`, la escena no puede seguir en pie').toBe(false);
    // Y `a`, que se queda, no arrastra ningún estado que le impida vivir:
    // `village.ts` lo suelta (`dweller.scene = null`) en cuanto ve esto.
    expect(Number.isFinite(a.body.x) && Number.isFinite(a.body.z), 'a sigue en pie').toBe(true);
  });

  it('nadie queda atrapado en una escena que no termina', () => {
    // Toda escena tiene un `until` finito desde que nace, y ninguna fase de
    // `play` lo alarga: se comprueba viviendo unas cuantas de principio a fin.
    for (const [ia, ib, needs] of [
      [0, 1, { irritation: 0.95 }],
      [2, 3, { company: 0.9 }],
    ] as const) {
      const a = makeDweller(ia, { x: 10, z: 10 }, [], needs);
      const b = makeDweller(ib, { x: 10.3, z: 10 }, [], { irritation: 0.4, company: 0.9 });
      const scene = propose(a, b, 0, 7, 0);
      expect(scene).not.toBeNull();
      const live = scene as Scene;
      // Ninguna escena de esta capa dura más que una charla larga con una
      // pelea devuelta detrás: cota generosa y no un número ajustado a ojo.
      expect(live.until - live.since, JSON.stringify(live)).toBeLessThan(400);

      let step = live.since;
      while (step < live.until) { play(live, a, b, step); step += 1; }
      // Tras el último paso que le tocaba, `village.ts` la cierra: se
      // comprueba que en ese instante ya no hay ninguna razón para seguir.
      expect(step).toBe(live.until);
    }
  });

  it('el paso máximo de un cuerpo no pasa de 0,12 celdas, ni en el empujón', () => {
    // El defecto que ha perseguido al proyecto entero, medido en el sitio
    // exacto donde `play` mete velocidad de golpe: el paso siguiente al
    // instante en que se suelta el empujón, con `SHOVE_PUSH` entero.
    const a = makeDweller(0, { x: 10, z: 10 }, [], { irritation: 0.95 });
    const b = makeDweller(1, { x: 10.3, z: 10 }, [], { irritation: 0.9 });
    const scene = propose(a, b, 0, 7, 0);
    expect(scene, 'con este genio, los dos, tendría que ser una brawl').not.toBeNull();
    const live = scene as Scene;

    const land = { width: 24, height: 24, blocked: new Uint8Array(24 * 24) };
    let biggest = 0;
    let was = [{ x: a.body.x, z: a.body.z }, { x: b.body.x, z: b.body.z }];
    for (let step = live.since; step < live.until; step += 1) {
      play(live, a, b, step);
      // `village.ts` es quien integra: aquí se hace lo mismo, con el mismo
      // `integrate` de `body.ts`, para que la prueba mida lo que de verdad va
      // a pantalla y no una aproximación.
      integrate(a.body, land, LIFE_STEP);
      integrate(b.body, land, LIFE_STEP);
      const now = [{ x: a.body.x, z: a.body.z }, { x: b.body.x, z: b.body.z }];
      biggest = Math.max(biggest, gap(now[0]!, was[0]!), gap(now[1]!, was[1]!));
      was = now;
    }
    expect(biggest, `el paso más largo es ${biggest.toFixed(3)} celdas`).toBeLessThan(0.12);
  });

  it('hay aldeas casi de paz y aldeas de bronca, según quién vive en ellas', () => {
    // spike medía esto con ocho cuerpos y salían aldeas de cero empujones y
    // aldeas de siete u ocho. Con la aldea real —cuarenta a ochenta personas,
    // y el genio es un impulso que sube solo (E.4)— casi siempre hay alguien
    // que llega a `HOT_ENOUGH` en algún momento del día: medido en treinta y
    // ocho aldeas de más de quince personas, ninguna se queda exactamente en
    // cero. Es la demografía, no el modelo: con ocho personas es fácil que
    // ninguna tenga mal genio de verdad, con ochenta casi nunca. La prueba de
    // arriba («nadie salta... quien lo tiene de sobra sí») aísla la causa con
    // carácter controlado; ésta comprueba lo que de verdad se puede pedir a
    // aldeas reales: que varíen mucho, no que alguna llegue a cero.
    const counts: number[] = [];
    for (const seed of [36, 13, 25, 33, 24, 38]) {
      const life = createVillage(village(seed), 0);
      if (life.dwellers.length < 15) continue;
      const seen = new Set<Scene>();
      let fights = 0;
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        for (const dweller of life.dwellers) {
          if (dweller.scene !== null && !seen.has(dweller.scene) && dweller.scene.kind !== 'chat') {
            seen.add(dweller.scene);
            fights += 1;
          }
        }
      }
      counts.push(fights);
    }
    expect(counts.length, 'no hubo bastantes aldeas que mirar').toBeGreaterThanOrEqual(4);
    const calmest = Math.min(...counts);
    const rowdiest = Math.max(...counts);
    expect(rowdiest, `de ${calmest} a ${rowdiest} empujones/peleas según la aldea`)
      .toBeGreaterThan(calmest * 2);
  });

  it('las escenas por jornada caen en una banda razonable, en seis semillas', () => {
    // Ni cero —la aldea muerta— ni guirigay: medido, entre uno y cuatro
    // encuentros por persona y jornada según quién vive en la aldea.
    for (const seed of [7, 11, 23, 31, 40, 12]) {
      const state = village(seed);
      const life = createVillage(state, 0);
      const people = life.dwellers.length;
      if (people < 10) continue; // una aldea casi vacía no dice nada de esto.

      const seen = new Set<Scene>();
      let total = 0;
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        for (const dweller of life.dwellers) {
          if (dweller.scene !== null && !seen.has(dweller.scene)) {
            seen.add(dweller.scene);
            total += 1;
          }
        }
      }
      expect(total, `semilla ${seed}: ${total} escenas para ${people} personas`)
        .toBeGreaterThan(people * 0.3);
      expect(total, `semilla ${seed}: ${total} escenas para ${people} personas`)
        .toBeLessThan(people * 8);
    }
  });

  it('hablar sigue siendo lo corriente, y no pegar', () => {
    // Medido: cientos de charlas por docenas de empujones, en todas las
    // semillas comprobadas — nunca al revés.
    for (const seed of [7, 11, 23]) {
      const state = village(seed);
      const life = createVillage(state, 0);
      if (life.dwellers.length < 10) continue;

      const seen = new Set<Scene>();
      let chat = 0;
      let fight = 0;
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        for (const dweller of life.dwellers) {
          if (dweller.scene !== null && !seen.has(dweller.scene)) {
            seen.add(dweller.scene);
            if (dweller.scene.kind === 'chat') chat += 1;
            else fight += 1;
          }
        }
      }
      expect(chat, `semilla ${seed}: ${chat} charlas contra ${fight} peleas`)
        .toBeGreaterThan(fight);
    }
  });
});
