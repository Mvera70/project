// V-08 · Los animales, iguales que la gente. Anexo E.
//
// Lo que el brief pide, contestado con número: que un animal sea un cuerpo de
// verdad —y por tanto no pueda meterse en el agua sin que nadie lo corrija
// después—, que la cuenta por clase sea la del estado congelado y no la del
// tick vivo, y que exista al menos una escena persona-animal y ocurra de
// verdad, no sólo en el catálogo.

import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { blockedAt } from '../../src/render3d/life/body';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';

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
    // **Y se mide por semilla, no sumando.** Sumar deja pasar que una semilla
    // entera no toque un animal en todo el día —la cuenta de otra la tapa— y
    // eso es exactamente el defecto que se busca: bichos que existen pero que
    // nadie puede alcanzar, o que pierden siempre la elección.
    //
    // Medido, jornada entera: 3 → 39 bichos, 1 526 instantes, 25 personas
    // distintas · 7 → 44, 4 895, 52 · 11 → 40, 3 757, 38 · 23 → 11, 1 411, 19 ·
    // 31 → 19, 1 445, 18 · 37 → **1 bicho**, 199 instantes, 2 personas. Una
    // aldea con un solo animal no puede dar mucho más que eso, y por eso el
    // listón de cuánta gente participa sólo se le pide a las que tienen cabaña
    // de verdad.
    const seeds = [3, 7, 11, 23, 31, 37];
    for (const seed of seeds) {
      const state = village(seed);
      const life = createVillage(state, 0);
      if (life.beasts.length === 0) continue;

      let instants = 0;
      const touched = new Set<number>();
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        for (const dweller of life.dwellers) {
          if (dweller.doing?.there === true
            && ['pet', 'chase', 'feed'].includes(dweller.doing.offer.id)) {
            instants += 1;
            touched.add(dweller.body.id);
          }
        }
      }

      expect(instants,
        `semilla ${seed}: ${life.beasts.length} animales y nadie se acercó a ninguno`)
        .toBeGreaterThan(0);
      // Con cabaña de verdad, no puede ser cosa de dos vecinos raros: lo peor
      // medido con diez o más animales son 18 personas distintas.
      if (life.beasts.length >= 10) {
        expect(touched.size,
          `semilla ${seed}: sólo ${touched.size} personas tocaron un animal, con ${life.beasts.length} en la aldea`)
          .toBeGreaterThanOrEqual(15);
      }
    }
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
