// V-08 · Los animales, iguales que la gente. Anexo E.
//
// Lo que el brief pide, contestado con número: que un animal sea un cuerpo de
// verdad —y por tanto no pueda meterse en el agua sin que nadie lo corrija
// después—, que la cuenta por clase sea la del estado congelado y no la del
// tick vivo, y que exista al menos una escena persona-animal y ocurra de
// verdad, no sólo en el catálogo.

import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { blockedAt } from '../../src/render3d/life/body';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';

// `foundGame` (la pareja) se rompe a menudo desde el equilibrado de la
// densidad de sucesos (v3.78, `rework.md` §2.8 punto 4): tres de doce
// semillas llegan extinguidas o abandonadas a los cuarenta años, y esta
// familia de pruebas mide un mecanismo (la cabaña, el terreno), no la
// fundación. Sigue la convención de `CLAUDE.md`: lo que mide una aldea hecha
// se funda con `foundTwenty`.
const grown = new Map<number, GameState>();
function village(seed: number): GameState {
  let base = grown.get(seed);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, 40 * 48, 'prudent', CATALOG);
    grown.set(seed, base);
  }
  return base;
}

describe('V-08 · los animales, iguales que la gente', () => {
  it('la cuenta por clase sale de la cabaña del estado, no del tick vivo', () => {
    for (const seed of [3, 7, 11, 23]) {
      const state = village(seed);
      const life = createVillage(state, 0);
      expect(life.beasts.length, `semilla ${seed}: no hay cabaña`).toBeGreaterThan(0);

      const byKind = { hen: 0, pig: 0, cow: 0 };
      for (const beast of life.beasts) byKind[beast.kind] += 1;

      expect(byKind.hen, `semilla ${seed}: gallinas`).toBe(state.herd.hens);
      expect(byKind.pig, `semilla ${seed}: cerdos`).toBe(state.herd.pigs);
      expect(byKind.cow, `semilla ${seed}: vacas`).toBe(state.herd.cows);

      // Y sigue siendo así tras vivir la jornada entera: nada de lo que el
      // motor decida esta semana entra hasta mañana (D.6.7).
      for (let n = 0; n < 300; n += 1) life.step();
      const after = { hen: 0, pig: 0, cow: 0 };
      for (const beast of life.beasts) after[beast.kind] += 1;
      expect(after).toEqual(byKind);
    }
  });

  it('ningún animal de tierra pisa el agua en una jornada, seis semillas', () => {
    for (const seed of [1, 3, 7, 11, 17, 23]) {
      const state = village(seed);
      const life = createVillage(state, 0);
      const { width, terrain } = state.map;
      const wet = (x: number, z: number): boolean =>
        terrain[Math.floor(z) * width + Math.floor(x)] === TERRAIN_CODE.water;

      let checked = 0;
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        if (n % 20 !== 0) continue;
        for (const beast of life.beasts) {
          const { x, z } = beast.dweller.body;
          expect(wet(x, z), `semilla ${seed}: ${beast.kind} en el agua en el paso ${n}`).toBe(false);
          // Y por la misma razón nunca dentro de un muro ni fuera del mapa:
          // el mismo `Terrain.blocked` que usa la gente.
          expect(blockedAt(life.land, x, z), `semilla ${seed}: ${beast.kind} en un bloqueo`).toBe(false);
          checked += 1;
        }
      }
      expect(checked, `semilla ${seed}: no se comprobó ningún animal`).toBeGreaterThan(0);
    }
  });

  it('existe al menos una escena persona-animal, y ocurre de verdad', () => {
    // «Escena» aquí es lo que dice el brief de V-08, no `scenes.ts` (V-07):
    // un animal es una `Place` móvil que ofrece `pet`/`chase`/`feed`, y una
    // persona la elige exactamente igual que elegiría el pozo o el banco. Se
    // mide que eso pase, no que el catálogo lo permita.
    //
    // **La medida de arriba (una jornada, por semilla) es de antes de la
    // consolidación de IA-4**, que condicionó la reacción del animal a que la
    // persona esté de verdad consumiendo `feed`/`pet`/`chase` — antes bastaba
    // estar cerca y quieto, y el cerdo pasaba el 38 % de la jornada congelado
    // por gente que rezaba a un metro. Medido después de ese cambio: las
    // interacciones bajan de 402 a 6 en dos jornadas (`life-rounds/IA-4.md`).
    // Es realista y queda pendiente de nivelado, pero exigir «una jornada, una
    // semilla, siempre» convierte la ausencia en la norma: dos de las seis
    // semillas canónicas se quedan en cero incluso mirando **cinco** jornadas
    // seguidas (medido al cerrar C-1, 16 sep 2026):
    //
    //   semilla │ animales │ instantes en 5 jornadas │ personas
    //        3  │    5     │           173           │    3
    //        7  │   32     │         1 555           │   15
    //       11  │   29     │             0           │    0
    //       23  │    5     │           266           │    5
    //       31  │    1     │             0            │    0
    //       37  │    0     │             —            │    —
    //
    // El brief pide que **exista**, no que cada aldea la tenga — es la vía que
    // el encargo de C-1 deja escrita: «que exista alguna en vez de una por
    // semilla». Así que se mide sobre el conjunto de las seis semillas
    // canónicas y cinco jornadas cada una, no semilla a semilla ni jornada a
    // jornada.
    const seeds = [3, 7, 11, 23, 31, 37];
    const DAYS = 5;
    let totalInstants = 0;
    const touched = new Set<string>();
    let herds = 0;
    for (const seed of seeds) {
      const state = village(seed);
      for (let day = 0; day < DAYS; day += 1) {
        const life = createVillage(state, day);
        if (life.beasts.length === 0) continue;
        herds += 1;
        for (let n = 0; n < STEPS_PER_DAY; n += 1) {
          life.step();
          for (const dweller of life.dwellers) {
            if (dweller.doing?.there === true
              && ['pet', 'chase', 'feed'].includes(dweller.doing.offer.id)) {
              totalInstants += 1;
              touched.add(`${seed}:${dweller.body.id}`);
            }
          }
        }
      }
    }

    expect(herds, 'ninguna de las seis semillas tuvo cabaña en ningún día').toBeGreaterThan(0);
    expect(totalInstants,
      `${totalInstants} instantes de contacto persona-animal en 6 semillas × ${DAYS} jornadas`)
      .toBeGreaterThan(0);
    // El umbral se pone bajo lo peor medido (23 personas distintas sumando las
    // seis semillas), con margen: sigue exigiendo que no sea cosa de un único
    // vecino raro, sin fijar la cifra exacta de una medida que ya sabemos que
    // se mueve con la trayectoria de cada valle.
    expect(touched.size, `${touched.size} personas distintas tocaron un animal en total`)
      .toBeGreaterThanOrEqual(10);
  });

  it('un animal se coloca junto a su casa o su campo, no en mitad de la nada', () => {
    // El ancla sale de `doorOf`: un punto pisable pegado a un edificio real.
    // Si esto fallara, la cabaña aparecería flotando sobre un campo cualquiera
    // o amontonada en el corazón del pueblo.
    const state = village(7);
    const life = createVillage(state, 0);
    for (const beast of life.beasts) {
      expect(blockedAt(life.land, beast.anchor.x, beast.anchor.z),
        `${beast.kind}: ancla en un bloqueo`).toBe(false);
    }
  });

  it('la misma jornada da la misma cabaña, cuerpo a cuerpo', () => {
    // §4.3, igual que V-06 para las personas: sin esto no se puede reconstruir
    // la jornada tras un letargo sin que la cabaña cambie de sitio.
    const state = village(7);
    const one = createVillage(state, 3);
    const two = createVillage(state, 3);
    for (let n = 0; n < 900; n += 1) { one.step(); two.step(); }
    one.beasts.forEach((beast, i) => {
      const other = two.beasts[i];
      expect(other).toBeDefined();
      expect(beast.dweller.body.x).toBe(other?.dweller.body.x);
      expect(beast.dweller.body.z).toBe(other?.dweller.body.z);
    });
  });

  it('la cabaña colisiona con la gente: nadie acaba en el mismo punto', () => {
    const state = village(7);
    const life = createVillage(state, 0);
    if (life.beasts.length === 0) return;
    for (let n = 0; n < 600; n += 1) life.step();
    for (const beast of life.beasts) {
      for (const dweller of life.dwellers) {
        const apart = Math.hypot(
          beast.dweller.body.x - dweller.body.x, beast.dweller.body.z - dweller.body.z,
        );
        const touching = beast.dweller.body.radius + dweller.body.radius;
        expect(apart, 'un animal y una persona en el mismo punto').toBeGreaterThanOrEqual(touching - 0.1);
      }
    }
  });
});
